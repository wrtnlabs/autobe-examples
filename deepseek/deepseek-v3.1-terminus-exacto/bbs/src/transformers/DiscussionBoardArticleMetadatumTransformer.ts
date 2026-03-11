import { IDiscussionBoardArticleMetadatum } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardArticleMetadatum";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { Prisma } from "@prisma/sdk";
import typia, { tags } from "typia";

import { toISOStringSafe } from "../utils/toISOStringSafe";

export namespace DiscussionBoardArticleMetadatumTransformer {
  export type Payload = Prisma.discussion_board_article_metadataGetPayload<
    ReturnType<typeof select>
  >;
  export function select() {
    return {
      select: {
        id: true,
        meta_title: true,
        meta_description: true,
        meta_keywords: true,
        reading_time_minutes: true,
        is_featured: true,
        created_at: true,
        updated_at: true,
        deleted_at: true,
        article: {
          select: {
            id: true,
          },
        } satisfies Prisma.discussion_board_articlesFindManyArgs,
      },
    } satisfies Prisma.discussion_board_article_metadataFindManyArgs;
  }
  export async function transform(
    input: Payload,
  ): Promise<IDiscussionBoardArticleMetadatum> {
    return {
      id: input.id,
      meta_title: input.meta_title ?? undefined,
      meta_description: input.meta_description ?? undefined,
      meta_keywords: input.meta_keywords ?? undefined,
      reading_time_minutes: input.reading_time_minutes ?? undefined,
      is_featured: input.is_featured,
      created_at: input.created_at.toISOString(),
      updated_at: input.updated_at.toISOString(),
      deleted_at: input.deleted_at?.toISOString() ?? null,
    };
  }
}
