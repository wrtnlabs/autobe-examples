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

export async function putDiscussionBoardAdministratorSuspensionsSuspensionId(props: {
  administrator: AdministratorPayload;
  suspensionId: string & tags.Format<"uuid">;
  body: IDiscussionBoardSuspension.IUpdate;
}): Promise<IDiscussionBoardSuspension> {
  const { administrator, suspensionId, body } = props;

  const existing =
    await MyGlobal.prisma.discussion_board_suspensions.findUniqueOrThrow({
      where: { id: suspensionId },
    });

  const now = toISOStringSafe(new Date());

  const updateData = {
    ...(body.suspension_reason !== undefined && {
      suspension_reason: body.suspension_reason,
    }),
    ...(body.duration_days !== undefined && {
      duration_days: body.duration_days,
    }),
    ...(body.lifted_early !== undefined && { lifted_early: body.lifted_early }),
    ...(body.lifted_reason !== undefined && {
      lifted_reason: body.lifted_reason,
    }),
    administrator: { connect: { id: administrator.id } },
    updated_at: now,
    ...(body.duration_days !== undefined && {
      end_date: toISOStringSafe(
        new Date(
          new Date(existing.start_date).getTime() +
            body.duration_days * 24 * 60 * 60 * 1000,
        ),
      ),
    }),
    ...(body.lifted_early === true && {
      is_active: false,
      lifted_at: now,
    }),
  } satisfies Prisma.discussion_board_suspensionsUpdateInput;

  const updated = await MyGlobal.prisma.discussion_board_suspensions.update({
    where: { id: suspensionId },
    data: updateData,
  });

  return {
    id: updated.id,
    member_id: updated.member_id,
    moderation_action_id: updated.moderation_action_id,
    moderator_id: updated.moderator_id ?? undefined,
    administrator_id: updated.administrator_id ?? undefined,
    suspension_reason: updated.suspension_reason,
    duration_days: updated.duration_days,
    start_date: toISOStringSafe(updated.start_date),
    end_date: toISOStringSafe(updated.end_date),
    is_active: updated.is_active,
    lifted_early: updated.lifted_early,
    lifted_at: updated.lifted_at
      ? toISOStringSafe(updated.lifted_at)
      : undefined,
    lifted_reason: updated.lifted_reason ?? undefined,
    created_at: toISOStringSafe(updated.created_at),
    updated_at: toISOStringSafe(updated.updated_at),
  };
}
