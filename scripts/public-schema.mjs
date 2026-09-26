import {readFileSync, writeFileSync} from 'node:fs';
import {GraphQLSchema, buildSchema, printSchema} from 'graphql';

// The published reference documents queries only; mutations stay out of the public site

export function withoutMutations(sdl) {
	const schema = buildSchema(sdl);

	return (
		printSchema(
			new GraphQLSchema({
				directives: schema.getDirectives(),
				query: schema.getQueryType(),
			})
		) + '\n'
	);
}

export function withDescriptions(sdl, descriptions) {
	const schema = buildSchema(sdl);

	const fields = schema.getQueryType().getFields();

	for (const [name, description] of Object.entries(descriptions)) {
		if (!fields[name]) {
			throw new Error(`Unknown query: ${name}`);
		}

		fields[name].description = description;
	}

	return printSchema(schema) + '\n';
}

export function writePublicSchema(source, output, descriptionsPath) {
	writeFileSync(
		output,
		withDescriptions(
			withoutMutations(readFileSync(source, 'utf8')),
			JSON.parse(readFileSync(descriptionsPath, 'utf8'))
		)
	);
}
