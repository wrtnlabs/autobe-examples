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

export async function deleteErpHrmMemberTimesheetsTimesheetId(props: {
  member: MemberPayload;
  timesheetId: string & tags.Format<"uuid">;
}): Promise<void> {
  // Fetch timesheet with employee info
  const timesheet = await MyGlobal.prisma.erp_hrm_timesheets.findUnique({
    where: { id: props.timesheetId },
    select: {
      id: true,
      erp_hrm_employee_id: true,
      status: true,
      deleted_at: true,
      employee: {
        select: {
          id: true,
          erp_hrm_member_id: true,
          erp_hrm_organization_id: true,
          erp_hrm_role_id: true,
        },
      },
    },
  });
  // Check if timesheet exists
  if (!timesheet) {
    throw new HttpException("Timesheet not found", 404);
  }
  // Check if already soft-deleted
  if (timesheet.deleted_at !== null) {
    throw new HttpException("Timesheet not found", 404);
  }
  // Get current employee's employee record for authorization
  const employee = await MyGlobal.prisma.erp_hrm_employees.findFirst({
    where: {
      erp_hrm_member_id: props.member.id,
      deleted_at: null,
    },
    select: {
      id: true,
      erp_hrm_organization_id: true,
      erp_hrm_role_id: true,
    },
  });
  if (!employee) {
    throw new HttpException("Forbidden", 403);
  }
  // Check if member owns the timesheet (same employee)
  const isOwner = timesheet.erp_hrm_employee_id === employee.id;
  // Check if member has time:manage permission in the organization
  const hasTimeManagePermission =
    await MyGlobal.prisma.erp_hrm_role_permissions.findFirst({
      where: {
        erp_hrm_role_id: employee.erp_hrm_role_id,
        permission: "time:manage",
      },
    });
  // Authorization check
  if (!isOwner && !hasTimeManagePermission) {
    throw new HttpException("Forbidden", 403);
  }
  // Check timesheet status - cannot delete submitted or approved timesheets
  if (timesheet.status === "submitted") {
    throw new HttpException("Cannot delete a submitted timesheet", 400);
  }
  if (timesheet.status === "approved") {
    throw new HttpException("Cannot delete an approved timesheet", 400);
  }
  // Soft delete timesheet with transaction
  await MyGlobal.prisma.$transaction(async (tx) => {
    // Soft delete the timesheet (cascade handles erp_hrm_timesheet_timelogs deletion via onDelete: Cascade)
    await tx.erp_hrm_timesheets.update({
      where: { id: props.timesheetId },
      data: {
        deleted_at: new Date(),
      },
    });
  });
}
