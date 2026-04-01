import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IRedditLikeCommentSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikeCommentSnapshot";
import { ArrayUtil } from "@nestia/e2e";
import { Prisma } from "@prisma/sdk";
import { VariadicSingleton } from "tstl";
import typia, { tags } from "typia";

import { MyGlobal } from "../MyGlobal";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export namespace RedditLikeCommentSnapshotTransformer {
  export type Payload = Prisma.reddit_like_comment_snapshotsGetPayload<
    ReturnType<typeof select>
  >;
  export function select() {
    return {
      select: {
        id: true,
        comment_id: true,
        body: true,
        edit_reason: true,
        created_at: true,
        comment: { select: {} },
      },
    } satisfies Prisma.reddit_like_comment_snapshotsFindManyArgs;
  }
  export async function transform(
    input: Payload,
  ): Promise<IRedditLikeCommentSnapshot> {
    return {
      id: input.id,
      commentId: input.comment_id,
      body: input.body,
      editReason: input.edit_reason ?? null,
      createdAt: input.created_at.toISOString(),
    };
  }
}
