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

export function writePublicSchema(source, output) {
	writeFileSync(output, withoutMutations(readFileSync(source, 'utf8')));
}
