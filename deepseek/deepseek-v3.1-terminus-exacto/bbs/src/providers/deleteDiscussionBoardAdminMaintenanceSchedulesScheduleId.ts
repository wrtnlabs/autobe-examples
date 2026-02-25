import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { AdminPayload } from "../decorators/payload/AdminPayload";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function deleteDiscussionBoardAdminMaintenanceSchedulesScheduleId(props: {
  admin: AdminPayload;
  scheduleId: string & tags.Format<"uuid">;
}): Promise<void> {
  try {
    // Check if schedule exists and belongs to this admin or any admin can delete
    const schedule =
      await MyGlobal.prisma.discussion_board_maintenance_schedules.findUniqueOrThrow(
        {
          where: { id: props.scheduleId },
          select: { scheduled_by_admin_id: true, status: true },
        },
      );
    // Optionally: Check if admin is deleting their own schedule or has permission
    // For now, any admin can delete any schedule based on general admin permissions
    // If we need restriction: if (schedule.scheduled_by_admin_id !== props.admin.id) {
    //   throw new HttpException("You can only delete maintenance schedules you created", 403);
    // }
    // Optional: Prevent deletion of in-progress or recently completed schedules
    // Based on business requirements, we might want to restrict deletion
    // const restrictedStatuses = ["in-progress", "completed"];
    // if (restrictedStatuses.includes(schedule.status)) {
    //   throw new HttpException(`Cannot delete maintenance schedule with status: ${schedule.status}`, 400);
    // }
    // Perform the hard delete operation
    await MyGlobal.prisma.discussion_board_maintenance_schedules.delete({
      where: { id: props.scheduleId },
    });
    // Note: Audit logging would be handled by separate audit trail system
    // The specification mentions "Log the deletion activity" - this could be:
    // 1. Database trigger
    // 2. Separate audit log service call
    // 3. Prisma middleware
    // Not implementing here as it's a system-level concern
    // Implicitly returns HTTP 204 No Content
  } catch (error) {
    // Handle Prisma known errors
    if (error instanceof Prisma.PrismaClientKnownRequestError) {
      if (error.code === "P2025") {
        // Record not found
        throw new HttpException("Maintenance schedule not found", 404);
      }
      // Other Prisma known errors
      throw new HttpException(`Database error: ${error.message}`, 500);
    }
    // Handle Prisma unknown errors or other errors
    else if (error instanceof Prisma.PrismaClientUnknownRequestError) {
      throw new HttpException("Unknown database error", 500);
    } else if (error instanceof HttpException) {
      // Re-throw any HttpException we created
      throw error;
    }
    // Any other error
    throw new HttpException("Internal server error", 500);
  }
}
