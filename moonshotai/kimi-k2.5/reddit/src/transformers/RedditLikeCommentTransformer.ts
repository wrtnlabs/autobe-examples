import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IRedditLikeAttachment } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikeAttachment";
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

export namespace RedditLikeCommentTransformer {
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
        snapshots: {
          select: { id: true },
        },
        votes: {
          select: { id: true },
        },
        reports: {
          select: { id: true },
        },
      },
    } satisfies Prisma.reddit_like_commentsFindManyArgs;
  }
  export type Payload = Prisma.reddit_like_commentsGetPayload<
    ReturnType<typeof select>
  >;
  export async function transform(input: Payload): Promise<IRedditLikeComment> {
    return {
      id: input.id,
      content: input.content,
      voteScore: input.vote_score,
      isEdited: input.is_edited,
      isDeleted: input.is_deleted,
      createdAt: typia.assert<string & tags.Format<"date-time">>(
        toISOStringSafe(input.created_at),
      ),
      updatedAt: typia.assert<string & tags.Format<"date-time">>(
        toISOStringSafe(input.updated_at),
      ),
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
      replies: [],
    };
  }
}
