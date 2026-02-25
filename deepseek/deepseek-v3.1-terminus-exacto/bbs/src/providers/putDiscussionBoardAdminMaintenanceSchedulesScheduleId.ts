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

export async function putDiscussionBoardAdminMaintenanceSchedulesScheduleId(props: {
  admin: AdminPayload;
  scheduleId: string & tags.Format<"uuid">;
  body: IDiscussionBoardMaintenanceSchedule.IUpdate;
}): Promise<IDiscussionBoardMaintenanceSchedule> {
  // Validate schedule exists
  const existingSchedule =
    await MyGlobal.prisma.discussion_board_maintenance_schedules.findUniqueOrThrow(
      {
        where: { id: props.scheduleId },
      },
    );
  // Check if schedule can be updated
  if (
    existingSchedule.status === "completed" ||
    existingSchedule.status === "cancelled"
  ) {
    throw new HttpException(
      "Cannot update completed or cancelled maintenance schedule",
      400,
    );
  }
  // Validate timing constraints
  if (props.body.scheduled_start_time && props.body.scheduled_end_time) {
    const startTime = new Date(props.body.scheduled_start_time);
    const endTime = new Date(props.body.scheduled_end_time);
    if (endTime <= startTime) {
      throw new HttpException(
        "Scheduled end time must be after scheduled start time",
        400,
      );
    }
  }
  // Build update data
  const currentTime = new Date().toISOString();
  const updateData: Record<string, any> = {
    updated_at: currentTime,
  };
  // Handle regular field updates
  if (props.body.maintenance_type !== undefined)
    updateData.maintenance_type = props.body.maintenance_type;
  if (props.body.description !== undefined)
    updateData.description = props.body.description;
  if (props.body.scheduled_start_time !== undefined) {
    updateData.scheduled_start_time = new Date(props.body.scheduled_start_time);
  }
  if (props.body.scheduled_end_time !== undefined) {
    updateData.scheduled_end_time = new Date(props.body.scheduled_end_time);
  }
  if (props.body.impact_level !== undefined)
    updateData.impact_level = props.body.impact_level;
  if (props.body.notes !== undefined) updateData.notes = props.body.notes;
  // Handle status transitions with proper timing
  if (props.body.status !== undefined) {
    updateData.status = props.body.status;
    if (
      props.body.status === "in-progress" &&
      existingSchedule.status !== "in-progress"
    ) {
      updateData.actual_start_time = currentTime;
      updateData.performed_by_admin_id = props.admin.id;
    } else if (
      props.body.status === "completed" &&
      existingSchedule.status !== "completed"
    ) {
      if (!existingSchedule.actual_start_time) {
        updateData.actual_start_time = currentTime;
      }
      updateData.actual_end_time = currentTime;
      updateData.performed_by_admin_id = props.admin.id;
    }
  }
  // Perform update
  await MyGlobal.prisma.discussion_board_maintenance_schedules.update({
    where: { id: props.scheduleId },
    data: updateData,
  });
  // Retrieve updated record with relations
  const updated =
    await MyGlobal.prisma.discussion_board_maintenance_schedules.findUniqueOrThrow(
      {
        where: { id: props.scheduleId },
        ...DiscussionBoardMaintenanceScheduleTransformer.select(),
      },
    );
  return await DiscussionBoardMaintenanceScheduleTransformer.transform(updated);
}
