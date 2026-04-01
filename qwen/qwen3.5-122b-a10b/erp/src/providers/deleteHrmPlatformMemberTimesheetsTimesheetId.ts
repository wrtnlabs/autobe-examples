import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { MemberPayload } from "../decorators/payload/MemberPayload";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function deleteHrmPlatformMemberTimesheetsTimesheetId(props: {
  member: MemberPayload;
  timesheetId: string & tags.Format<"uuid">;
}): Promise<void> {
  // Step 1: Fetch timesheet and verify existence
  const timesheet = await MyGlobal.prisma.hrm_platform_timesheets.findUnique({
    where: { id: props.timesheetId },
    select: {
      id: true,
      hrm_platform_employee_id: true,
      status: true,
      deleted_at: true,
      employee: {
        select: {
          hrm_platform_user_id: true,
          hrm_platform_organization_id: true,
          hrm_platform_role_id: true,
        },
      },
    },
  });
  if (timesheet === null || timesheet.deleted_at !== null) {
    throw new HttpException("Timesheet not found", 404);
  }
  // Step 2: Check authorization - ownership or time:manage permission
  const isOwner = timesheet.employee.hrm_platform_user_id === props.member.id;
  let hasPermission = false;
  if (!isOwner) {
    // Check for time:manage permission in the employee's role
    const permissionAssignment =
      await MyGlobal.prisma.hrm_platform_role_permissions.findFirst({
        where: {
          hrm_platform_role_id: timesheet.employee.hrm_platform_role_id,
          deleted_at: null,
          permission: {
            code: "time:manage",
            deleted_at: null,
          },
        },
      });
    hasPermission = permissionAssignment !== null;
  }
  if (!isOwner && !hasPermission) {
    throw new HttpException("Forbidden", 403);
  }
  // Step 3: Validate timesheet status is 'draft'
  if (timesheet.status !== "draft") {
    throw new HttpException(
      "Cannot delete timesheet that is not in draft status",
      409,
    );
  }
  // Step 4: Soft delete timesheet
  await MyGlobal.prisma.hrm_platform_timesheets.update({
    where: { id: props.timesheetId },
    data: {
      deleted_at: new Date(),
    },
  });
  // Step 5: Cascade soft delete to timesheet_timelogs
  await MyGlobal.prisma.hrm_platform_timesheet_timelogs.updateMany({
    where: {
      hrm_platform_timesheet_id: props.timesheetId,
      deleted_at: null,
    },
    data: {
      deleted_at: new Date(),
    },
  });
}
