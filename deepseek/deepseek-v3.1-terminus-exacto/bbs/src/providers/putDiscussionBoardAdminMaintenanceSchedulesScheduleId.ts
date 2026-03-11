import { IDiscussionBoardMaintenanceSchedule } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardMaintenanceSchedule";
import { IDiscussionBoardStatusType } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardStatusType";
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
  // Validate schedule exists and is active
  const existingSchedule =
    await MyGlobal.prisma.discussion_board_maintenance_schedules.findUnique({
      where: {
        id: props.scheduleId,
        deleted_at: null,
      },
    });
  if (!existingSchedule) {
    throw new HttpException("Maintenance schedule not found", 404);
  }
  // Validate date range if both dates are provided
  if (props.body.planned_start_at && props.body.planned_end_at) {
    const start = props.body.planned_start_at;
    const end = props.body.planned_end_at;
    if (start >= end) {
      throw new HttpException(
        "Planned start time must be before planned end time",
        400,
      );
    }
  }
  // Build type-safe update data
  const updateData: Prisma.discussion_board_maintenance_schedulesUpdateInput = {
    updated_at: new Date().toISOString(),
  };
  if (props.body.maintenance_type !== undefined) {
    updateData.maintenance_type = props.body.maintenance_type;
  }
  if (props.body.title !== undefined) {
    updateData.title = props.body.title;
  }
  if (props.body.description !== undefined) {
    updateData.description = props.body.description;
  }
  if (props.body.planned_start_at !== undefined) {
    updateData.planned_start_at = props.body.planned_start_at;
  }
  if (props.body.planned_end_at !== undefined) {
    updateData.planned_end_at = props.body.planned_end_at;
  }
  if (props.body.actual_start_at !== undefined) {
    updateData.actual_start_at = props.body.actual_start_at;
  }
  if (props.body.actual_end_at !== undefined) {
    updateData.actual_end_at = props.body.actual_end_at;
  }
  // Update the schedule
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
