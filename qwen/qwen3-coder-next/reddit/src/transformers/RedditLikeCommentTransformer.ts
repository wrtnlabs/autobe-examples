import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IRedditLikeComment } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikeComment";
import { IRedditLikeCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikeCommunity";
import { IRedditLikeMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikeMember";
import { IRedditLikePost } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikePost";
import { ArrayUtil } from "@nestia/e2e";
import { Prisma } from "@prisma/sdk";
import typia, { tags } from "typia";

import { toISOStringSafe } from "../utils/toISOStringSafe";
import { RedditLikeMemberAtSummaryTransformer } from "./RedditLikeMemberAtSummaryTransformer";
import { RedditLikePostAtSummaryTransformer } from "./RedditLikePostAtSummaryTransformer";

export namespace RedditLikeCommentTransformer {
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
          select: { id: true },
        },
        replies: {
          select: { id: true },
        },
        votes: {
          select: { id: true },
        },
        votesSum: {
          select: { id: true },
        },
        revisions: {
          select: { id: true },
        },
        reports: {
          select: { id: true },
        },
      },
    } satisfies Prisma.reddit_like_commentsFindManyArgs;
  }
  export async function transform(input: Payload): Promise<IRedditLikeComment> {
    return {
      id: input.id,
      content: input.content,
      vote_score: input.vote_score,
      created_at: toISOStringSafe(input.created_at),
      updated_at: toISOStringSafe(input.updated_at),
      deleted_at: input.deleted_at ? toISOStringSafe(input.deleted_at) : null,
      author_id: input.author.id,
      post_id: input.post.id,
      parent_comment_id: input.parentComment?.id ?? null,
      author: await RedditLikeMemberAtSummaryTransformer.transform(
        input.author,
      ),
      post: await RedditLikePostAtSummaryTransformer.transform(input.post),
      replies_count: input.replies.length,
    };
  }
}
