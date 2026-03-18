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
  // 1. Find timesheet by ID (soft delete check)
  const timesheet = await MyGlobal.prisma.hrm_platform_timesheets.findUnique({
    where: { id: props.timesheetId, deleted_at: null },
    select: {
      id: true,
      hrm_platform_employee_id: true,
      status: true,
      deleted_at: true,
    },
  });
  if (timesheet === null) {
    throw new HttpException("Timesheet not found", 404);
  }
  // 2. Get the employee record to find the organization
  const employee =
    await MyGlobal.prisma.hrm_platform_employees.findUniqueOrThrow({
      where: { id: timesheet.hrm_platform_employee_id },
      select: {
        id: true,
        hrm_platform_organization_id: true,
      },
    });
  // 3. Get member's employee record for this organization
  const memberEmployee = await MyGlobal.prisma.hrm_platform_employees.findFirst(
    {
      where: {
        hrm_platform_user_id: props.member.id,
        hrm_platform_organization_id: employee.hrm_platform_organization_id,
        deleted_at: null,
      },
      select: {
        id: true,
        hrm_platform_role_id: true,
      },
    },
  );
  // 4. Check authorization: owner OR time:manage permission
  const isOwner =
    memberEmployee !== null &&
    memberEmployee.id === timesheet.hrm_platform_employee_id;
  if (!isOwner) {
    if (memberEmployee === null) {
      throw new HttpException("Forbidden", 403);
    }
    // Check for time:manage permission via member's role in this organization
    const rolePermissions =
      await MyGlobal.prisma.hrm_platform_role_permissions.findMany({
        where: {
          hrm_platform_role_id: memberEmployee.hrm_platform_role_id,
        },
        select: { hrm_platform_permission_id: true },
      });
    const hasTimeManagePermission = rolePermissions.some(
      (rp) => rp.hrm_platform_permission_id === "time:manage",
    );
    if (!hasTimeManagePermission) {
      throw new HttpException("Forbidden", 403);
    }
  }
  // 5. Validate status is 'draft'
  if (timesheet.status !== "draft") {
    throw new HttpException(
      "Timesheet cannot be deleted - only draft timesheets can be deleted",
      409,
    );
  }
  // 6. Cascade soft delete to timesheet_timelogs
  await MyGlobal.prisma.hrm_platform_timesheet_timelogs.updateMany({
    where: {
      hrm_platform_timesheet_id: props.timesheetId,
      deleted_at: null,
    },
    data: {
      deleted_at: new Date(),
    },
  });
  // 7. Soft delete the timesheet
  await MyGlobal.prisma.hrm_platform_timesheets.update({
    where: { id: props.timesheetId },
    data: {
      deleted_at: new Date(),
    },
  });
}
