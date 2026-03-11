import { IDiscussionBoardCommentDeletion } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardCommentDeletion";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { Prisma } from "@prisma/sdk";
import typia, { tags } from "typia";

import { toISOStringSafe } from "../utils/toISOStringSafe";

export namespace DiscussionBoardCommentDeletionTransformer {
  export type Payload = Prisma.discussion_board_comment_deletionsGetPayload<
    ReturnType<typeof select>
  >;
  export function select() {
    return {
      select: {
        id: true,
        actor_type: true,
        reason: true,
        created_at: true,
        updated_at: true,
        deleted_at_deletion_record: true,
        comment: {
          select: {
            id: true,
          },
        } satisfies Prisma.discussion_board_commentsFindManyArgs,
        memberDeletion: {
          select: {
            id: true,
          },
        } satisfies Prisma.discussion_board_comment_deletion_of_membersFindManyArgs,
        deletionByAdmin: {
          select: {
            id: true,
          },
        } satisfies Prisma.discussion_board_comment_deletion_of_adminsFindManyArgs,
        superAdminDeletion: {
          select: {
            id: true,
          },
        } satisfies Prisma.discussion_board_comment_deletion_of_super_adminsFindManyArgs,
      },
    } satisfies Prisma.discussion_board_comment_deletionsFindManyArgs;
  }
  export async function transform(
    input: Payload,
  ): Promise<IDiscussionBoardCommentDeletion> {
    return {
      id: input.id,
      discussion_board_comment_id: input.comment.id,
      actor_type: input.actor_type,
      reason: input.reason ?? null,
      created_at: input.created_at.toISOString(),
      updated_at: input.updated_at.toISOString(),
      deleted_at_deletion_record:
        input.deleted_at_deletion_record?.toISOString() ?? null,
    };
  }
}
