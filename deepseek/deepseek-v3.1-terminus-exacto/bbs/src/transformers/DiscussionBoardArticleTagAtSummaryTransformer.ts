import { IDiscussionBoardArticleTag } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardArticleTag";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { Prisma } from "@prisma/sdk";
import typia, { tags } from "typia";

import { toISOStringSafe } from "../utils/toISOStringSafe";

export namespace DiscussionBoardArticleTagAtSummaryTransformer {
  export type Payload = Prisma.discussion_board_article_tagsGetPayload<
    ReturnType<typeof select>
  >;
  export function select() {
    return {
      select: {
        id: true,
        tag_name: true,
        created_at: true,
      },
    } satisfies Prisma.discussion_board_article_tagsFindManyArgs;
  }
  export async function transform(
    input: Payload,
  ): Promise<IDiscussionBoardArticleTag.ISummary> {
    return {
      id: input.id,
      tag_name: input.tag_name,
      created_at: input.created_at.toISOString(),
    };
  }
}
