import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { IDiscussionBoardAppeal } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAppeal";
import { MemberPayload } from "../decorators/payload/MemberPayload";

export async function postDiscussionBoardMemberAppeals(props: {
  member: MemberPayload;
  body: IDiscussionBoardAppeal.ICreate;
}): Promise<IDiscussionBoardAppeal> {
  const { member, body } = props;

  const hasAppealedEntity =
    (body.appealed_moderation_action_id !== undefined &&
      body.appealed_moderation_action_id !== null) ||
    (body.appealed_warning_id !== undefined &&
      body.appealed_warning_id !== null) ||
    (body.appealed_suspension_id !== undefined &&
      body.appealed_suspension_id !== null) ||
    (body.appealed_ban_id !== undefined && body.appealed_ban_id !== null);

  if (!hasAppealedEntity) {
    throw new HttpException(
      "At least one appealed entity must be specified (moderation action, warning, suspension, or ban)",
      400,
    );
  }

  const appealedEntityCount = [
    body.appealed_moderation_action_id,
    body.appealed_warning_id,
    body.appealed_suspension_id,
    body.appealed_ban_id,
  ].filter((id) => id !== undefined && id !== null).length;

  if (appealedEntityCount > 1) {
    throw new HttpException(
      "Only one appealed entity can be specified per appeal",
      400,
    );
  }

  let targetMemberId: string;
  let actionCreatedAt: string & tags.Format<"date-time">;

  if (
    body.appealed_moderation_action_id !== undefined &&
    body.appealed_moderation_action_id !== null
  ) {
    const moderationAction =
      await MyGlobal.prisma.discussion_board_moderation_actions.findUnique({
        where: { id: body.appealed_moderation_action_id },
      });

    if (!moderationAction) {
      throw new HttpException("Moderation action not found", 404);
    }

    targetMemberId = moderationAction.target_member_id;
    actionCreatedAt = toISOStringSafe(moderationAction.created_at);
  } else if (
    body.appealed_warning_id !== undefined &&
    body.appealed_warning_id !== null
  ) {
    const warning = await MyGlobal.prisma.discussion_board_warnings.findUnique({
      where: { id: body.appealed_warning_id },
    });

    if (!warning) {
      throw new HttpException("Warning not found", 404);
    }

    targetMemberId = warning.member_id;
    actionCreatedAt = toISOStringSafe(warning.created_at);
  } else if (
    body.appealed_suspension_id !== undefined &&
    body.appealed_suspension_id !== null
  ) {
    const suspension =
      await MyGlobal.prisma.discussion_board_suspensions.findUnique({
        where: { id: body.appealed_suspension_id },
      });

    if (!suspension) {
      throw new HttpException("Suspension not found", 404);
    }

    targetMemberId = suspension.member_id;
    actionCreatedAt = toISOStringSafe(suspension.created_at);
  } else if (
    body.appealed_ban_id !== undefined &&
    body.appealed_ban_id !== null
  ) {
    const ban = await MyGlobal.prisma.discussion_board_bans.findUnique({
      where: { id: body.appealed_ban_id },
    });

    if (!ban) {
      throw new HttpException("Ban not found", 404);
    }

    if (!ban.is_appealable) {
      throw new HttpException("This ban is not appealable", 403);
    }

    targetMemberId = ban.member_id;
    actionCreatedAt = toISOStringSafe(ban.created_at);
  } else {
    throw new HttpException("Invalid appeal request", 400);
  }

  if (targetMemberId !== member.id) {
    throw new HttpException(
      "Unauthorized: You can only appeal moderation actions against your own account",
      403,
    );
  }

  const appealWindowMs = 30 * 24 * 60 * 60 * 1000;
  const actionDate = new Date(actionCreatedAt).getTime();
  const currentTime = new Date().getTime();

  if (currentTime - actionDate > appealWindowMs) {
    throw new HttpException(
      "Appeal window has closed (30 days from moderation action)",
      400,
    );
  }

  const existingAppeal =
    await MyGlobal.prisma.discussion_board_appeals.findFirst({
      where: {
        member_id: member.id,
        ...(body.appealed_moderation_action_id !== undefined &&
          body.appealed_moderation_action_id !== null && {
            appealed_moderation_action_id: body.appealed_moderation_action_id,
          }),
        ...(body.appealed_warning_id !== undefined &&
          body.appealed_warning_id !== null && {
            appealed_warning_id: body.appealed_warning_id,
          }),
        ...(body.appealed_suspension_id !== undefined &&
          body.appealed_suspension_id !== null && {
            appealed_suspension_id: body.appealed_suspension_id,
          }),
        ...(body.appealed_ban_id !== undefined &&
          body.appealed_ban_id !== null && {
            appealed_ban_id: body.appealed_ban_id,
          }),
      },
    });

  if (existingAppeal) {
    throw new HttpException(
      "You have already submitted an appeal for this decision",
      409,
    );
  }

  const activeAppealsCount =
    await MyGlobal.prisma.discussion_board_appeals.count({
      where: {
        member_id: member.id,
        status: "pending_review",
      },
    });

  if (activeAppealsCount >= 5) {
    throw new HttpException(
      "Maximum of 5 active appeals reached. Please wait for existing appeals to be resolved.",
      400,
    );
  }

  const now = toISOStringSafe(new Date());

  const created = await MyGlobal.prisma.discussion_board_appeals.create({
    data: {
      id: v4(),
      member_id: member.id,
      appealed_moderation_action_id:
        body.appealed_moderation_action_id === null ||
        body.appealed_moderation_action_id === undefined
          ? null
          : body.appealed_moderation_action_id,
      appealed_warning_id:
        body.appealed_warning_id === null ||
        body.appealed_warning_id === undefined
          ? null
          : body.appealed_warning_id,
      appealed_suspension_id:
        body.appealed_suspension_id === null ||
        body.appealed_suspension_id === undefined
          ? null
          : body.appealed_suspension_id,
      appealed_ban_id:
        body.appealed_ban_id === null || body.appealed_ban_id === undefined
          ? null
          : body.appealed_ban_id,
      reviewing_administrator_id: null,
      appeal_explanation: body.appeal_explanation,
      additional_evidence:
        body.additional_evidence === undefined
          ? null
          : body.additional_evidence,
      status: "pending_review",
      decision: null,
      decision_reasoning: null,
      corrective_action_taken: null,
      submitted_at: now,
      reviewed_at: null,
      created_at: now,
      updated_at: now,
    },
  });

  return {
    id: created.id,
    appeal_explanation: created.appeal_explanation,
    additional_evidence:
      created.additional_evidence === null
        ? undefined
        : created.additional_evidence,
    status: created.status,
    decision: created.decision === null ? undefined : created.decision,
    decision_reasoning:
      created.decision_reasoning === null
        ? undefined
        : created.decision_reasoning,
    corrective_action_taken:
      created.corrective_action_taken === null
        ? undefined
        : created.corrective_action_taken,
    submitted_at: now,
    reviewed_at: undefined,
    created_at: now,
    updated_at: now,
  };
}
