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

export async function getDiscussionBoardModerationWarningsWarningId(props: {
  member: MemberPayload;
  warningId: string & tags.Format<"uuid">;
}): Promise<IDiscussionBoardUserWarning> {
  const { member, warningId } = props;

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

  if (warning.discussion_board_member_id !== member.id) {
    throw new HttpException(
      "Unauthorized: You can only view your own warnings",
      403,
    );
  }

  const warnedUserSummary: IDiscussionBoardMember.ISummary = {
    id: warning.warnedUser.id,
    username: warning.warnedUser.username,
    display_name: warning.warnedUser.display_name ?? undefined,
    profile_picture_url: warning.warnedUser.profile_picture_url ?? undefined,
  };

  const issuingModeratorSummary: IDiscussionBoardModerator.ISummary = {
    id: warning.issuingModerator.id,
    username: warning.issuingModerator.username,
    display_name: warning.issuingModerator.display_name,
    profile_picture_url: warning.issuingModerator.profile_picture_url,
    email_verified: warning.issuingModerator.email_verified,
    status: warning.issuingModerator.status,
    moderation_permissions: warning.issuingModerator.moderation_permissions,
    profile_visibility: warning.issuingModerator.profile_visibility,
    activity_visibility: warning.issuingModerator.activity_visibility,
    bio: warning.issuingModerator.bio ?? undefined,
    location: warning.issuingModerator.location ?? undefined,
    website_url: warning.issuingModerator.website_url ?? undefined,
    last_login_at: warning.issuingModerator.last_login_at
      ? toISOStringSafe(warning.issuingModerator.last_login_at)
      : undefined,
    created_at: toISOStringSafe(warning.issuingModerator.created_at),
    updated_at: toISOStringSafe(warning.issuingModerator.updated_at),
    deleted_at: warning.issuingModerator.deleted_at
      ? toISOStringSafe(warning.issuingModerator.deleted_at)
      : undefined,
  };

  let relatedModerationActionSummary: IDiscussionBoardModerationAction.ISummary | null =
    null;
  if (warning.relatedModerationAction) {
    const action = warning.relatedModerationAction;

    const actionModeratorSummary: IDiscussionBoardModerator.ISummary = {
      id: action.moderator.id,
      username: action.moderator.username,
      display_name: action.moderator.display_name,
      profile_picture_url: action.moderator.profile_picture_url,
      email_verified: action.moderator.email_verified,
      status: action.moderator.status,
      moderation_permissions: action.moderator.moderation_permissions,
      profile_visibility: action.moderator.profile_visibility,
      activity_visibility: action.moderator.activity_visibility,
      bio: action.moderator.bio ?? undefined,
      location: action.moderator.location ?? undefined,
      website_url: action.moderator.website_url ?? undefined,
      last_login_at: action.moderator.last_login_at
        ? toISOStringSafe(action.moderator.last_login_at)
        : undefined,
      created_at: toISOStringSafe(action.moderator.created_at),
      updated_at: toISOStringSafe(action.moderator.updated_at),
      deleted_at: action.moderator.deleted_at
        ? toISOStringSafe(action.moderator.deleted_at)
        : undefined,
    };

    relatedModerationActionSummary = {
      id: action.id,
      moderator: actionModeratorSummary,
      action_type: action.action_type,
      target_type: action.target_type,
      target_id: action.target_id,
      reason: action.reason,
      created_at: toISOStringSafe(action.created_at),
      updated_at: toISOStringSafe(action.updated_at),
    };
  }

  return {
    id: warning.id,
    discussion_board_member_id: warning.discussion_board_member_id,
    discussion_board_moderator_id: warning.discussion_board_moderator_id,
    related_moderation_action_id:
      warning.related_moderation_action_id ?? undefined,
    warnedUser: warnedUserSummary,
    issuingModerator: issuingModeratorSummary,
    relatedModerationAction: relatedModerationActionSummary,
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
