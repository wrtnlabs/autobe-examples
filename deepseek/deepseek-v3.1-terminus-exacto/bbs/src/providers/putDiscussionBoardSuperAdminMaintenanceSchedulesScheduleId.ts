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
import { SuperAdminPayload } from "../decorators/payload/SuperAdminPayload";
import { DiscussionBoardMaintenanceScheduleTransformer } from "../transformers/DiscussionBoardMaintenanceScheduleTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function putDiscussionBoardSuperAdminMaintenanceSchedulesScheduleId(props: {
  superAdmin: SuperAdminPayload;
  scheduleId: string & tags.Format<"uuid">;
  body: IDiscussionBoardMaintenanceSchedule.IUpdate;
}): Promise<IDiscussionBoardMaintenanceSchedule> {
  // Verify the schedule exists and is not completed/cancelled
  const existing =
    await MyGlobal.prisma.discussion_board_maintenance_schedules.findUniqueOrThrow(
      {
        where: { id: props.scheduleId },
      },
    );
  if (existing.status === "completed" || existing.status === "cancelled") {
    throw new HttpException(
      "Cannot update completed or cancelled maintenance schedule",
      400,
    );
  }
  // Validate datetime strings directly from body
  const validatedStartTime = props.body.scheduled_start_time;
  const validatedEndTime = props.body.scheduled_end_time;
  // Build update data witproper date handling
  const updateData: Prisma.discussion_board_maintenance_schedulesUpdateInput = {
    updated_at: toISOStringSafe(new Date()),
  };
  // Update fields with proper validation
  if (props.body.maintenance_type !== undefined) {
    updateData.maintenance_type = props.body.maintenance_type;
  }
  if (props.body.description !== undefined) {
    updateData.description = props.body.description;
  }
  if (validatedStartTime !== undefined) {
    updateData.scheduled_start_time = new Date(validatedStartTime);
  }
  if (validatedEndTime !== undefined) {
    updateData.scheduled_end_time = new Date(validatedEndTime);
  }
  if (props.body.impact_level !== undefined) {
    updateData.impact_level = props.body.impact_level;
  }
  if (props.body.notes !== undefined) {
    updateData.notes = props.body.notes;
  }
  // Handle status transitions with proper validation
  if (props.body.status !== undefined) {
    updateData.status = props.body.status;
    // Status transition validation
    if (
      props.body.status === "in-progress" &&
      existing.status === "scheduled"
    ) {
      // When starting maintenance, use current time for actual start
      updateData.actual_start_time = new Date();
      updateData.performedByAdmin = { connect: { id: props.superAdmin.id } };
    }
    if (
      props.body.status === "completed" &&
      ["scheduled", "in-progress"].includes(existing.status)
    ) {
      // When completing maintenance, use current time for actual end
      updateData.actual_end_time = new Date();
      // Calculate actual duration
      const startTime = existing.actual_start_time || new Date();
      const endTime = new Date();
      const duration = Math.round(
        (endTime.getTime() - startTime.getTime()) / (1000 * 60),
      );
      updateData.actual_duration_minutes = duration;
      if (!existing.performed_by_admin_id) {
        updateData.performedByAdmin = { connect: { id: props.superAdmin.id } };
      }
    }
  }
  // Perform update
  await MyGlobal.prisma.discussion_board_maintenance_schedules.update({
    where: { id: props.scheduleId },
    data: updateData,
  });
  // Return updated record
  const updated =
    await MyGlobal.prisma.discussion_board_maintenance_schedules.findUniqueOrThrow(
      {
        where: { id: props.scheduleId },
        ...DiscussionBoardMaintenanceScheduleTransformer.select(),
      },
    );
  return DiscussionBoardMaintenanceScheduleTransformer.transform(updated);
}
