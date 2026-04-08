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

export async function postHrmMemberOrganizationsOrganizationIdTimesheetsTimesheetIdSubmit(props: {
  member: MemberPayload;
  organizationId: string & tags.Format<"uuid">;
  timesheetId: string & tags.Format<"uuid">;
}): Promise<IHrmTimesheetTimelog> {
  // 1. Retrieve timesheet with employee relation
  const record = await MyGlobal.prisma.hrm_timesheets.findFirstOrThrow({
    where: {
      id: props.timesheetId,
      deleted_at: null,
    },
    ...HrmTimesheetTimelogTransformer.select(),
  });
  // 2. Validate timesheet belongs to requesting member's employee in the organization
  if (record.employee.user.id !== props.member.id) {
    throw new HttpException("Timesheet does not belong to you", 403);
  }
  if (record.employee.organization.id !== props.organizationId) {
    throw new HttpException(
      "Timesheet does not belong to this organization",
      403,
    );
  }
  // 3. Validate timesheet status is 'draft'
  if (record.status !== "draft") {
    throw new HttpException("Timesheet is not in draft status", 400);
  }
  // 4. Verify at least one timelog exists for this timesheet
  const timelogCount = await MyGlobal.prisma.hrm_timesheet_timelogs.count({
    where: {
      timesheet_id: props.timesheetId,
    },
  });
  if (timelogCount === 0) {
    throw new HttpException(
      "Timesheet must contain at least one timelog entry",
      400,
    );
  }
  // 5. Check for existing submitted/approved timesheets for same employee and week
  const duplicateTimesheet = await MyGlobal.prisma.hrm_timesheets.findFirst({
    where: {
      hrm_employee_id: record.employee.id,
      week_start_date: record.week_start_date,
      status: { in: ["submitted", "approved"] },
      id: { not: props.timesheetId },
      deleted_at: null,
    },
  });
  if (duplicateTimesheet) {
    throw new HttpException(
      "A timesheet for this week is already submitted or approved",
      400,
    );
  }
  // 6. Verify employee status is 'active'
  if (record.employee.status !== "active") {
    throw new HttpException(
      "Employee is deactivated and cannot submit timesheets",
      403,
    );
  }
  // 7. Update timesheet status to 'submitted' and set submitted_at
  await MyGlobal.prisma.hrm_timesheets.update({
    where: { id: props.timesheetId },
    data: {
      status: "submitted",
      submitted_at: new Date(),
      updated_at: new Date(),
    },
  });
  // 8. Return updated timesheet with full details
  const updated = await MyGlobal.prisma.hrm_timesheets.findFirstOrThrow({
    ...HrmTimesheetTimelogTransformer.select(),
    where: {
      id: props.timesheetId,
      deleted_at: null,
    },
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
// export async function postHrmMemberOrganizationsOrganizationIdTimesheetsTimesheetIdSubmit(props: {
//   member: MemberPayload;
//   organizationId: string & tags.Format<"uuid">;
//   timesheetId: string & tags.Format<"uuid">;
// }): Promise<IHrmTimesheetTimelog> {
//   const record = await MyGlobal.prisma.hrm_timesheets.findFirstOrThrow({
//     ...HrmTimesheetTimelogTransformer.select(),
//     where: { ... },
//   });
//   return await HrmTimesheetTimelogTransformer.transform(record);
// }
// ```
//--------------------------------------------------------------