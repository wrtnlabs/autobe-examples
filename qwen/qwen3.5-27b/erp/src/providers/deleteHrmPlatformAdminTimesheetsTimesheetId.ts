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

export async function deleteHrmPlatformAdminTimesheetsTimesheetId(props: {
  admin: AdminPayload;
  timesheetId: string & tags.Format<"uuid">;
}): Promise<void> {
  // Find the timesheet with employee and organization context
  const timesheet =
    await MyGlobal.prisma.hrm_platform_timesheets.findUniqueOrThrow({
      where: { id: props.timesheetId },
      select: {
        id: true,
        status: true,
        deleted_at: true,
        employee: {
          select: {
            id: true,
            organization_id: true,
          },
        },
      },
    });
  // Verify the timesheet belongs to an organization the admin can access
  // Admins have elevated privileges within their organization scope
  const adminOrganizationId = await MyGlobal.prisma.hrm_platform_member_sessions
    .findFirst({
      where: { id: props.admin.session_id },
      select: { hrm_platform_organization_id: true },
    })
    .then((session) => session?.hrm_platform_organization_id);
  if (adminOrganizationId !== timesheet.employee.organization_id) {
    throw new HttpException("Forbidden", 403);
  }
  // Check timesheet status - only draft timesheets can be deleted
  if (timesheet.status !== "draft") {
    throw new HttpException(
      `Cannot delete timesheet with status '${timesheet.status}'. Only draft timesheets can be deleted.`,
      409,
    );
  }
  // Delete the timesheet (cascade deletion handles associated timelogs)
  await MyGlobal.prisma.hrm_platform_timesheets.delete({
    where: { id: props.timesheetId },
  });
  // Create activity log entry for audit trail
  await MyGlobal.prisma.hrm_platform_activity_logs.create({
    data: {
      id: v4() as string & tags.Format<"uuid">,
      hrm_platform_organization_id: timesheet.employee.organization_id,
      hrm_platform_member_id: null,
      action_type: "timesheet_deleted",
      target_entity_type: "timesheet",
      target_entity_id: props.timesheetId as string & tags.Format<"uuid">,
      action_description: `Timesheet ${props.timesheetId} deleted by admin ${props.admin.id}`,
      ip_address: null,
      user_agent: null,
      created_at: new Date(),
    },
  });
}
