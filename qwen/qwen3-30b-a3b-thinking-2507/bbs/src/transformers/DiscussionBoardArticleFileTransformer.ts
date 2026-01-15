import { Prisma } from "@prisma/sdk";
import { ArrayUtil } from "@nestia/e2e";
import typia, { tags } from "typia";

import { IDiscussionBoardArticleFile } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardArticleFile";

import { toISOStringSafe } from "../utils/toISOStringSafe";


export namespace DiscussionBoardArticleFileTransformer {
    export type Payload = Prisma.discussion_board_article_filesGetPayload<ReturnType<typeof select>>;
    export function select() {
        return {
            select: {
                id: true,
                file_type: true,
                file_size: true,
                display_name: true,
                created_at: true,
                updated_at: true,
                deleted_at: true,
                article: {
                    select: {
                    // Removed 'code' as it doesn't exist in discussion_board_articles model
                    },
                },
            },
            satisfies, Prisma, : .discussion_board_article_filesFindManyArgs
        };
        export async function transform(input: Payload): Promise<IDiscussionBoardArticleFile> {
            return {
                id: input.id,
                article_code: input.article.id, // Using valid property 'id' instead of invalid 'code'
                file_code: input.id,
                original_filename: input.display_name,
                mime_type: input.file_type,
                size: input.file_size,
                uri: `/files/${input.id}`,
                created_at: toISOStringSafe(input.created_at),
                updated_at: toISOStringSafe(input.updated_at),
            };
        }
    }
}