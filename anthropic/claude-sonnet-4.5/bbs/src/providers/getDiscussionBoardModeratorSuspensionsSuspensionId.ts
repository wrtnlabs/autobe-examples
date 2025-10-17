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

export async function getDiscussionBoardModeratorSuspensionsSuspensionId(props: {
  moderator: ModeratorPayload;
  suspensionId: string & tags.Format<"uuid">;
}): Promise<IDiscussionBoardSuspension> {
  const { suspensionId } = props;

  const suspension =
    await MyGlobal.prisma.discussion_board_suspensions.findUniqueOrThrow({
      where: { id: suspensionId },
    });

  return {
    id: suspension.id,
    member_id: suspension.member_id,
    moderation_action_id: suspension.moderation_action_id,
    moderator_id:
      suspension.moderator_id !== null ? suspension.moderator_id : undefined,
    administrator_id:
      suspension.administrator_id !== null
        ? suspension.administrator_id
        : undefined,
    suspension_reason: suspension.suspension_reason,
    duration_days: suspension.duration_days,
    start_date: toISOStringSafe(suspension.start_date),
    end_date: toISOStringSafe(suspension.end_date),
    is_active: suspension.is_active,
    lifted_early: suspension.lifted_early,
    lifted_at: suspension.lifted_at
      ? toISOStringSafe(suspension.lifted_at)
      : undefined,
    lifted_reason:
      suspension.lifted_reason !== null ? suspension.lifted_reason : undefined,
    created_at: toISOStringSafe(suspension.created_at),
    updated_at: toISOStringSafe(suspension.updated_at),
  };
}
