import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { SuperadminPayload } from "../decorators/payload/SuperadminPayload";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function deleteDiscussionBoardSuperAdminMaintenanceSchedulesScheduleId(props: {
  superAdmin: SuperadminPayload;
  scheduleId: string & tags.Format<"uuid">;
}): Promise<void> {
  // First, verify the maintenance schedule exists and is not already deleted
  const schedule =
    await MyGlobal.prisma.discussion_board_maintenance_schedules.findUniqueOrThrow(
      {
        where: { id: props.scheduleId },
        select: { id: true, deleted_at: true },
      },
    );
  // Check if the schedule is already deleted
  if (schedule.deleted_at !== null) {
    throw new HttpException("Maintenance schedule already deleted", 400);
  }
  // Perform soft deletion by setting deleted_at timestamp
  await MyGlobal.prisma.discussion_board_maintenance_schedules.update({
    where: { id: props.scheduleId },
    data: {
      deleted_at: new Date(),
    },
  });
}
