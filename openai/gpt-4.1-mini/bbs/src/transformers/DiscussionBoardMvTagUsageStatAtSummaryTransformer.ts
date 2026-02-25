import { IDiscussionBoardMvTagUsageStat } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardMvTagUsageStat";
import { IDiscussionBoardTag } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardTag";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { Prisma } from "@prisma/sdk";
import typia, { tags } from "typia";

import { toISOStringSafe } from "../utils/toISOStringSafe";

export namespace DiscussionBoardMvTagUsageStatAtSummaryTransformer {
  export type Payload = Prisma.discussion_board_mv_tag_usage_statsGetPayload<
    ReturnType<typeof select>
  >;
  export function select() {
    return {
      select: {
        id: true,
        article_count: true,
        comment_count: true,
        refreshed_at: true,
        tag: true,
      },
    } satisfies Prisma.discussion_board_mv_tag_usage_statsFindManyArgs;
  }
  export async function transform(
    input: Payload,
  ): Promise<IDiscussionBoardMvTagUsageStat.ISummary> {
    return {
      id: input.id,
      articleCount: input.article_count,
      commentCount: input.comment_count,
      refreshedAt: input.refreshed_at.toISOString(),
      tag: {},
    };
  }
}
