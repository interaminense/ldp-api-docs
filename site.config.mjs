export const GROUPS = [
	{
		defaultEnabled: true,
		dir: 'rest-public',
		id: 'restPublic',
		label: 'Public REST',
		spec: 'specs/rest-public.yaml',
		stability: 'Stable',
	},
	{
		defaultEnabled: true,
		dir: 'graphql',
		id: 'graphql',
		label: 'GraphQL via DXP',
		publicSchema: 'specs/graphql/public-schema.graphql',
		schema: 'specs/graphql/schema.graphql',
		spec: null,
		stability: 'Internal, unstable',
	},
	{
		defaultEnabled: false,
		dir: 'faro-internal',
		id: 'faroInternal',
		label: 'Faro internal',
		spec: 'specs/faro-internal.yaml',
		stability: 'Internal, unstable',
	},
];

const TRUE_VALUES = new Set(['1', 'true']);
const FALSE_VALUES = new Set(['0', 'false']);

export function envName(id) {
	return (
		'DOCS_GROUP_' +
		id.replace(/[A-Z]/g, (letter) => '_' + letter).toUpperCase()
	);
}

function isEnabled(group, env) {
	const name = envName(group.id);
	const value = env[name];

	if (value === undefined || value === '') {
		return group.defaultEnabled;
	}

	const normalized = value.toLowerCase();

	if (TRUE_VALUES.has(normalized)) {
		return true;
	}

	if (FALSE_VALUES.has(normalized)) {
		return false;
	}

	throw new Error(
		`${name} must be one of true, false, 1, or 0, but was "${value}".`
	);
}

export function enabledGroups(env = process.env) {
	return GROUPS.filter((group) => isEnabled(group, env));
}
