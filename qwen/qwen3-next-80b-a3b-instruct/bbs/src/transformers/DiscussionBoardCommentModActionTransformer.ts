import { Prisma } from "@prisma/sdk";
import { ArrayUtil } from "@nestia/e2e";
import typia, { tags } from "typia";

import { IDiscussionBoardCommentModAction } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardCommentModAction";

import { toISOStringSafe } from "../utils/toISOStringSafe";

export namespace DiscussionBoardCommentModActionTransformer {
  export type Payload = Prisma.discussion_board_comment_mod_actionsGetPayload<
    ReturnType<typeof select>
  >;
  export function select() {
    return {
      select: {
        id: true,
        created_at: true,
        updated_at: true,
        deleted_at: true,
        comment: {
          select: {
            id: true,
          },
        },
        moderator: {
          select: {
            id: true,
          },
        },
        actionType: true,
      },
    } satisfies Prisma.discussion_board_comment_mod_actionsFindManyArgs;
  }
  export async function transform(
    input: Payload,
  ): Promise<IDiscussionBoardCommentModAction> {
    return {
      id: input.id,
      commentId: input.comment.id,
      moderatorId: input.moderator.id,
      actionType: input.actionType as
        | "remove"
        | "warn"
        | "delete"
        | "dismiss"
        | "approve",
      reason: "",
    };
  }
}
