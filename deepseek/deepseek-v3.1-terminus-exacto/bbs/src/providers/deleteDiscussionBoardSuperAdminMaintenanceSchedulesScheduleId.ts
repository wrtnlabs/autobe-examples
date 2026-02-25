import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { SuperAdminPayload } from "../decorators/payload/SuperAdminPayload";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function deleteDiscussionBoardSuperAdminMaintenanceSchedulesScheduleId(props: {
  superAdmin: SuperAdminPayload;
  scheduleId: string & tags.Format<"uuid">;
}): Promise<void> {
  // First verify the maintenance schedule exists
  const schedule =
    await MyGlobal.prisma.discussion_board_maintenance_schedules.findUnique({
      where: {
        id: props.scheduleId,
        // Optionally check if not already deleted if using soft delete
        // But specification says HARD delete, so we delete regardless
      },
    });
  if (!schedule) {
    throw new HttpException(
      `Maintenance schedule with ID ${props.scheduleId} not found`,
      404,
    );
  }
  // Optional: Add authorization check if needed
  // Based on requirements, super admin can delete any schedule
  // But we could check if the schedule was created by this admin or not
  // Perform hard delete as specified
  await MyGlobal.prisma.discussion_board_maintenance_schedules.delete({
    where: { id: props.scheduleId },
  });
  // Return void as specified - no content on successful deletion
}
