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

export async function deleteDiscussionBoardSuperAdminMaintenanceSchedulesScheduleId(props: {
  superAdmin: SuperadminPayload;
  scheduleId: string & tags.Format<"uuid">;
}): Promise<IDiscussionBoardMaintenanceSchedule> {
  // Check if maintenance schedule exists and is not deleted
  const existingSchedule =
    await MyGlobal.prisma.discussion_board_maintenance_schedules.findFirst({
      where: {
        id: props.scheduleId,
        deleted_at: null,
      },
      ...DiscussionBoardMaintenanceScheduleTransformer.select(),
    });
  if (!existingSchedule) {
    throw new HttpException(
      "Maintenance schedule not found or already deleted",
      404,
    );
  }
  // Prevent deletion of maintenance schedules that are in progress
  if (existingSchedule.status === "in-progress") {
    throw new HttpException(
      "Cannot delete maintenance schedule that is currently in progress",
      400,
    );
  }
  // Perform soft deletion by setting deleted_at timestamp
  const deletedSchedule =
    await MyGlobal.prisma.discussion_board_maintenance_schedules.update({
      where: { id: props.scheduleId },
      data: {
        deleted_at: toISOStringSafe(new Date().toISOString()),
      },
      ...DiscussionBoardMaintenanceScheduleTransformer.select(),
    });
  return await DiscussionBoardMaintenanceScheduleTransformer.transform(
    deletedSchedule,
  );
}
