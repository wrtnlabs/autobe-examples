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
  // Verify the maintenance schedule exists
  const existingSchedule =
    await MyGlobal.prisma.discussion_board_maintenance_schedules.findUnique({
      where: { id: props.scheduleId, deleted_at: null },
    });
  if (!existingSchedule) {
    throw new HttpException("Maintenance schedule not found", 404);
  }
  // Validate timing constraints if both start and end times are provided
  if (props.body.scheduled_start_time && props.body.scheduled_end_time) {
    if (props.body.scheduled_end_time <= props.body.scheduled_start_time) {
      throw new HttpException(
        "Scheduled end time must be after start time",
        400,
      );
    }
  }
  // Validate actual timing constraints if both actual times are provided
  if (props.body.actual_start_time && props.body.actual_end_time) {
    if (props.body.actual_end_time <= props.body.actual_start_time) {
      throw new HttpException(
        "Actual end time must be after actual start time",
        400,
      );
    }
  }
  // Build update data with proper null handling
  const updateData = {
    ...(props.body.maintenance_type !== undefined && {
      maintenance_type: props.body.maintenance_type,
    }),
    ...(props.body.description !== undefined && {
      description: props.body.description,
    }),
    ...(props.body.scheduled_start_time !== undefined && {
      scheduled_start_time: props.body.scheduled_start_time,
    }),
    ...(props.body.scheduled_end_time !== undefined && {
      scheduled_end_time: props.body.scheduled_end_time,
    }),
    ...(props.body.actual_start_time !== undefined && {
      actual_start_time: props.body.actual_start_time,
    }),
    ...(props.body.actual_end_time !== undefined && {
      actual_end_time: props.body.actual_end_time,
    }),
    ...(props.body.status !== undefined && { status: props.body.status }),
    ...(props.body.estimated_duration_minutes !== undefined && {
      estimated_duration_minutes: props.body.estimated_duration_minutes,
    }),
    ...(props.body.actual_duration_minutes !== undefined && {
      actual_duration_minutes: props.body.actual_duration_minutes,
    }),
    ...(props.body.impact_level !== undefined && {
      impact_level: props.body.impact_level,
    }),
    ...(props.body.notes !== undefined && { notes: props.body.notes }),
    updated_at: toISOStringSafe(new Date()),
  } satisfies Prisma.discussion_board_maintenance_schedulesUpdateInput;
  // Update the maintenance schedule
  const updatedSchedule =
    await MyGlobal.prisma.discussion_board_maintenance_schedules.update({
      where: { id: props.scheduleId },
      data: updateData,
      ...DiscussionBoardMaintenanceScheduleTransformer.select(),
    });
  return await DiscussionBoardMaintenanceScheduleTransformer.transform(
    updatedSchedule,
  );
}
