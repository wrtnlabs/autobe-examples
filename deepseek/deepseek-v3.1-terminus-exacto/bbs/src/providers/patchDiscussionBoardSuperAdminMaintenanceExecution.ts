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
import { SuperadminPayload } from "../decorators/payload/SuperadminPayload";
import { DiscussionBoardMaintenanceScheduleTransformer } from "../transformers/DiscussionBoardMaintenanceScheduleTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function patchDiscussionBoardSuperAdminMaintenanceExecution(props: {
  superAdmin: SuperadminPayload;
  body: IDiscussionBoardMaintenanceSchedule.IUpdate;
}): Promise<IDiscussionBoardMaintenanceSchedule> {
  // First, find a maintenance schedule that needs execution update
  // Look for schedules that are scheduled (actual_start_at is null) and planned start has passed
  // Or schedules that are in progress (actual_start_at not null, actual_end_at is null)
  const now = new Date().toISOString();
  const scheduledSchedule =
    await MyGlobal.prisma.discussion_board_maintenance_schedules.findFirst({
      where: {
        actual_start_at: null,
        planned_start_at: { lte: now },
        deleted_at: null,
      },
      orderBy: { planned_start_at: "desc" },
    });
  const inProgressSchedule =
    await MyGlobal.prisma.discussion_board_maintenance_schedules.findFirst({
      where: {
        actual_start_at: { not: null },
        actual_end_at: null,
        deleted_at: null,
      },
      orderBy: { actual_start_at: "desc" },
    });
  const scheduleId = scheduledSchedule?.id ?? inProgressSchedule?.id;
  if (!scheduleId) {
    throw new HttpException(
      "No maintenance schedule requires execution update",
      404,
    );
  }
  // Fetch current schedule with transformer select for later use
  const current =
    await MyGlobal.prisma.discussion_board_maintenance_schedules.findUniqueOrThrow(
      {
        where: { id: scheduleId },
        ...DiscussionBoardMaintenanceScheduleTransformer.select(),
      },
    );
  // Determine which status type to set based on update
  let newStatusTypeId: string | null = null;
  // Check if we're starting execution (setting actual_start_at for the first time)
  const isStartingExecution =
    props.body.actual_start_at !== undefined &&
    current.actual_start_at === null &&
    props.body.actual_start_at !== null;
  // Check if we're completing execution (setting actual_end_at for the first time)
  const isCompletingExecution =
    props.body.actual_end_at !== undefined &&
    current.actual_end_at === null &&
    props.body.actual_end_at !== null;
  // Find appropriate status types
  if (isStartingExecution) {
    // Find 'in_progress' status type for maintenance schedules
    const inProgressStatus =
      await MyGlobal.prisma.discussion_board_status_types.findFirst({
        where: {
          category: "maintenance_schedule",
          code: "in_progress",
          is_active: true,
          deleted_at: null,
        },
      });
    if (inProgressStatus) {
      newStatusTypeId = inProgressStatus.id;
    }
  } else if (isCompletingExecution) {
    // Find 'completed' status type for maintenance schedules
    const completedStatus =
      await MyGlobal.prisma.discussion_board_status_types.findFirst({
        where: {
          category: "maintenance_schedule",
          code: "completed",
          is_active: true,
          deleted_at: null,
        },
      });
    if (completedStatus) {
      newStatusTypeId = completedStatus.id;
    }
  }
  // Validate timestamp logic
  if (
    props.body.actual_start_at !== undefined &&
    props.body.actual_end_at !== undefined
  ) {
    if (
      props.body.actual_start_at !== null &&
      props.body.actual_end_at !== null
    ) {
      const startDate = new Date(props.body.actual_start_at);
      const endDate = new Date(props.body.actual_end_at);
      if (startDate > endDate) {
        throw new HttpException(
          "actual_start_at must be before actual_end_at",
          400,
        );
      }
    }
  }
  if (
    props.body.planned_start_at !== undefined &&
    props.body.planned_end_at !== undefined
  ) {
    const plannedStart = new Date(props.body.planned_start_at);
    const plannedEnd = new Date(props.body.planned_end_at);
    if (plannedStart > plannedEnd) {
      throw new HttpException(
        "planned_start_at must be before planned_end_at",
        400,
      );
    }
  }
  // Prepare update data
  const updateData: Prisma.discussion_board_maintenance_schedulesUpdateInput = {
    updated_at: new Date(),
  };
  if (props.body.maintenance_type !== undefined) {
    updateData.maintenance_type = props.body.maintenance_type;
  }
  if (props.body.title !== undefined) {
    updateData.title = props.body.title;
  }
  if (props.body.description !== undefined) {
    updateData.description = props.body.description ?? null;
  }
  if (props.body.planned_start_at !== undefined) {
    updateData.planned_start_at = new Date(props.body.planned_start_at);
  }
  if (props.body.planned_end_at !== undefined) {
    updateData.planned_end_at = new Date(props.body.planned_end_at);
  }
  if (props.body.actual_start_at !== undefined) {
    updateData.actual_start_at =
      props.body.actual_start_at === null
        ? null
        : new Date(props.body.actual_start_at);
  }
  if (props.body.actual_end_at !== undefined) {
    updateData.actual_end_at =
      props.body.actual_end_at === null
        ? null
        : new Date(props.body.actual_end_at);
  }
  if (newStatusTypeId) {
    updateData.statusType = { connect: { id: newStatusTypeId } };
  }
  // Perform atomic update with transaction for concurrency safety
  const result = await MyGlobal.prisma.$transaction(async (tx) => {
    // Update the schedule
    await tx.discussion_board_maintenance_schedules.update({
      where: { id: scheduleId },
      data: updateData,
    });
    // Fetch updated record with transformer select
    return await tx.discussion_board_maintenance_schedules.findUniqueOrThrow({
      where: { id: scheduleId },
      ...DiscussionBoardMaintenanceScheduleTransformer.select(),
    });
  });
  return await DiscussionBoardMaintenanceScheduleTransformer.transform(result);
}
