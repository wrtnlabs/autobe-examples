import { Prisma } from "@prisma/sdk";
import { ArrayUtil } from "@nestia/e2e";
import typia, { tags } from "typia";

import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IEconomyPoliticsBoardArticle } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconomyPoliticsBoardArticle";
import { IEconomyPoliticsBoardUser } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconomyPoliticsBoardUser";
import { IEconomyPoliticsBoardSection } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconomyPoliticsBoardSection";
import { IEconomyPoliticsBoardArticleAttachment } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconomyPoliticsBoardArticleAttachment";
import { IEconomyPoliticsBoardArticleTag } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconomyPoliticsBoardArticleTag";

import { toISOStringSafe } from "../utils/toISOStringSafe";


export namespace EconomyPoliticsBoardArticleTransformer {
    export type Payload = Prisma.economy_politics_board_articlesGetPayload<ReturnType<typeof select>>;
    export function select() {
        return {
            id: true,
            title: true,
            content: true,
            author_id: true,
            section_id: true,
            created_at: true,
            updated_at: true,
            deleted_at: true,
            satisfies, Prisma, : .economy_politics_board_articlesFindManyArgs
        };
        export async function transform(input: Payload): Promise<IEconomyPoliticsBoardArticle> {
            return {
                id: input.id,
                title: input.title,
                content: input.content,
                author: input.author_id,
                section: input.section_id,
                attachments: input.attachments?.map(a => ({
                    id: a.id,
                    filename: a.filename,
                    path: a.path,
                    size: a.size,
                    createdAt: toISOStringSafe(a.created_at),
                    updatedAt: toISOStringSafe(a.updated_at),
                    deletedAt: a.deleted_at ? toISOStringSafe(a.deleted_at) : null
                })) || [],
                tags: input.tags?.map(t => ({
                    id: t.id,
                    name: t.name,
                    createdAt: toISOStringSafe(t.created_at),
                    updatedAt: toISOStringSafe(t.updated_at),
                    deletedAt: t.deleted_at ? toISOStringSafe(t.deleted_at) : null
                })) || [],
                created_at: toISOStringSafe(input.created_at),
                updated_at: toISOStringSafe(input.updated_at),
                deleted_at: input.deleted_at ? toISOStringSafe(input.deleted_at) : null
            };
        }
    }
}