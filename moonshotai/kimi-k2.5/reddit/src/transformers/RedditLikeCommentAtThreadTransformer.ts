import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IRedditLikeComment } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikeComment";
import { IRedditLikeMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikeMember";
import { ArrayUtil } from "@nestia/e2e";
import { Prisma } from "@prisma/sdk";
import typia, { tags } from "typia";

import { toISOStringSafe } from "../utils/toISOStringSafe";
import { RedditLikeMemberAtSummaryTransformer } from "./RedditLikeMemberAtSummaryTransformer";

export namespace RedditLikeCommentAtThreadTransformer {
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
        author: RedditLikeMemberAtSummaryTransformer.select(),
        replies: RedditLikeCommentAtThreadTransformer.select(),
      },
    } satisfies Prisma.reddit_like_commentsFindManyArgs;
  }
  export async function transform(
    input: Payload,
  ): Promise<IRedditLikeComment.IThread> {
    return {
      id: input.id,
      content: input.is_deleted ? null : input.content,
      voteScore: input.vote_score,
      isEdited: input.is_edited,
      isDeleted: input.is_deleted,
      createdAt: input.created_at.toISOString(),
      author: await RedditLikeMemberAtSummaryTransformer.transform(
        input.author,
      ),
      replies: await ArrayUtil.asyncMap(
        input.replies,
        RedditLikeCommentAtThreadTransformer.transform,
      ),
    };
  }
}
