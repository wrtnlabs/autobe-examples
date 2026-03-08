import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IRedditLikeCommentRevision } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikeCommentRevision";
import { ArrayUtil } from "@nestia/e2e";
import { Prisma } from "@prisma/sdk";
import typia, { tags } from "typia";

import { toISOStringSafe } from "../utils/toISOStringSafe";

export namespace RedditLikeCommentRevisionAtSummaryTransformer {
  export type Payload = Prisma.reddit_like_comment_revisionsGetPayload<
    ReturnType<typeof select>
  >;
  export function select() {
    return {
      select: {
        id: true,
        content: true,
        created_at: true,
        comment: {
          select: {
            id: true,
          },
        },
      },
    } satisfies Prisma.reddit_like_comment_revisionsFindManyArgs;
  }
  export async function transform(
    input: Payload,
  ): Promise<IRedditLikeCommentRevision.ISummary> {
    return {
      id: input.id,
      content: input.content,
      created_at: input.created_at.toISOString(),
      comment_id: input.comment.id,
    };
  }
}
