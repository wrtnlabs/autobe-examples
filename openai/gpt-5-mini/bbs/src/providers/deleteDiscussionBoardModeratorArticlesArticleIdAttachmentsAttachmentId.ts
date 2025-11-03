import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { ModeratorPayload } from "../decorators/payload/ModeratorPayload";

export async function deleteDiscussionBoardModeratorArticlesArticleIdAttachmentsAttachmentId(props: {
  moderator: ModeratorPayload;
  articleId: string & tags.Format<"uuid">;
  attachmentId: string & tags.Format<"uuid">;
}): Promise<void> {
  const { moderator, articleId, attachmentId } = props;

  const attachment =
    await MyGlobal.prisma.discussion_board_attachments.findUnique({
      where: { id: attachmentId },
    });

  if (attachment === null) {
    throw new HttpException("Not Found: attachment", 404);
  }

  if (attachment.discussion_board_article_id !== articleId) {
    throw new HttpException(
      "Conflict: attachment does not belong to article",
      409,
    );
  }

  if (attachment.deleted_at !== null) {
    // Already soft-deleted — idempotent
    return;
  }

  const now = toISOStringSafe(new Date());

  await MyGlobal.prisma.$transaction(async (tx) => {
    await tx.discussion_board_attachments.update({
      where: { id: attachmentId },
      data: { deleted_at: now },
    });

    const moderationAction =
      await tx.discussion_board_moderation_actions.create({
        data: {
          id: v4() as string & tags.Format<"uuid">,
          moderator_id: moderator.id,
          action_type: "remove",
          action_reason: "Moderator soft-delete of attachment",
          target_type: "attachment",
          target_id: attachmentId,
          created_at: now,
        },
      });

    await tx.discussion_board_moderation_audit.create({
      data: {
        id: v4() as string & tags.Format<"uuid">,
        moderation_action_id: moderationAction.id,
        actor_moderator_id: moderator.id,
        event_type: "moderation.action",
        event_payload: JSON.stringify({
          action: "soft_delete_attachment",
          articleId,
          attachmentId,
          moderatorId: moderator.id,
        }),
        occurred_at: now,
      },
    });
  });

  return;
}
