import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IRedditLikeComment } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikeComment";
import { IRedditLikeMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikeMember";
import { ArrayUtil } from "@nestia/e2e";
import { Prisma } from "@prisma/sdk";
import typia, { tags } from "typia";

import { toISOStringSafe } from "../utils/toISOStringSafe";
import { RedditLikeMemberAtSummaryTransformer } from "./RedditLikeMemberAtSummaryTransformer";

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
        parentComment: {
          select: { id: true },
        },
      },
    } satisfies Prisma.reddit_like_commentsFindManyArgs;
  }
  export async function transform(
    input: Payload,
  ): Promise<IRedditLikeComment.ISummary> {
    return {
      id: input.id,
      content: input.content,
      vote_score: input.vote_score,
      created_at: toISOStringSafe(input.created_at),
      updated_at: toISOStringSafe(input.updated_at),
      deleted_at: input.deleted_at ? toISOStringSafe(input.deleted_at) : null,
      author: await RedditLikeMemberAtSummaryTransformer.transform(
        input.author,
      ),
      parent_comment_id: input.parentComment?.id ?? null,
    };
  }
}
