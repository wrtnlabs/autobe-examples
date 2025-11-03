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

export async function getDiscussionBoardModeratorModerationWarningsWarningId(props: {
  moderator: ModeratorPayload;
  warningId: string & tags.Format<"uuid">;
}): Promise<IDiscussionBoardUserWarning> {
  const { moderator, warningId } = props;

  const warning =
    await MyGlobal.prisma.discussion_board_user_warnings.findUniqueOrThrow({
      where: { id: warningId },
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

  return {
    id: warning.id as string & tags.Format<"uuid">,
    discussion_board_member_id: warning.discussion_board_member_id as string &
      tags.Format<"uuid">,
    discussion_board_moderator_id:
      warning.discussion_board_moderator_id as string & tags.Format<"uuid">,
    related_moderation_action_id: warning.related_moderation_action_id
      ? (warning.related_moderation_action_id as string & tags.Format<"uuid">)
      : undefined,
    warnedUser: {
      id: warning.warnedUser.id as string & tags.Format<"uuid">,
      username: warning.warnedUser.username,
      display_name: warning.warnedUser.display_name ?? null,
      profile_picture_url: warning.warnedUser.profile_picture_url
        ? (warning.warnedUser.profile_picture_url as string &
            tags.Format<"uri">)
        : null,
    },
    issuingModerator: {
      id: warning.issuingModerator.id as string & tags.Format<"uuid">,
      username: warning.issuingModerator.username,
      display_name: warning.issuingModerator.display_name,
      profile_picture_url: warning.issuingModerator.profile_picture_url
        ? (warning.issuingModerator.profile_picture_url as string &
            tags.Format<"uri">)
        : null,
      email_verified: warning.issuingModerator.email_verified,
      status: warning.issuingModerator.status,
      moderation_permissions: warning.issuingModerator.moderation_permissions,
      profile_visibility: warning.issuingModerator.profile_visibility,
      activity_visibility: warning.issuingModerator.activity_visibility,
      bio: warning.issuingModerator.bio ?? null,
      location: warning.issuingModerator.location ?? null,
      website_url: warning.issuingModerator.website_url
        ? (warning.issuingModerator.website_url as string & tags.Format<"uri">)
        : null,
      last_login_at: warning.issuingModerator.last_login_at
        ? toISOStringSafe(warning.issuingModerator.last_login_at)
        : null,
      created_at: toISOStringSafe(warning.issuingModerator.created_at),
      updated_at: toISOStringSafe(warning.issuingModerator.updated_at),
      deleted_at: warning.issuingModerator.deleted_at
        ? toISOStringSafe(warning.issuingModerator.deleted_at)
        : null,
    },
    relatedModerationAction: warning.relatedModerationAction
      ? {
          id: warning.relatedModerationAction.id as string &
            tags.Format<"uuid">,
          moderator: {
            id: warning.relatedModerationAction.moderator.id as string &
              tags.Format<"uuid">,
            username: warning.relatedModerationAction.moderator.username,
            display_name:
              warning.relatedModerationAction.moderator.display_name,
            profile_picture_url: warning.relatedModerationAction.moderator
              .profile_picture_url
              ? (warning.relatedModerationAction.moderator
                  .profile_picture_url as string & tags.Format<"uri">)
              : null,
            email_verified:
              warning.relatedModerationAction.moderator.email_verified,
            status: warning.relatedModerationAction.moderator.status,
            moderation_permissions:
              warning.relatedModerationAction.moderator.moderation_permissions,
            profile_visibility:
              warning.relatedModerationAction.moderator.profile_visibility,
            activity_visibility:
              warning.relatedModerationAction.moderator.activity_visibility,
            bio: warning.relatedModerationAction.moderator.bio ?? null,
            location:
              warning.relatedModerationAction.moderator.location ?? null,
            website_url: warning.relatedModerationAction.moderator.website_url
              ? (warning.relatedModerationAction.moderator
                  .website_url as string & tags.Format<"uri">)
              : null,
            last_login_at: warning.relatedModerationAction.moderator
              .last_login_at
              ? toISOStringSafe(
                  warning.relatedModerationAction.moderator.last_login_at,
                )
              : null,
            created_at: toISOStringSafe(
              warning.relatedModerationAction.moderator.created_at,
            ),
            updated_at: toISOStringSafe(
              warning.relatedModerationAction.moderator.updated_at,
            ),
            deleted_at: warning.relatedModerationAction.moderator.deleted_at
              ? toISOStringSafe(
                  warning.relatedModerationAction.moderator.deleted_at,
                )
              : null,
          },
          action_type: warning.relatedModerationAction.action_type,
          target_type: warning.relatedModerationAction.target_type,
          target_id: warning.relatedModerationAction.target_id as string &
            tags.Format<"uuid">,
          reason: warning.relatedModerationAction.reason,
          created_at: toISOStringSafe(
            warning.relatedModerationAction.created_at,
          ),
          updated_at: toISOStringSafe(
            warning.relatedModerationAction.updated_at,
          ),
        }
      : null,
    warning_reason: warning.warning_reason,
    warning_details: warning.warning_details,
    severity: warning.severity,
    acknowledged_at: warning.acknowledged_at
      ? toISOStringSafe(warning.acknowledged_at)
      : null,
    created_at: toISOStringSafe(warning.created_at),
    updated_at: toISOStringSafe(warning.updated_at),
    deleted_at: warning.deleted_at ? toISOStringSafe(warning.deleted_at) : null,
  };
}
