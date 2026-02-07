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
import { SuperadminPayload } from "../decorators/payload/SuperadminPayload";
import { DiscussionBoardMaintenanceScheduleTransformer } from "../transformers/DiscussionBoardMaintenanceScheduleTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function putDiscussionBoardSuperAdminMaintenanceSchedulesScheduleId(props: {
  superAdmin: SuperadminPayload;
  scheduleId: string & tags.Format<"uuid">;
  body: IDiscussionBoardMaintenanceSchedule.IUpdate;
}): Promise<IDiscussionBoardMaintenanceSchedule> {
  // Check if maintenance schedule exists
  const existingSchedule =
    await MyGlobal.prisma.discussion_board_maintenance_schedules.findUnique({
      where: { id: props.scheduleId, deleted_at: null },
      ...DiscussionBoardMaintenanceScheduleTransformer.select(),
    });
  if (!existingSchedule) {
    throw new HttpException("Maintenance schedule not found", 404);
  }
  // Validate timing constraints if both start and end times are provided
  if (props.body.scheduled_start_time && props.body.scheduled_end_time) {
    const startTime = new Date(props.body.scheduled_start_time).getTime();
    const endTime = new Date(props.body.scheduled_end_time).getTime();
    if (endTime <= startTime) {
      throw new HttpException(
        "Scheduled end time must be after scheduled start time",
        400,
      );
    }
  }
  // Validate status transitions
  if (props.body.status) {
    const validTransitions: Record<string, string[]> = {
      scheduled: ["in-progress", "cancelled"],
      "in-progress": ["completed", "cancelled"],
      completed: [],
      cancelled: [],
    };
    const currentStatus = existingSchedule.status;
    const newStatus = props.body.status;
    // Fix: Use type assertion to ensure currentStatus is a valid key
    const validTransitionsForStatus = validTransitions[currentStatus];
    if (
      currentStatus !== newStatus &&
      validTransitionsForStatus &&
      !validTransitionsForStatus.includes(newStatus)
    ) {
      throw new HttpException(
        `Invalid status transition from ${currentStatus} to ${newStatus}`,
        400,
      );
    }
  }
  // Prepare update data using object spread for conciseness
  const updateData: Prisma.discussion_board_maintenance_schedulesUpdateInput = {
    ...props.body,
    updated_at: toISOStringSafe(new Date()), // This will be converted to ISO string
  };
  // Perform the update
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
