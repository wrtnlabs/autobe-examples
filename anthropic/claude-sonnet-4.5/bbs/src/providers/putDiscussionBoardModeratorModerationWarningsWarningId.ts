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

export async function putDiscussionBoardModeratorModerationWarningsWarningId(props: {
  moderator: ModeratorPayload;
  warningId: string & tags.Format<"uuid">;
  body: IDiscussionBoardUserWarning.IUpdate;
}): Promise<IDiscussionBoardUserWarning> {
  const { moderator, warningId, body } = props;

  const updated = await MyGlobal.prisma.discussion_board_user_warnings.update({
    where: { id: warningId },
    data: {
      warning_reason: body.warning_reason ?? undefined,
      warning_details: body.warning_details ?? undefined,
      severity: body.severity ?? undefined,
      updated_at: toISOStringSafe(new Date()),
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

  return {
    id: updated.id as string & tags.Format<"uuid">,
    discussion_board_member_id: updated.discussion_board_member_id as string &
      tags.Format<"uuid">,
    discussion_board_moderator_id:
      updated.discussion_board_moderator_id as string & tags.Format<"uuid">,
    related_moderation_action_id:
      updated.related_moderation_action_id === null
        ? null
        : (updated.related_moderation_action_id as string &
            tags.Format<"uuid">),
    warnedUser: {
      id: updated.warnedUser.id as string & tags.Format<"uuid">,
      username: updated.warnedUser.username,
      display_name:
        updated.warnedUser.display_name === null
          ? undefined
          : updated.warnedUser.display_name,
      profile_picture_url:
        updated.warnedUser.profile_picture_url === null
          ? undefined
          : (updated.warnedUser.profile_picture_url as string &
              tags.Format<"uri">),
    },
    issuingModerator: {
      id: updated.issuingModerator.id as string & tags.Format<"uuid">,
      username: updated.issuingModerator.username,
      display_name: updated.issuingModerator.display_name,
      profile_picture_url:
        updated.issuingModerator.profile_picture_url === null
          ? null
          : (updated.issuingModerator.profile_picture_url as string &
              tags.Format<"uri">),
      email_verified: updated.issuingModerator.email_verified,
      status: updated.issuingModerator.status,
      moderation_permissions: updated.issuingModerator.moderation_permissions,
      profile_visibility: updated.issuingModerator.profile_visibility,
      activity_visibility: updated.issuingModerator.activity_visibility,
      bio:
        updated.issuingModerator.bio === null
          ? undefined
          : updated.issuingModerator.bio,
      location:
        updated.issuingModerator.location === null
          ? undefined
          : updated.issuingModerator.location,
      website_url:
        updated.issuingModerator.website_url === null
          ? undefined
          : (updated.issuingModerator.website_url as string &
              tags.Format<"uri">),
      last_login_at:
        updated.issuingModerator.last_login_at === null
          ? undefined
          : toISOStringSafe(updated.issuingModerator.last_login_at),
      created_at: toISOStringSafe(updated.issuingModerator.created_at),
      updated_at: toISOStringSafe(updated.issuingModerator.updated_at),
      deleted_at:
        updated.issuingModerator.deleted_at === null
          ? undefined
          : toISOStringSafe(updated.issuingModerator.deleted_at),
    },
    relatedModerationAction:
      updated.relatedModerationAction === null
        ? null
        : {
            id: updated.relatedModerationAction.id as string &
              tags.Format<"uuid">,
            moderator: {
              id: updated.relatedModerationAction.moderator.id as string &
                tags.Format<"uuid">,
              username: updated.relatedModerationAction.moderator.username,
              display_name:
                updated.relatedModerationAction.moderator.display_name,
              profile_picture_url:
                updated.relatedModerationAction.moderator
                  .profile_picture_url === null
                  ? null
                  : (updated.relatedModerationAction.moderator
                      .profile_picture_url as string & tags.Format<"uri">),
              email_verified:
                updated.relatedModerationAction.moderator.email_verified,
              status: updated.relatedModerationAction.moderator.status,
              moderation_permissions:
                updated.relatedModerationAction.moderator
                  .moderation_permissions,
              profile_visibility:
                updated.relatedModerationAction.moderator.profile_visibility,
              activity_visibility:
                updated.relatedModerationAction.moderator.activity_visibility,
              bio:
                updated.relatedModerationAction.moderator.bio === null
                  ? undefined
                  : updated.relatedModerationAction.moderator.bio,
              location:
                updated.relatedModerationAction.moderator.location === null
                  ? undefined
                  : updated.relatedModerationAction.moderator.location,
              website_url:
                updated.relatedModerationAction.moderator.website_url === null
                  ? undefined
                  : (updated.relatedModerationAction.moderator
                      .website_url as string & tags.Format<"uri">),
              last_login_at:
                updated.relatedModerationAction.moderator.last_login_at === null
                  ? undefined
                  : toISOStringSafe(
                      updated.relatedModerationAction.moderator.last_login_at,
                    ),
              created_at: toISOStringSafe(
                updated.relatedModerationAction.moderator.created_at,
              ),
              updated_at: toISOStringSafe(
                updated.relatedModerationAction.moderator.updated_at,
              ),
              deleted_at:
                updated.relatedModerationAction.moderator.deleted_at === null
                  ? undefined
                  : toISOStringSafe(
                      updated.relatedModerationAction.moderator.deleted_at,
                    ),
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
          },
    warning_reason: updated.warning_reason,
    warning_details: updated.warning_details,
    severity: updated.severity,
    acknowledged_at:
      updated.acknowledged_at === null
        ? null
        : toISOStringSafe(updated.acknowledged_at),
    created_at: toISOStringSafe(updated.created_at),
    updated_at: toISOStringSafe(updated.updated_at),
    deleted_at:
      updated.deleted_at === null ? null : toISOStringSafe(updated.deleted_at),
  };
}
