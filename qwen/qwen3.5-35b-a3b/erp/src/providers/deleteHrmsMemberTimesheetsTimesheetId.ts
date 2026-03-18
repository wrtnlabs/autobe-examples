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

export async function deleteHrmsMemberTimesheetsTimesheetId(props: {
  member: MemberPayload;
  timesheetId: string & tags.Format<"uuid">;
}): Promise<void> {
  // Step 1: Query the timesheet to validate existence and status
  const timesheet = await MyGlobal.prisma.hrms_timesheets.findUniqueOrThrow({
    where: { id: props.timesheetId },
  });
  // Step 2: Validate timesheet status (only draft or rejected can be deleted)
  if (timesheet.status !== "draft" && timesheet.status !== "rejected") {
    throw new HttpException(
      "Timesheet cannot be deleted in submitted or approved status",
      403,
    );
  }
  // Step 3: Get member's organization membership to validate access and organization
  const membership = await MyGlobal.prisma.hrms_organization_members.findFirst({
    where: {
      hrms_member_id: props.member.id,
      deleted_at: null,
    },
    include: {
      organizationRole: {
        include: {
          permissions: true,
        },
      },
    },
  });
  if (!membership) {
    throw new HttpException("Member is not enrolled in any organization", 403);
  }
  // Step 4: Get the employee record associated with this organization membership
  const employee = await MyGlobal.prisma.hrms_employees.findFirst({
    where: {
      organization_member_id: membership.id,
      deleted_at: null,
    },
  });
  if (!employee) {
    throw new HttpException(
      "Employee record not found for this membership",
      403,
    );
  }
  // Step 5: Check if member owns the timesheet (via employee record)
  const isOwner = employee.id === timesheet.hrms_employee_id;
  // Step 6: Check if member has time:manage permission
  const hasTimeManagePermission = membership.organizationRole.permissions.some(
    (p) => p.permission === "time:manage",
  );
  // Step 7: Validate access (must be owner OR have permission)
  if (!isOwner && !hasTimeManagePermission) {
    throw new HttpException(
      "Forbidden: You do not have permission to delete this timesheet",
      403,
    );
  }
  // Step 8: Validate organization isolation
  // The timesheet's employee must belong to the same organization as the member
  if (employee.organization_member_id !== membership.id) {
    throw new HttpException(
      "Timesheet belongs to a different organization",
      403,
    );
  }
  // Step 9: Soft delete the timesheet
  await MyGlobal.prisma.hrms_timesheets.update({
    where: { id: props.timesheetId },
    data: {
      deleted_at: new Date(),
    },
  });
  // Step 10: Soft delete associated timelogs that fall within this timesheet's week
  // Timelogs are deleted if they belong to the same employee and date falls within the week range
  await MyGlobal.prisma.hrms_timelogs.updateMany({
    where: {
      employee_id: timesheet.hrms_employee_id,
      deleted_at: null,
      date: {
        gte: timesheet.week_start_date,
        lte: timesheet.week_end_date,
      },
    },
    data: {
      deleted_at: new Date(),
    },
  });
}
