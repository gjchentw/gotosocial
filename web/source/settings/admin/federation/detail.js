/*
	GoToSocial
	Copyright (C) GoToSocial Authors admin@gotosocial.org
	SPDX-License-Identifier: AGPL-3.0-or-later

	This program is free software: you can redistribute it and/or modify
	it under the terms of the GNU Affero General Public License as published by
	the Free Software Foundation, either version 3 of the License, or
	(at your option) any later version.

	This program is distributed in the hope that it will be useful,
	but WITHOUT ANY WARRANTY; without even the implied warranty of
	MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
	GNU Affero General Public License for more details.

	You should have received a copy of the GNU Affero General Public License
	along with this program.  If not, see <http://www.gnu.org/licenses/>.
*/

const React = require("react");
const { useRoute, Redirect, useLocation } = require("wouter");

const query = require("../../lib/query");

const { useTextInput, useBoolInput } = require("../../lib/form");

const useFormSubmit = require("../../lib/form/submit");

const { TextInput, Checkbox, TextArea } = require("../../components/form/inputs");

const Loading = require("../../components/loading");
const BackButton = require("../../components/back-button");
const MutationButton = require("../../components/form/mutation-button");

module.exports = function InstanceDetail({ baseUrl }) {
	const { data: blockedInstances = {}, isLoading } = query.useInstanceBlocksQuery();

	let [_match, { domain }] = useRoute(`${baseUrl}/:domain`);
	if (domain == "view") {
		// Retrieve domain from form field submission.
		domain = (new URL(document.location)).searchParams.get("domain");
	}

	// Normalize / decode domain (it may be URL-encoded).
	domain = decodeURIComponent(domain);

	const existingBlock = React.useMemo(() => {
		return blockedInstances[domain];
	}, [blockedInstances, domain]);

	if (domain == undefined) {
		return <Redirect to={baseUrl} />;
	}

	let infoContent = null;

	if (isLoading) {
		infoContent = <Loading />;
	} else if (existingBlock == undefined) {
		infoContent = <span>No stored block yet, you can add one below:</span>;
	} else {
		infoContent = (
			<div className="info">
				<i className="fa fa-fw fa-exclamation-triangle" aria-hidden="true"></i>
				<b>Editing domain blocks isn't implemented yet, <a href="https://github.com/superseriousbusiness/gotosocial/issues/1198" target="_blank" rel="noopener noreferrer">check here for progress</a></b>
			</div>
		);
	}

	return (
		<div>
			<h1 className="text-cutoff"><BackButton to={baseUrl} /> Federation settings for: <span title={domain}>{domain}</span></h1>
			{infoContent}
			<DomainBlockForm defaultDomain={domain} block={existingBlock} baseUrl={baseUrl} />
		</div>
	);
};

function DomainBlockForm({ defaultDomain, block = {}, baseUrl }) {
	const isExistingBlock = block.domain != undefined;

	const disabledForm = isExistingBlock
		? {
			disabled: true,
			title: "Domain suspensions currently cannot be edited."
		}
		: {};

	const form = {
		domain: useTextInput("domain", { source: block, defaultValue: defaultDomain }),
		obfuscate: useBoolInput("obfuscate", { source: block }),
		commentPrivate: useTextInput("private_comment", { source: block }),
		commentPublic: useTextInput("public_comment", { source: block })
	};

	const [submitForm, addResult] = useFormSubmit(form, query.useAddInstanceBlockMutation(), { changedOnly: false });

	const [removeBlock, removeResult] = query.useRemoveInstanceBlockMutation({ fixedCacheKey: block.id });

	const [location, setLocation] = useLocation();

	function verifyUrlThenSubmit(e) {
		// Adding a new block happens on /settings/admin/federation/domain.com
		// but if domain input changes, that doesn't match anymore and causes issues later on
		// so, before submitting the form, silently change url, then submit
		let correctUrl = `${baseUrl}/${form.domain.value}`;
		if (location != correctUrl) {
			setLocation(correctUrl);
		}
		return submitForm(e);
	}

	return (
		<form onSubmit={verifyUrlThenSubmit}>
			<TextInput
				field={form.domain}
				label="Domain"
				placeholder="example.com"
				{...disabledForm}
			/>

			<Checkbox
				field={form.obfuscate}
				label="Obfuscate domain in public lists"
				{...disabledForm}
			/>

			<TextArea
				field={form.commentPrivate}
				label="Private comment"
				rows={3}
				{...disabledForm}
			/>

			<TextArea
				field={form.commentPublic}
				label="Public comment"
				rows={3}
				{...disabledForm}
			/>

			<div className="action-buttons row">
				<MutationButton
					label="Suspend"
					result={addResult}
					showError={false}
					{...disabledForm}
				/>

				{
					isExistingBlock &&
					<MutationButton
						type="button"
						onClick={() => removeBlock(block.id)}
						label="Remove"
						result={removeResult}
						className="button danger"
						showError={false}
					/>
				}
			</div>

			{addResult.error && <Error error={addResult.error} />}
			{removeResult.error && <Error error={removeResult.error} />}

		</form>
	);
}