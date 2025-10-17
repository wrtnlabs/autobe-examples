import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { IDiscussionBoardSuspension } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardSuspension";
import { ModeratorPayload } from "../decorators/payload/ModeratorPayload";

export async function postDiscussionBoardModeratorSuspensions(props: {
  moderator: ModeratorPayload;
  body: IDiscussionBoardSuspension.ICreate;
}): Promise<IDiscussionBoardSuspension> {
  const { moderator, body } = props;

  if (body.duration_days < 1 || body.duration_days > 30) {
    throw new HttpException(
      "Suspension duration must be between 1 and 30 days for moderators",
      400,
    );
  }

  const targetMember = await MyGlobal.prisma.discussion_board_members.findFirst(
    {
      where: {
        id: body.member_id,
        deleted_at: null,
      },
    },
  );

  if (!targetMember) {
    throw new HttpException("Target member not found", 404);
  }

  if (targetMember.account_status === "suspended") {
    throw new HttpException("Member is already suspended", 400);
  }

  if (targetMember.account_status === "banned") {
    throw new HttpException("Cannot suspend a banned member", 400);
  }

  const moderatorRecord =
    await MyGlobal.prisma.discussion_board_moderators.findFirst({
      where: {
        id: moderator.id,
        is_active: true,
        account_status: "active",
        deleted_at: null,
      },
    });

  if (!moderatorRecord) {
    throw new HttpException("Moderator not found or inactive", 403);
  }

  const now = toISOStringSafe(new Date());
  const endDate = new Date();
  endDate.setDate(endDate.getDate() + body.duration_days);
  const endDateString = toISOStringSafe(endDate);

  const moderationActionId = v4();
  const suspensionId = v4();

  await MyGlobal.prisma.discussion_board_moderation_actions.create({
    data: {
      id: moderationActionId,
      moderator_id: moderator.id,
      target_member_id: body.member_id,
      action_type: "suspend_user",
      reason: body.suspension_reason,
      is_reversed: false,
      created_at: now,
      updated_at: now,
    },
  });

  await MyGlobal.prisma.discussion_board_suspensions.create({
    data: {
      id: suspensionId,
      member_id: body.member_id,
      moderation_action_id: moderationActionId,
      moderator_id: moderator.id,
      suspension_reason: body.suspension_reason,
      duration_days: body.duration_days,
      start_date: now,
      end_date: endDateString,
      is_active: true,
      lifted_early: false,
      created_at: now,
      updated_at: now,
    },
  });

  await MyGlobal.prisma.discussion_board_members.update({
    where: { id: body.member_id },
    data: {
      account_status: "suspended",
      updated_at: now,
    },
  });

  await MyGlobal.prisma.discussion_board_sessions.updateMany({
    where: {
      discussion_board_member_id: body.member_id,
      is_active: true,
    },
    data: {
      is_active: false,
      revoked_at: now,
    },
  });

  return {
    id: suspensionId,
    member_id: body.member_id,
    moderation_action_id: moderationActionId,
    moderator_id: moderator.id,
    administrator_id: undefined,
    suspension_reason: body.suspension_reason,
    duration_days: body.duration_days,
    start_date: now,
    end_date: endDateString,
    is_active: true,
    lifted_early: false,
    lifted_at: undefined,
    lifted_reason: undefined,
    created_at: now,
    updated_at: now,
  };
}
