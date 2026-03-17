import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IRedditLikeCommentSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikeCommentSnapshot";
import { ArrayUtil } from "@nestia/e2e";
import { Prisma } from "@prisma/sdk";
import typia, { tags } from "typia";

import { toISOStringSafe } from "../utils/toISOStringSafe";

export namespace RedditLikeCommentSnapshotTransformer {
  export type Payload = Prisma.reddit_like_comment_snapshotsGetPayload<
    ReturnType<typeof select>
  >;
  export function select() {
    return {
      select: {
        id: true,
        body: true,
        edit_reason: true,
        created_at: true,
        comment: {
          select: {
            id: true,
          },
        },
      },
    } satisfies Prisma.reddit_like_comment_snapshotsFindManyArgs;
  }
  export async function transform(
    input: Payload,
  ): Promise<IRedditLikeCommentSnapshot> {
    return {
      id: input.id,
      commentId: input.comment.id,
      body: input.body,
      editReason: input.edit_reason ?? null,
      createdAt: toISOStringSafe(input.created_at),
    };
  }
}
