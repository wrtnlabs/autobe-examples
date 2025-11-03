import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { IDiscussionBoardUserWarning } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardUserWarning";
import { IDiscussionBoardMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardMember";
import { IDiscussionBoardModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardModerator";
import { IDiscussionBoardModerationAction } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardModerationAction";
import { ModeratorPayload } from "../decorators/payload/ModeratorPayload";

export async function deleteDiscussionBoardModeratorModerationWarningsWarningId(props: {
  moderator: ModeratorPayload;
  warningId: string & tags.Format<"uuid">;
}): Promise<IDiscussionBoardUserWarning> {
  const { warningId } = props;

  // Fetch the warning to verify it exists and is not already deleted
  const existingWarning =
    await MyGlobal.prisma.discussion_board_user_warnings.findUniqueOrThrow({
      where: { id: warningId },
    });

  if (existingWarning.deleted_at !== null) {
    throw new HttpException("Warning is already deleted", 400);
  }

  // Perform soft delete by setting deleted_at timestamp
  const now = toISOStringSafe(new Date());

  const updated = await MyGlobal.prisma.discussion_board_user_warnings.update({
    where: { id: warningId },
    data: {
      deleted_at: now,
      updated_at: now,
    },
    include: {
      warnedUser: true,
      issuingModerator: true,
      relatedModerationAction: {
        include: {
          moderator: true,
        },
      },
    },
  });

  // Transform to IDiscussionBoardUserWarning
  return {
    id: updated.id as string & tags.Format<"uuid">,
    discussion_board_member_id: updated.discussion_board_member_id as string &
      tags.Format<"uuid">,
    discussion_board_moderator_id:
      updated.discussion_board_moderator_id as string & tags.Format<"uuid">,
    related_moderation_action_id: updated.related_moderation_action_id
      ? (updated.related_moderation_action_id as string & tags.Format<"uuid">)
      : null,
    warnedUser: {
      id: updated.warnedUser.id as string & tags.Format<"uuid">,
      username: updated.warnedUser.username,
      display_name: updated.warnedUser.display_name ?? undefined,
      profile_picture_url: updated.warnedUser.profile_picture_url
        ? (updated.warnedUser.profile_picture_url as string &
            tags.Format<"uri">)
        : undefined,
    },
    issuingModerator: {
      id: updated.issuingModerator.id as string & tags.Format<"uuid">,
      username: updated.issuingModerator.username,
      display_name: updated.issuingModerator.display_name,
      profile_picture_url: updated.issuingModerator.profile_picture_url
        ? (updated.issuingModerator.profile_picture_url as string &
            tags.Format<"uri">)
        : null,
      email_verified: updated.issuingModerator.email_verified,
      status: updated.issuingModerator.status,
      moderation_permissions: updated.issuingModerator.moderation_permissions,
      profile_visibility: updated.issuingModerator.profile_visibility,
      activity_visibility: updated.issuingModerator.activity_visibility,
      bio: updated.issuingModerator.bio ?? undefined,
      location: updated.issuingModerator.location ?? undefined,
      website_url: updated.issuingModerator.website_url
        ? (updated.issuingModerator.website_url as string & tags.Format<"uri">)
        : undefined,
      last_login_at: updated.issuingModerator.last_login_at
        ? toISOStringSafe(updated.issuingModerator.last_login_at)
        : undefined,
      created_at: toISOStringSafe(updated.issuingModerator.created_at),
      updated_at: toISOStringSafe(updated.issuingModerator.updated_at),
      deleted_at: updated.issuingModerator.deleted_at
        ? toISOStringSafe(updated.issuingModerator.deleted_at)
        : undefined,
    },
    relatedModerationAction: updated.relatedModerationAction
      ? {
          id: updated.relatedModerationAction.id as string &
            tags.Format<"uuid">,
          moderator: {
            id: updated.relatedModerationAction.moderator.id as string &
              tags.Format<"uuid">,
            username: updated.relatedModerationAction.moderator.username,
            display_name:
              updated.relatedModerationAction.moderator.display_name,
            profile_picture_url: updated.relatedModerationAction.moderator
              .profile_picture_url
              ? (updated.relatedModerationAction.moderator
                  .profile_picture_url as string & tags.Format<"uri">)
              : null,
            email_verified:
              updated.relatedModerationAction.moderator.email_verified,
            status: updated.relatedModerationAction.moderator.status,
            moderation_permissions:
              updated.relatedModerationAction.moderator.moderation_permissions,
            profile_visibility:
              updated.relatedModerationAction.moderator.profile_visibility,
            activity_visibility:
              updated.relatedModerationAction.moderator.activity_visibility,
            bio: updated.relatedModerationAction.moderator.bio ?? undefined,
            location:
              updated.relatedModerationAction.moderator.location ?? undefined,
            website_url: updated.relatedModerationAction.moderator.website_url
              ? (updated.relatedModerationAction.moderator
                  .website_url as string & tags.Format<"uri">)
              : undefined,
            last_login_at: updated.relatedModerationAction.moderator
              .last_login_at
              ? toISOStringSafe(
                  updated.relatedModerationAction.moderator.last_login_at,
                )
              : undefined,
            created_at: toISOStringSafe(
              updated.relatedModerationAction.moderator.created_at,
            ),
            updated_at: toISOStringSafe(
              updated.relatedModerationAction.moderator.updated_at,
            ),
            deleted_at: updated.relatedModerationAction.moderator.deleted_at
              ? toISOStringSafe(
                  updated.relatedModerationAction.moderator.deleted_at,
                )
              : undefined,
          },
          action_type: updated.relatedModerationAction.action_type,
          target_type: updated.relatedModerationAction.target_type,
          target_id: updated.relatedModerationAction.target_id as string &
            tags.Format<"uuid">,
          reason: updated.relatedModerationAction.reason,
          created_at: toISOStringSafe(
            updated.relatedModerationAction.created_at,
          ),
          updated_at: toISOStringSafe(
            updated.relatedModerationAction.updated_at,
          ),
        }
      : null,
    warning_reason: updated.warning_reason,
    warning_details: updated.warning_details,
    severity: updated.severity,
    acknowledged_at: updated.acknowledged_at
      ? toISOStringSafe(updated.acknowledged_at)
      : null,
    created_at: toISOStringSafe(updated.created_at),
    updated_at: toISOStringSafe(updated.updated_at),
    deleted_at: now,
  };
}
