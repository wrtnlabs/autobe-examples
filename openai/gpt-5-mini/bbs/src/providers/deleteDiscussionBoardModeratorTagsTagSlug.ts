import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { ModeratorPayload } from "../decorators/payload/ModeratorPayload";

export async function deleteDiscussionBoardModeratorTagsTagSlug(props: {
  moderator: ModeratorPayload;
  tagSlug: string;
}): Promise<void> {
  const { moderator, tagSlug } = props;

  // Authorization: ensure moderator exists and not soft-deleted
  const moderatorRecord =
    await MyGlobal.prisma.discussion_board_moderator.findUnique({
      where: { id: moderator.id },
    });
  if (!moderatorRecord || moderatorRecord.deleted_at) {
    throw new HttpException(
      "Unauthorized: moderator not found or inactive",
      403,
    );
  }

  // Locate the tag by slug; treat soft-deleted tags as not found
  const tag = await MyGlobal.prisma.discussion_board_tags.findFirst({
    where: { slug: tagSlug },
  });
  if (!tag || tag.deleted_at) {
    throw new HttpException("Not Found", 404);
  }

  // Count active assignments in the junction table
  const assignmentCount =
    await MyGlobal.prisma.discussion_board_article_tags.count({
      where: { discussion_board_tag_id: tag.id },
    });

  // Prepare timestamp once and reuse
  const now = toISOStringSafe(new Date());

  if (assignmentCount > 0) {
    // POLICY DECISION (DOCUMENTED): Deletion is BLOCKED if active assignments exist.
    // Record moderation action for the attempted removal and create an audit entry.
    const attemptedAction =
      await MyGlobal.prisma.discussion_board_moderation_actions.create({
        data: {
          id: v4() as string & tags.Format<"uuid">,
          moderator_id: moderator.id,
          action_type: "remove",
          action_reason: null,
          target_type: "tag",
          target_id: tag.id,
          created_at: now,
        },
      });

    await MyGlobal.prisma.discussion_board_moderation_audit.create({
      data: {
        id: v4() as string & tags.Format<"uuid">,
        moderation_action_id: attemptedAction.id,
        report_id: null,
        actor_moderator_id: moderator.id,
        event_type: "moderation.action",
        event_payload: JSON.stringify({
          message: "Blocked tag deletion due to active article assignments",
          tagSlug: tag.slug,
          tagId: tag.id,
          assignmentCount,
        }),
        occurred_at: now,
      },
    });

    throw new HttpException(
      "Conflict: Active assignments exist for this tag",
      409,
    );
  }

  // No active assignments — perform soft-delete (set deleted_at and disable)
  await MyGlobal.prisma.discussion_board_tags.update({
    where: { id: tag.id },
    data: {
      deleted_at: now,
      is_active: false,
    },
  });

  // Record moderation action for the successful removal and create an audit entry
  const removalAction =
    await MyGlobal.prisma.discussion_board_moderation_actions.create({
      data: {
        id: v4() as string & tags.Format<"uuid">,
        moderator_id: moderator.id,
        action_type: "remove",
        action_reason: null,
        target_type: "tag",
        target_id: tag.id,
        created_at: now,
      },
    });

  await MyGlobal.prisma.discussion_board_moderation_audit.create({
    data: {
      id: v4() as string & tags.Format<"uuid">,
      moderation_action_id: removalAction.id,
      report_id: null,
      actor_moderator_id: moderator.id,
      event_type: "moderation.action",
      event_payload: JSON.stringify({
        message: "Tag soft-deleted",
        tagSlug: tag.slug,
        tagId: tag.id,
      }),
      occurred_at: now,
    },
  });

  // Success: 204 No Content (function returns void)
  return;
}
