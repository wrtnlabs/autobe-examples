import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IHrmDepartment } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmDepartment";
import { IHrmEmployee } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmEmployee";
import { IHrmMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmMember";
import { IHrmOrganization } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmOrganization";
import { IHrmProject } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmProject";
import { IHrmRole } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmRole";
import { IHrmTask } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTask";
import { IHrmTimeReportItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeReportItem";
import { IHrmTimelog } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimelog";
import { IHrmTimesheetTimelog } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimesheetTimelog";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { MemberPayload } from "../decorators/payload/MemberPayload";
import { HrmTimesheetTimelogTransformer } from "../transformers/HrmTimesheetTimelogTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function putHrmMemberOrganizationsOrganizationIdTimesheetsTimesheetId(props: {
  member: MemberPayload;
  organizationId: string & tags.Format<"uuid">;
  timesheetId: string & tags.Format<"uuid">;
  body: IHrmTimesheetTimelog.IUpdate;
}): Promise<IHrmTimesheetTimelog> {
  // 1. Verify organization exists
  const organization = await MyGlobal.prisma.hrm_organizations.findFirst({
    where: {
      id: props.organizationId,
      deleted_at: null,
    },
  });
  if (!organization) {
    throw new HttpException("Organization not found", 404);
  }
  // 2. Fetch timesheet (without employee relationship - use hrm_employee_id instead)
  const timesheet = await MyGlobal.prisma.hrm_timesheets.findUnique({
    where: {
      id: props.timesheetId,
      deleted_at: null,
    },
    select: {
      id: true,
      hrm_employee_id: true,
      status: true,
      week_start_date: true,
      week_end_date: true,
    },
  });
  if (!timesheet) {
    throw new HttpException("Timesheet not found", 404);
  }
  // 3. Fetch employee separately using hrm_employee_id
  const employee = await MyGlobal.prisma.hrm_employees.findUnique({
    where: { id: timesheet.hrm_employee_id },
    select: {
      id: true,
      organization_id: true,
      user_id: true,
      status: true,
    },
  });
  if (!employee) {
    throw new HttpException("Employee not found", 404);
  }
  // 4. Verify timesheet belongs to organization
  if (employee.organization_id !== props.organizationId) {
    throw new HttpException("Timesheet does not belong to organization", 404);
  }
  // 5. Check authorization: member must have time:manage permission via role
  // Check for time:manage permission via role
  const employeeRole = await MyGlobal.prisma.hrm_employees.findUnique({
    where: { id: timesheet.hrm_employee_id },
    select: { role: { select: { id: true } } },
  });
  if (!employeeRole?.role) {
    throw new HttpException("Forbidden", 403);
  }
  // Check for Manager or Owner role (built-in roles with time:manage)
  const role = await MyGlobal.prisma.hrm_roles.findUnique({
    where: { id: employeeRole.role.id },
    select: { name: true, is_builtin: true },
  });
  if (
    !role ||
    (role.is_builtin && role.name !== "Manager" && role.name !== "Owner")
  ) {
    throw new HttpException("Forbidden", 403);
  }
  // 6. Verify employee is active
  if (employee.status !== "active") {
    throw new HttpException("Employee is not active", 403);
  }
  // 7. Check timesheet status - only draft can be updated
  if (timesheet.status !== "draft") {
    throw new HttpException(
      "Timesheet must be in draft status to be updated",
      409,
    );
  }
  // 8. Validate week dates if provided
  let newWeekStartDate: string & tags.Format<"date-time"> = toISOStringSafe(
    timesheet.week_start_date,
  );
  let newWeekEndDate: string & tags.Format<"date-time"> = toISOStringSafe(
    timesheet.week_end_date,
  );
  if (props.body.week_start_date !== undefined) {
    const startDate = new Date(props.body.week_start_date);
    // Must be Monday (day 1)
    if (startDate.getUTCDay() !== 1) {
      throw new HttpException("week_start_date must be a Monday", 400);
    }
    newWeekStartDate = props.body.week_start_date;
  }
  if (props.body.week_end_date !== undefined) {
    const endDate = new Date(props.body.week_end_date);
    // Must be Sunday (day 0)
    if (endDate.getUTCDay() !== 0) {
      throw new HttpException("week_end_date must be a Sunday", 400);
    }
    newWeekEndDate = props.body.week_end_date;
  }
  // Validate week_end_date is exactly 6 days after week_start_date
  if (
    props.body.week_start_date !== undefined ||
    props.body.week_end_date !== undefined
  ) {
    const start =
      props.body.week_start_date !== undefined
        ? new Date(props.body.week_start_date)
        : new Date(newWeekStartDate);
    const end =
      props.body.week_end_date !== undefined
        ? new Date(props.body.week_end_date)
        : new Date(newWeekEndDate);
    const diffDays = (end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24);
    if (diffDays !== 6) {
      throw new HttpException(
        "week_end_date must be exactly 6 days after week_start_date",
        400,
      );
    }
  }
  // 9. Validate rejection_reason when status is rejected
  if (props.body.status === "rejected" && !props.body.rejection_reason) {
    throw new HttpException(
      "rejection_reason is required when status is rejected",
      400,
    );
  }
  // 10. Prepare update data
  const updateData: Prisma.hrm_timesheetsUpdateInput = {
    updated_at: new Date(),
  };
  if (props.body.week_start_date !== undefined) {
    updateData.week_start_date = new Date(props.body.week_start_date);
  }
  if (props.body.week_end_date !== undefined) {
    updateData.week_end_date = new Date(props.body.week_end_date);
  }
  if (props.body.status !== undefined) {
    updateData.status = props.body.status;
    // Set submitted_at when transitioning to submitted
    if (props.body.status === "submitted" && timesheet.status === "draft") {
      updateData.submitted_at = new Date();
    }
    // Set reviewed_at when transitioning to approved or rejected
    if (props.body.status === "approved" || props.body.status === "rejected") {
      updateData.reviewed_at = new Date();
      // Note: reviewed_by field doesn't exist, removed
    }
  }
  if (props.body.rejection_reason !== undefined) {
    updateData.rejection_reason = props.body.rejection_reason;
  }
  // 11. Execute update
  await MyGlobal.prisma.hrm_timesheets.update({
    where: { id: props.timesheetId },
    data: updateData,
  });
  // 12. Recalculate total_hours from timelogs
  const timelogs = await MyGlobal.prisma.hrm_timesheet_timelogs.findMany({
    where: {
      timesheet_id: props.timesheetId,
    },
    select: {
      timelog: {
        select: {
          duration_minutes: true,
        },
      },
    },
  });
  const totalMinutes = timelogs.reduce(
    (sum, t) => sum + t.timelog.duration_minutes,
    0,
  );
  const totalHours = totalMinutes / 60;
  await MyGlobal.prisma.hrm_timesheets.update({
    where: { id: props.timesheetId },
    data: { total_hours: totalHours },
  });
  // 13. Fetch updated timesheet and transform
  const updated = await MyGlobal.prisma.hrm_timesheets.findUniqueOrThrow({
    where: { id: props.timesheetId },
    ...HrmTimesheetTimelogTransformer.select(),
  });
  return await HrmTimesheetTimelogTransformer.transform(updated);
}


