import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IRedditLikeComment } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikeComment";
import { ArrayUtil } from "@nestia/e2e";
import { Prisma } from "@prisma/sdk";
import typia, { tags } from "typia";

import { toISOStringSafe } from "../utils/toISOStringSafe";

export namespace RedditLikeCommentAtVoteStatusTransformer {
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
        author: {
          select: {
            id: true,
          },
        },
        post: {
          select: {
            id: true,
          },
        },
        parentComment: {
          select: {
            id: true,
          },
        },
        replies: {
          select: {
            id: true,
          },
        },
        votes: {
          select: {
            id: true,
          },
        },
        votesSum: {
          select: {
            id: true,
          },
        },
        revisions: {
          select: {
            id: true,
          },
        },
        reports: {
          select: {
            id: true,
          },
        },
      },
    } satisfies Prisma.reddit_like_commentsFindManyArgs;
  }
  export async function transform(
    input: Payload,
  ): Promise<IRedditLikeComment.IVoteStatus> {
    return {
      id: input.id,
      value: input.vote_score,
      score: input.vote_score,
      created_at: input.created_at.toISOString(),
    };
  }
}
