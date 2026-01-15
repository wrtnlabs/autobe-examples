import { Prisma } from "@prisma/sdk";
import { ArrayUtil } from "@nestia/e2e";
import typia, { tags } from "typia";

import { IDiscussionBoardCommentVoteSummary } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardCommentVoteSummary";

import { toISOStringSafe } from "../utils/toISOStringSafe";

export namespace DiscussionBoardCommentVoteSummaryTransformer {
  export type Payload = ReturnType<typeof select>;
  export function select() {
    return {
      where: {},
      groupBy: ["comment_id"],
      _count: {
        upvotes: {
          where: {
            vote_type: 1,
          },
        },
        downvotes: {
          where: {
            vote_type: -1,
          },
        },
      },
    } satisfies Prisma.discussion_board_comment_votesGroupByArgs;
  }
  export async function transform(
    input: Payload,
  ): Promise<IDiscussionBoardCommentVoteSummary> {
    return {
      upvote_count: input._count?.upvotes || 0,
      downvote_count: input._count?.downvotes || 0,
      net_vote_count:
        (input._count?.upvotes || 0) - (input._count?.downvotes || 0),
    };
  }
}
