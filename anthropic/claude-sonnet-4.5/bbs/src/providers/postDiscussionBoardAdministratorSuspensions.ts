import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { IDiscussionBoardSuspension } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardSuspension";
import { AdministratorPayload } from "../decorators/payload/AdministratorPayload";

export async function postDiscussionBoardAdministratorSuspensions(props: {
  administrator: AdministratorPayload;
  body: IDiscussionBoardSuspension.ICreate;
}): Promise<IDiscussionBoardSuspension> {
  const { administrator, body } = props;

  const member = await MyGlobal.prisma.discussion_board_members.findFirst({
    where: {
      id: body.member_id,
      deleted_at: null,
    },
  });

  if (!member) {
    throw new HttpException("Member not found or already deleted", 404);
  }

  if (member.account_status === "banned") {
    throw new HttpException("Cannot suspend a banned member", 400);
  }

  const suspensionId = v4();
  const moderationActionId = v4();

  const now = toISOStringSafe(new Date());
  const startDate = new Date();
  const endDate = new Date(startDate);
  endDate.setDate(endDate.getDate() + body.duration_days);
  const endDateString = toISOStringSafe(endDate);

  await MyGlobal.prisma.discussion_board_moderation_actions.create({
    data: {
      id: moderationActionId,
      moderator_id: null,
      administrator_id: administrator.id,
      target_member_id: body.member_id,
      related_report_id: null,
      content_topic_id: null,
      content_reply_id: null,
      action_type: "suspend_user",
      reason: body.suspension_reason,
      violation_category: null,
      content_snapshot: null,
      is_reversed: false,
      reversed_at: null,
      reversal_reason: null,
      created_at: now,
      updated_at: now,
    },
  });

  const created = await MyGlobal.prisma.discussion_board_suspensions.create({
    data: {
      id: suspensionId,
      member_id: body.member_id,
      moderation_action_id: moderationActionId,
      moderator_id: null,
      administrator_id: administrator.id,
      suspension_reason: body.suspension_reason,
      duration_days: body.duration_days,
      start_date: now,
      end_date: endDateString,
      is_active: true,
      lifted_early: false,
      lifted_at: null,
      lifted_reason: null,
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
    id: created.id,
    member_id: created.member_id,
    moderation_action_id: created.moderation_action_id,
    moderator_id: created.moderator_id ?? undefined,
    administrator_id: created.administrator_id ?? undefined,
    suspension_reason: created.suspension_reason,
    duration_days: created.duration_days,
    start_date: toISOStringSafe(created.start_date),
    end_date: toISOStringSafe(created.end_date),
    is_active: created.is_active,
    lifted_early: created.lifted_early,
    lifted_at: created.lifted_at
      ? toISOStringSafe(created.lifted_at)
      : undefined,
    lifted_reason: created.lifted_reason ?? undefined,
    created_at: toISOStringSafe(created.created_at),
    updated_at: toISOStringSafe(created.updated_at),
  };
}
