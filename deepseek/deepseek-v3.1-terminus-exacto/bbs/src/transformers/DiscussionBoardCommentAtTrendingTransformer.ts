import { IDiscussionBoardArticle } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardArticle";
import { IDiscussionBoardComment } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardComment";
import { IDiscussionBoardSection } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardSection";
import { IDiscussionBoardUser } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardUser";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { Prisma } from "@prisma/sdk";
import typia, { tags } from "typia";

import { toISOStringSafe } from "../utils/toISOStringSafe";
import { DiscussionBoardArticleAtSummaryTransformer } from "./DiscussionBoardArticleAtSummaryTransformer";
import { DiscussionBoardUserAtSummaryTransformer } from "./DiscussionBoardUserAtSummaryTransformer";

export namespace DiscussionBoardCommentAtTrendingTransformer {
  export type Payload = Prisma.discussion_board_commentsGetPayload<
    ReturnType<typeof select>
  >;
  export function select() {
    return {
      select: {
        id: true,
        content: true,
        created_at: true,
        updated_at: true,
        deleted_at: true,
        author: DiscussionBoardUserAtSummaryTransformer.select(),
        article: DiscussionBoardArticleAtSummaryTransformer.select(),
        auditActions: true,
        snapshots: true,
        moderations: true,
        reports: true,
        votes: {
          select: {
            id: true,
            vote_type: true,
            created_at: true,
          },
        } satisfies Prisma.discussion_board_comment_votesFindManyArgs,
        attachments: true,
        mentions: true,
        flags: true,
        editHistories: true,
        moderationLogs: true,
        moderationHistories: true,
        contentFlags: true,
      },
    } satisfies Prisma.discussion_board_commentsFindManyArgs;
  }
  export async function transform(
    input: Payload,
  ): Promise<IDiscussionBoardComment.ITrending> {
    const upvotes = input.votes.filter(
      (vote) => vote.vote_type === "upvote",
    ).length;
    const downvotes = input.votes.filter(
      (vote) => vote.vote_type === "downvote",
    ).length;
    return {
      id: input.id,
      content: input.content,
      created_at: input.created_at.toISOString(),
      author: await DiscussionBoardUserAtSummaryTransformer.transform(
        input.author,
      ),
      article: await DiscussionBoardArticleAtSummaryTransformer.transform(
        input.article,
      ),
      upvotes,
      downvotes,
      trending_score: upvotes - downvotes,
    };
  }
}
