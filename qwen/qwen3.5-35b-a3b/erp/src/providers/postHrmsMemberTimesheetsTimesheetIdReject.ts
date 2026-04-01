import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IHrmsEmployee } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmsEmployee";
import { IHrmsMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmsMember";
import { IHrmsProject } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmsProject";
import { IHrmsTimelog } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmsTimelog";
import { IHrmsTimesheet } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmsTimesheet";
import { IWeekRange } from "@ORGANIZATION/PROJECT-api/lib/structures/IWeekRange";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { MemberPayload } from "../decorators/payload/MemberPayload";
import { HrmsTimesheetTransformer } from "../transformers/HrmsTimesheetTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function postHrmsMemberTimesheetsTimesheetIdReject(props: {
  member: MemberPayload;
  timesheetId: string & tags.Format<"uuid">;
  body: IHrmsTimesheet.IReject;
}): Promise<IHrmsTimesheet> {
  // Validate rejection reason is provided
  if (
    props.body.rejectionReason === null ||
    props.body.rejectionReason.trim() === ""
  ) {
    throw new HttpException("Rejection reason is required", 400);
  }
  // Retrieve the timesheet
  const timesheet = await MyGlobal.prisma.hrms_timesheets.findUniqueOrThrow({
    where: { id: props.timesheetId },
  });
  // Validate timesheet is in submitted status
  if (timesheet.status !== "submitted") {
    throw new HttpException("Timesheet is not in submitted state", 409);
  }
  // Validate timesheet is not already reviewed (approved or rejected)
  if (timesheet.reviewed_at !== null) {
    throw new HttpException("Timesheet has already been reviewed", 409);
  }
  // Retrieve the employee for this timesheet
  const employee = await MyGlobal.prisma.hrms_employees.findUniqueOrThrow({
    where: { id: timesheet.hrms_employee_id },
  });
  // Retrieve the employee's organization member record (not deleted)
  const employeeOrgMember =
    await MyGlobal.prisma.hrms_organization_members.findFirst({
      where: {
        id: employee.organization_member_id,
        deleted_at: null,
      },
    });
  if (!employeeOrgMember) {
    throw new HttpException("Employee organization member not found", 404);
  }
  // Retrieve member's organization member record
  const memberOrgMember =
    await MyGlobal.prisma.hrms_organization_members.findFirst({
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
  if (!memberOrgMember) {
    throw new HttpException("Forbidden", 403);
  }
  // Verify member is in the same organization as the timesheet's employee
  if (
    memberOrgMember.hrms_organization_id !==
    employeeOrgMember.hrms_organization_id
  ) {
    throw new HttpException("Forbidden", 403);
  }
  // Check if member has time:approve permission or is organization owner
  const hasApprovalPermission =
    memberOrgMember.organizationRole.permissions.some(
      (p: { permission: string }) => p.permission === "time:approve",
    );
  if (!hasApprovalPermission) {
    throw new HttpException("Forbidden", 403);
  }
  // Update the timesheet with rejection details
  const updated = await MyGlobal.prisma.hrms_timesheets.update({
    where: { id: props.timesheetId },
    data: {
      status: "rejected",
      rejection_reason: props.body.rejectionReason,
      reviewed_by: props.member.id,
      reviewed_at: toISOStringSafe(new Date()),
      updated_at: toISOStringSafe(new Date()),
    },
    ...HrmsTimesheetTransformer.select(),
  });
  // Transform and return
  return await HrmsTimesheetTransformer.transform(updated);
}
