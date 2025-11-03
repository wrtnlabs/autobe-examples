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
import { MemberPayload } from "../decorators/payload/MemberPayload";

export async function getDiscussionBoardMemberModerationWarningsWarningId(props: {
  member: MemberPayload;
  warningId: string & tags.Format<"uuid">;
}): Promise<IDiscussionBoardUserWarning> {
  const { member, warningId } = props;

  const warning =
    await MyGlobal.prisma.discussion_board_user_warnings.findUniqueOrThrow({
      where: { id: warningId },
    });

  if (warning.discussion_board_member_id !== member.id) {
    throw new HttpException(
      "Unauthorized: You can only view your own warnings",
      403,
    );
  }

  const [warnedUser, issuingModerator, relatedModerationAction] =
    await Promise.all([
      MyGlobal.prisma.discussion_board_members.findUniqueOrThrow({
        where: { id: warning.discussion_board_member_id },
      }),
      MyGlobal.prisma.discussion_board_moderators.findUniqueOrThrow({
        where: { id: warning.discussion_board_moderator_id },
      }),
      warning.related_moderation_action_id
        ? MyGlobal.prisma.discussion_board_moderation_actions.findUnique({
            where: { id: warning.related_moderation_action_id },
            include: {
              moderator: true,
            },
          })
        : Promise.resolve(null),
    ]);

  return {
    id: warning.id,
    discussion_board_member_id: warning.discussion_board_member_id,
    discussion_board_moderator_id: warning.discussion_board_moderator_id,
    related_moderation_action_id: warning.related_moderation_action_id ?? null,
    warnedUser: {
      id: warnedUser.id,
      username: warnedUser.username,
      display_name: warnedUser.display_name ?? null,
      profile_picture_url: warnedUser.profile_picture_url ?? null,
    },
    issuingModerator: {
      id: issuingModerator.id,
      username: issuingModerator.username,
      display_name: issuingModerator.display_name,
      profile_picture_url: issuingModerator.profile_picture_url,
      email_verified: issuingModerator.email_verified,
      status: issuingModerator.status,
      moderation_permissions: issuingModerator.moderation_permissions,
      profile_visibility: issuingModerator.profile_visibility,
      activity_visibility: issuingModerator.activity_visibility,
      bio: issuingModerator.bio ?? null,
      location: issuingModerator.location ?? null,
      website_url: issuingModerator.website_url ?? null,
      last_login_at: issuingModerator.last_login_at
        ? toISOStringSafe(issuingModerator.last_login_at)
        : null,
      created_at: toISOStringSafe(issuingModerator.created_at),
      updated_at: toISOStringSafe(issuingModerator.updated_at),
      deleted_at: issuingModerator.deleted_at
        ? toISOStringSafe(issuingModerator.deleted_at)
        : null,
    },
    relatedModerationAction: relatedModerationAction
      ? {
          id: relatedModerationAction.id,
          moderator: {
            id: relatedModerationAction.moderator.id,
            username: relatedModerationAction.moderator.username,
            display_name: relatedModerationAction.moderator.display_name,
            profile_picture_url:
              relatedModerationAction.moderator.profile_picture_url,
            email_verified: relatedModerationAction.moderator.email_verified,
            status: relatedModerationAction.moderator.status,
            moderation_permissions:
              relatedModerationAction.moderator.moderation_permissions,
            profile_visibility:
              relatedModerationAction.moderator.profile_visibility,
            activity_visibility:
              relatedModerationAction.moderator.activity_visibility,
            bio: relatedModerationAction.moderator.bio ?? null,
            location: relatedModerationAction.moderator.location ?? null,
            website_url: relatedModerationAction.moderator.website_url ?? null,
            last_login_at: relatedModerationAction.moderator.last_login_at
              ? toISOStringSafe(relatedModerationAction.moderator.last_login_at)
              : null,
            created_at: toISOStringSafe(
              relatedModerationAction.moderator.created_at,
            ),
            updated_at: toISOStringSafe(
              relatedModerationAction.moderator.updated_at,
            ),
            deleted_at: relatedModerationAction.moderator.deleted_at
              ? toISOStringSafe(relatedModerationAction.moderator.deleted_at)
              : null,
          },
          action_type: relatedModerationAction.action_type,
          target_type: relatedModerationAction.target_type,
          target_id: relatedModerationAction.target_id,
          reason: relatedModerationAction.reason,
          created_at: toISOStringSafe(relatedModerationAction.created_at),
          updated_at: toISOStringSafe(relatedModerationAction.updated_at),
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
