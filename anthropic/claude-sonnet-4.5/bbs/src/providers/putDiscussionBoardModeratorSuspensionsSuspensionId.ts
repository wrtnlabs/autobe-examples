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

export async function putDiscussionBoardModeratorSuspensionsSuspensionId(props: {
  moderator: ModeratorPayload;
  suspensionId: string & tags.Format<"uuid">;
  body: IDiscussionBoardSuspension.IUpdate;
}): Promise<IDiscussionBoardSuspension> {
  const { moderator, suspensionId, body } = props;

  const existingSuspension =
    await MyGlobal.prisma.discussion_board_suspensions.findUnique({
      where: { id: suspensionId },
    });

  if (!existingSuspension) {
    throw new HttpException("Suspension not found", 404);
  }

  const now = toISOStringSafe(new Date());

  let endDateCalculated: string | undefined = undefined;
  if (body.duration_days !== undefined) {
    const startDate = new Date(existingSuspension.start_date);
    const newEndDate = new Date(
      startDate.getTime() + body.duration_days * 24 * 60 * 60 * 1000,
    );
    endDateCalculated = toISOStringSafe(newEndDate);
  }

  const updated = await MyGlobal.prisma.discussion_board_suspensions.update({
    where: { id: suspensionId },
    data: {
      suspension_reason: body.suspension_reason ?? undefined,
      duration_days: body.duration_days ?? undefined,
      end_date: endDateCalculated ?? undefined,
      lifted_early: body.lifted_early ?? undefined,
      is_active: body.lifted_early === true ? false : undefined,
      lifted_at: body.lifted_early === true ? now : undefined,
      lifted_reason: body.lifted_reason ?? undefined,
      updated_at: now,
    },
  });

  return {
    id: updated.id,
    member_id: updated.member_id,
    moderation_action_id: updated.moderation_action_id,
    moderator_id:
      updated.moderator_id === null ? undefined : updated.moderator_id,
    administrator_id:
      updated.administrator_id === null ? undefined : updated.administrator_id,
    suspension_reason: updated.suspension_reason,
    duration_days: updated.duration_days,
    start_date: toISOStringSafe(updated.start_date),
    end_date: toISOStringSafe(updated.end_date),
    is_active: updated.is_active,
    lifted_early: updated.lifted_early,
    lifted_at:
      updated.lifted_at === null
        ? undefined
        : toISOStringSafe(updated.lifted_at),
    lifted_reason:
      updated.lifted_reason === null ? undefined : updated.lifted_reason,
    created_at: toISOStringSafe(updated.created_at),
    updated_at: toISOStringSafe(updated.updated_at),
  };
}
