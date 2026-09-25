import Link from '@docusaurus/Link';
import useDocusaurusContext from '@docusaurus/useDocusaurusContext';
import React from 'react';

type Group = {
	dir: string;
	id: string;
	label: string;
	stability: string;
};

export default function GroupTable() {
	const {siteConfig} = useDocusaurusContext();

	const groups = (siteConfig.customFields?.groups ?? []) as Group[];

	return (
		<table>
			<thead>
				<tr>
					<th>Group</th>
					<th>Stability</th>
				</tr>
			</thead>
			<tbody>
				{groups.map((group) => (
					<tr key={group.id}>
						<td>
							<Link to={`/${group.dir}/overview`}>
								{group.label}
							</Link>
						</td>
						<td>{group.stability}</td>
					</tr>
				))}
			</tbody>
		</table>
	);
}
