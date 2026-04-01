import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IRedditLikeAttachment } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikeAttachment";
import { IRedditLikeComment } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikeComment";
import { IRedditLikeCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikeCommunity";
import { IRedditLikeMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikeMember";
import { IRedditLikePost } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikePost";
import { ArrayUtil } from "@nestia/e2e";
import { Prisma } from "@prisma/sdk";
import { VariadicSingleton } from "tstl";
import typia, { tags } from "typia";

import { MyGlobal } from "../MyGlobal";
import { toISOStringSafe } from "../utils/toISOStringSafe";
import { RedditLikeCommentAtSummaryTransformer } from "./RedditLikeCommentAtSummaryTransformer";
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
        is_edited: true,
        is_deleted: true,
        created_at: true,
        updated_at: true,
        post_id: true,
        author_id: true,
        parent_id: true,
        post: RedditLikePostAtSummaryTransformer.select(),
        author: RedditLikeMemberAtSummaryTransformer.select(),
        parent: RedditLikeCommentAtSummaryTransformer.select(),
        replies: {
          select: {
            id: true,
            content: true,
            vote_score: true,
            is_edited: true,
            is_deleted: true,
            created_at: true,
            updated_at: true,
            post_id: true,
            author_id: true,
            parent_id: true,
            post: RedditLikePostAtSummaryTransformer.select(),
            author: RedditLikeMemberAtSummaryTransformer.select(),
            parent: RedditLikeCommentAtSummaryTransformer.select(),
          },
        } satisfies Prisma.reddit_like_commentsFindManyArgs,
      },
    } satisfies Prisma.reddit_like_commentsFindManyArgs;
  }
  export async function transform(input: Payload): Promise<IRedditLikeComment> {
    return {
      id: input.id,
      content: input.content,
      voteScore: input.vote_score,
      isEdited: input.is_edited,
      isDeleted: input.is_deleted,
      createdAt: input.created_at.toISOString(),
      updatedAt: input.updated_at.toISOString(),
      postId: input.post_id,
      authorId: input.author_id,
      parentId: input.parent_id,
      author: await RedditLikeMemberAtSummaryTransformer.transform(
        input.author,
      ),
      post: await RedditLikePostAtSummaryTransformer.transform(input.post),
      parent: input.parent
        ? await RedditLikeCommentAtSummaryTransformer.transform(input.parent)
        : null,
      replies: await ArrayUtil.asyncMap(input.replies, async (reply) => ({
        id: reply.id,
        content: reply.content,
        voteScore: reply.vote_score,
        isEdited: reply.is_edited,
        isDeleted: reply.is_deleted,
        createdAt: reply.created_at.toISOString(),
        updatedAt: reply.updated_at.toISOString(),
        postId: reply.post_id,
        authorId: reply.author_id,
        parentId: reply.parent_id,
        author: await RedditLikeMemberAtSummaryTransformer.transform(
          reply.author,
        ),
        post: await RedditLikePostAtSummaryTransformer.transform(reply.post),
        parent: reply.parent
          ? await RedditLikeCommentAtSummaryTransformer.transform(reply.parent)
          : null,
        replies: [],
      })),
    };
  }
}
