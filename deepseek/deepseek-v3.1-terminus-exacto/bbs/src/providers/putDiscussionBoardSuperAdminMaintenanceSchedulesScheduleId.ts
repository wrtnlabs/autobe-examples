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

export async function putDiscussionBoardSuperAdminMaintenanceSchedulesScheduleId(props: {
  superAdmin: SuperadminPayload;
  scheduleId: string & tags.Format<"uuid">;
  body: IDiscussionBoardMaintenanceSchedule.IUpdate;
}): Promise<IDiscussionBoardMaintenanceSchedule> {
  // Validate schedule exists and is active
  const existing =
    await MyGlobal.prisma.discussion_board_maintenance_schedules.findUniqueOrThrow(
      {
        where: { id: props.scheduleId, deleted_at: null },
      },
    );
  // Validate date range if both dates are provided
  if (props.body.planned_start_at && props.body.planned_end_at) {
    const startTime = new Date(props.body.planned_start_at).getTime();
    const endTime = new Date(props.body.planned_end_at).getTime();
    if (startTime >= endTime) {
      throw new HttpException(
        "Planned start time must be before planned end time",
        400,
      );
    }
  }
  // Build update data with only provided fields
  const updateData: Prisma.discussion_board_maintenance_schedulesUpdateInput =
    {};
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
    updateData.planned_start_at = new Date(props.body.planned_start_at);
  }
  if (props.body.planned_end_at !== undefined) {
    updateData.planned_end_at = new Date(props.body.planned_end_at);
  }
  if (props.body.actual_start_at !== undefined) {
    updateData.actual_start_at = props.body.actual_start_at
      ? new Date(props.body.actual_start_at)
      : null;
  }
  if (props.body.actual_end_at !== undefined) {
    updateData.actual_end_at = props.body.actual_end_at
      ? new Date(props.body.actual_end_at)
      : null;
  }
  // Always update the updated_at timestamp
  updateData.updated_at = new Date();
  const updated =
    await MyGlobal.prisma.discussion_board_maintenance_schedules.update({
      where: { id: props.scheduleId },
      data: updateData,
      ...DiscussionBoardMaintenanceScheduleTransformer.select(),
    });
  return await DiscussionBoardMaintenanceScheduleTransformer.transform(updated);
}
