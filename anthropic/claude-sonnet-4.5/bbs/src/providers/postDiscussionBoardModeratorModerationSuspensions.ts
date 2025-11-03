import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { IDiscussionBoardUserSuspension } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardUserSuspension";
import { IDiscussionBoardMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardMember";
import { IDiscussionBoardModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardModerator";
import { ModeratorPayload } from "../decorators/payload/ModeratorPayload";

export async function postDiscussionBoardModeratorModerationSuspensions(props: {
  moderator: ModeratorPayload;
  body: IDiscussionBoardUserSuspension.ICreate;
}): Promise<IDiscussionBoardUserSuspension> {
  const { moderator, body } = props;

  const targetMember = await MyGlobal.prisma.discussion_board_members.findFirst(
    {
      where: {
        id: body.discussion_board_member_id,
        deleted_at: null,
      },
    },
  );

  if (!targetMember) {
    throw new HttpException("Target member not found or has been deleted", 404);
  }

  const currentTime = toISOStringSafe(new Date());
  const activeSuspension =
    await MyGlobal.prisma.discussion_board_user_suspensions.findFirst({
      where: {
        discussion_board_member_id: body.discussion_board_member_id,
        suspended_at: { lte: currentTime },
        OR: [{ expires_at: null }, { expires_at: { gte: currentTime } }],
        lifted_at: null,
      },
    });

  if (activeSuspension) {
    throw new HttpException("Member already has an active suspension", 409);
  }

  const now = toISOStringSafe(new Date());
  const suspendedAtValue = body.suspended_at ?? now;
  const expiresAtValue = body.expires_at ?? null;

  const suspensionId = v4();

  const created =
    await MyGlobal.prisma.discussion_board_user_suspensions.create({
      data: {
        id: suspensionId,
        discussion_board_member_id: body.discussion_board_member_id,
        suspending_moderator_id: moderator.id,
        related_moderation_action_id: body.related_moderation_action_id ?? null,
        suspension_reason: body.suspension_reason,
        suspension_details: body.suspension_details,
        suspended_at: suspendedAtValue,
        expires_at: expiresAtValue,
        lifted_at: null,
        lifted_by_moderator_id: null,
        created_at: now,
        updated_at: now,
      },
      include: {
        suspendedUser: true,
        suspendingModerator: true,
      },
    });

  const suspendedUser = {
    id: created.suspendedUser.id,
    username: created.suspendedUser.username,
    display_name: created.suspendedUser.display_name ?? null,
    profile_picture_url: created.suspendedUser.profile_picture_url ?? null,
  } satisfies IDiscussionBoardMember.ISummary;

  const suspendingModerator = {
    id: created.suspendingModerator.id,
    username: created.suspendingModerator.username,
    display_name: created.suspendingModerator.display_name,
    profile_picture_url: created.suspendingModerator.profile_picture_url,
    email_verified: created.suspendingModerator.email_verified,
    status: created.suspendingModerator.status,
    moderation_permissions: created.suspendingModerator.moderation_permissions,
    profile_visibility: created.suspendingModerator.profile_visibility,
    activity_visibility: created.suspendingModerator.activity_visibility,
    bio: created.suspendingModerator.bio ?? null,
    location: created.suspendingModerator.location ?? null,
    website_url: created.suspendingModerator.website_url ?? null,
    last_login_at: created.suspendingModerator.last_login_at
      ? toISOStringSafe(created.suspendingModerator.last_login_at)
      : null,
    created_at: toISOStringSafe(created.suspendingModerator.created_at),
    updated_at: toISOStringSafe(created.suspendingModerator.updated_at),
    deleted_at: created.suspendingModerator.deleted_at
      ? toISOStringSafe(created.suspendingModerator.deleted_at)
      : null,
  } satisfies IDiscussionBoardModerator.ISummary;

  return {
    id: created.id,
    discussion_board_member_id: created.discussion_board_member_id,
    suspending_moderator_id: created.suspending_moderator_id,
    lifted_by_moderator_id: created.lifted_by_moderator_id ?? undefined,
    related_moderation_action_id:
      created.related_moderation_action_id ?? undefined,
    suspension_reason: created.suspension_reason,
    suspension_details: created.suspension_details,
    suspended_at: toISOStringSafe(created.suspended_at),
    expires_at: created.expires_at ? toISOStringSafe(created.expires_at) : null,
    lifted_at: created.lifted_at ? toISOStringSafe(created.lifted_at) : null,
    created_at: toISOStringSafe(created.created_at),
    updated_at: toISOStringSafe(created.updated_at),
    suspendedUser,
    suspendingModerator,
    liftingModerator: null,
  };
}
