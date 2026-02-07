import { IDiscussionBoardAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdmin";
import { IDiscussionBoardMaintenanceSchedule } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardMaintenanceSchedule";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { AdminPayload } from "../decorators/payload/AdminPayload";
import { DiscussionBoardMaintenanceScheduleTransformer } from "../transformers/DiscussionBoardMaintenanceScheduleTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function deleteDiscussionBoardAdminMaintenanceSchedulesScheduleId(props: {
  admin: AdminPayload;
  scheduleId: string & tags.Format<"uuid">;
}): Promise<IDiscussionBoardMaintenanceSchedule> {
  // First, check if the maintenance schedule exists and is not deleted
  const existingSchedule =
    await MyGlobal.prisma.discussion_board_maintenance_schedules.findFirst({
      where: {
        id: props.scheduleId,
        deleted_at: null,
      },
      ...DiscussionBoardMaintenanceScheduleTransformer.select(),
    });
  if (!existingSchedule) {
    throw new HttpException("Maintenance schedule not found", 404);
  }
  // Check if the schedule is currently in progress (cannot delete in-progress schedules)
  if (existingSchedule.status === "in-progress") {
    throw new HttpException(
      "Cannot delete maintenance schedule that is currently in progress",
      400,
    );
  }
  // Perform soft deletion by setting deleted_at timestamp
  const updatedSchedule =
    await MyGlobal.prisma.discussion_board_maintenance_schedules.update({
      where: { id: props.scheduleId },
      data: {
        deleted_at: toISOStringSafe(new Date()),
        updated_at: toISOStringSafe(new Date()), // Update the timestamp to reflect the deletion
      },
      ...DiscussionBoardMaintenanceScheduleTransformer.select(),
    });
  return await DiscussionBoardMaintenanceScheduleTransformer.transform(
    updatedSchedule,
  );
}
