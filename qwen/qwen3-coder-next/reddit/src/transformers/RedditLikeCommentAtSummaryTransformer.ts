import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IRedditLikeComment } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikeComment";
import { IRedditLikeCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikeCommunity";
import { IRedditLikeMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikeMember";
import { IRedditLikePost } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikePost";
import { ArrayUtil } from "@nestia/e2e";
import { Prisma } from "@prisma/sdk";
import typia, { tags } from "typia";

import { toISOStringSafe } from "../utils/toISOStringSafe";
import { RedditLikeCommentAtSummaryTransformer } from "./RedditLikeCommentAtSummaryTransformer";
import { RedditLikeMemberAtSummaryTransformer } from "./RedditLikeMemberAtSummaryTransformer";
import { RedditLikePostAtSummaryTransformer } from "./RedditLikePostAtSummaryTransformer";

export namespace RedditLikeCommentAtSummaryTransformer {
  export type Payload = Prisma.reddit_like_commentsGetPayload<
    ReturnType<typeof select>
  >;
  export function select() {
    return {
      select: {
        id: true,
        content: true,
        vote_score: true,
        created_at: true,
        updated_at: true,
        deleted_at: true,
        author: RedditLikeMemberAtSummaryTransformer.select(),
        post: RedditLikePostAtSummaryTransformer.select(),
        parentComment: {
          select: {
            id: true,
            content: true,
            vote_score: true,
            created_at: true,
            author: RedditLikeMemberAtSummaryTransformer.select(),
            post: RedditLikePostAtSummaryTransformer.select(),
          },
        } satisfies Prisma.reddit_like_commentsFindManyArgs,
        replies: {
          select: { id: true },
        } satisfies Prisma.reddit_like_commentsFindManyArgs,
        votes: {
          select: { id: true },
        } satisfies Prisma.reddit_like_comment_votesFindManyArgs,
        votesSum: {
          select: { id: true },
        } satisfies Prisma.reddit_like_comment_votes_sumsFindManyArgs,
        revisions: {
          select: { id: true },
        } satisfies Prisma.reddit_like_comment_revisionsFindManyArgs,
        reports: {
          select: { id: true },
        } satisfies Prisma.reddit_like_reportsFindManyArgs,
      },
    } satisfies Prisma.reddit_like_commentsFindManyArgs;
  }
  export async function transform(
    input: Payload,
  ): Promise<IRedditLikeComment.ISummary> {
    return {
      id: input.id,
      content: input.content,
      voteScore: input.vote_score,
      createdAt: input.created_at.toISOString(),
      author: await RedditLikeMemberAtSummaryTransformer.transform(
        input.author,
      ),
      post: await RedditLikePostAtSummaryTransformer.transform(input.post),
      parentComment: input.parentComment
        ? await RedditLikeCommentAtSummaryTransformer.transform(
            input.parentComment,
          )
        : null,
      replyCount: input.replies.length,
    };
  }
}