//--------------------------------------------------------------
// TEMPLATE CODE
//--------------------------------------------------------------
// Complete the code below, disregard the import part and return only the function part.
// 
// ```typescript
// import { ArrayUtil } from "@nestia/e2e";
// import { HttpException } from "@nestjs/common";
// import { Prisma } from "@prisma/sdk";
// import jwt from "jsonwebtoken";
// import typia, { tags } from "typia";
// import { v4 } from "uuid";
// import { MyGlobal } from "../MyGlobal";
// import { PasswordUtil } from "../utils/PasswordUtil";
// import { toISOStringSafe } from "../utils/toISOStringSafe"
// 
// import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
// import { IHrmTimesheetTimelog } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimesheetTimelog";
// import { IHrmEmployee } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmEmployee";
// import { IHrmMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmMember";
// import { IHrmOrganization } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmOrganization";
// import { IHrmRole } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmRole";
// import { IHrmDepartment } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmDepartment";
// import { IHrmTimelog } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimelog";
// import { IHrmTimeReportItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeReportItem";
// import { IHrmProject } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmProject";
// import { IHrmTask } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTask";
// 
// // DON'T CHANGE FUNCTION NAME AND PARAMETERS,
// // ONLY YOU HAVE TO WRITE THIS FUNCTION BODY, AND USE IMPORTED.
// export async function putHrmMemberOrganizationsOrganizationIdTimesheetsTimesheetId(props: {
//   member: MemberPayload;
//   organizationId: string & tags.Format<"uuid">;
//   timesheetId: string & tags.Format<"uuid">;
//   body: IHrmTimesheetTimelog.IUpdate;
// }): Promise<IHrmTimesheetTimelog> {
//   await MyGlobal.prisma.hrm_timesheets.update({
//     where: { ... },
//     data: { ... },
//   });
//   const updated = await MyGlobal.prisma.hrm_timesheets.findUniqueOrThrow({
//     where: { ... },
//     ...HrmTimesheetTimelogTransformer.select(),
//   });
//   return await HrmTimesheetTimelogTransformer.transform(updated);
// }
// ```
//--------------------------------------------------------------