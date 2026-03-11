import { IDiscussionBoardArticle } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardArticle";
import { IDiscussionBoardArticleTag } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardArticleTag";
import { IDiscussionBoardMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardMember";
import { IDiscussionBoardMvArticleComment } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardMvArticleComment";
import { IDiscussionBoardSection } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardSection";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { Prisma } from "@prisma/sdk";
import typia, { tags } from "typia";

import { toISOStringSafe } from "../utils/toISOStringSafe";
import { DiscussionBoardArticleAtSummaryTransformer } from "./DiscussionBoardArticleAtSummaryTransformer";

export namespace DiscussionBoardMvArticleCommentTransformer {
  export type Payload = Prisma.discussion_board_mv_article_commentsGetPayload<
    ReturnType<typeof select>
  >;
  export function select() {
    return {
      select: {
        id: true,
        total_comment_count: true,
        latest_comment_timestamp: true,
        refresh_timestamp: true,
        article: DiscussionBoardArticleAtSummaryTransformer.select(),
      },
    } satisfies Prisma.discussion_board_mv_article_commentsFindManyArgs;
  }
  export async function transform(
    input: Payload,
  ): Promise<IDiscussionBoardMvArticleComment> {
    return {
      id: input.id,
      totalCommentCount: input.total_comment_count,
      latestCommentTimestamp:
        input.latest_comment_timestamp?.toISOString() ?? null,
      refreshTimestamp: input.refresh_timestamp.toISOString(),
      article: await DiscussionBoardArticleAtSummaryTransformer.transform(
        input.article,
      ),
    };
  }
}
