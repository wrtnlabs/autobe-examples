import { IDiscussionBoardTag } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardTag";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { Prisma } from "@prisma/sdk";
import typia, { tags } from "typia";

import { toISOStringSafe } from "../utils/toISOStringSafe";

export namespace DiscussionBoardTagTransformer {
  export type Payload = Prisma.discussion_board_tagsGetPayload<
    ReturnType<typeof select>
  >;
  export function select() {
    return {
      select: {
        id: true,
        name: true,
        created_at: true,
        updated_at: true,
        deleted_at: true,
        articleTagMappings: {
          select: { id: true },
        } satisfies Prisma.discussion_board_article_tag_mappingsFindManyArgs,
        mvTagUsageStats: {
          select: { id: true },
        } satisfies Prisma.discussion_board_mv_tag_usage_statsFindManyArgs,
        articleTags: {
          select: { id: true },
        } satisfies Prisma.discussion_board_article_tagsFindManyArgs,
      },
    } satisfies Prisma.discussion_board_tagsFindManyArgs;
  }
  export async function transform(
    input: Payload,
  ): Promise<IDiscussionBoardTag> {
    return {
      id: input.id,
      name: input.name,
      created_at: input.created_at.toISOString(),
      updated_at: input.updated_at.toISOString(),
      deleted_at: input.deleted_at?.toISOString() ?? null,
    };
  }
}
