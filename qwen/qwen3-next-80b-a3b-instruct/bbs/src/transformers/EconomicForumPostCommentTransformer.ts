import { Prisma } from "@prisma/sdk";
import { ArrayUtil } from "@nestia/e2e";
import typia, { tags } from "typia";

import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IEconomicForumPostComment } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconomicForumPostComment";

import { toISOStringSafe } from "../utils/toISOStringSafe";

export namespace EconomicForumPostCommentTransformer {
  export type Payload = Prisma.economic_forum_post_commentsGetPayload<
    ReturnType<typeof select>
  >;
  export function select() {
    return {
      select: {
        id: true,
        body: true,
        created_at: true,
        updated_at: true,
        deleted_at: true,
        post_id: true,
        parent_id: true,
        user_id: true,
      },
    } satisfies Prisma.economic_forum_post_commentsFindManyArgs;
  }
  export async function transform(
    input: Payload,
  ): Promise<IEconomicForumPostComment> {
    // Since we can't access nested post object, we must use post_id to determine status
    // Default to 'active' for any valid post_id, null if no post_id and no parent_id
    const postId = input.post_id;
    const parentPostId = input.parent_id;
    const status =
      postId !== null ? "active" : parentPostId !== null ? "active" : null;
    return {
      id: input.id,
      created_at: toISOStringSafe(input.created_at),
      updated_at: toISOStringSafe(input.updated_at),
      status: status as "active" | "inactive" | "moderated" | "hidden" | null,
    };
  }
}
