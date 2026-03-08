import { IDiscussionBoardTag } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardTag";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { Prisma } from "@prisma/sdk";
import typia, { tags } from "typia";

import { toISOStringSafe } from "../utils/toISOStringSafe";

export namespace DiscussionBoardTagAtSummaryTransformer {
  export type Payload = Prisma.discussion_board_tagsGetPayload<
    ReturnType<typeof select>
  >;
  export function select() {
    return {
      select: {
        id: true,
        name: true,
        description: true,
        created_at: true,
        articleTags: {
          select: {
            id: true,
          },
        } satisfies Prisma.discussion_board_article_tagsFindManyArgs,
      },
    } satisfies Prisma.discussion_board_tagsFindManyArgs;
  }
  export async function transform(
    input: Payload,
  ): Promise<IDiscussionBoardTag.ISummary> {
    return {
      id: input.id,
      name: input.name,
      description: input.description ?? null,
      article_count: input.articleTags.length,
      created_at: input.created_at.toISOString(),
    };
  }
}
