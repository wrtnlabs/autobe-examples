import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IHrmTimeTrackingDepartment } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackingDepartment";
import { IHrmTimeTrackingEmployee } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackingEmployee";
import { IHrmTimeTrackingMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackingMember";
import { IHrmTimeTrackingOrganization } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackingOrganization";
import { IHrmTimeTrackingProject } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackingProject";
import { IHrmTimeTrackingRole } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackingRole";
import { IHrmTimeTrackingTask } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackingTask";
import { IHrmTimeTrackingTimelog } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackingTimelog";
import { IHrmTimeTrackingTimesheet } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackingTimesheet";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { MemberPayload } from "../decorators/payload/MemberPayload";
import { HrmTimeTrackingTimesheetTransformer } from "../transformers/HrmTimeTrackingTimesheetTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function postHrmTimeTrackingMemberTimesheetsTimesheetId(props: {
  member: MemberPayload;
  timesheetId: string & tags.Format<"uuid">;
}): Promise<IHrmTimeTrackingTimesheet> {
  // Find the active employee record linked to this member
  const employee = await MyGlobal.prisma.hrm_time_tracking_employees.findFirst({
    where: {
      hrm_time_tracking_member_id: props.member.id,
      deleted_at: null,
      status: "active",
    },
    select: { id: true },
  });
  if (employee === null) {
    throw new HttpException("Employee record not found or inactive", 403);
  }
  // Use a transaction for atomic submission with concurrency protection
  const record = await MyGlobal.prisma.$transaction(async (tx) => {
    // 1. Validate the timesheet exists, belongs to this employee, and is not soft-deleted
    const timesheet = await tx.hrm_time_tracking_timesheets.findFirst({
      where: {
        id: props.timesheetId,
        hrm_time_tracking_employee_id: employee.id,
        deleted_at: null,
      },
      select: {
        id: true,
        status: true,
        week_start_date: true,
      },
    });
    if (timesheet === null) {
      throw new HttpException("Timesheet not found", 404);
    }
    // 2. Validate current status is 'draft'
    if (timesheet.status !== "draft") {
      throw new HttpException("Timesheet is not in draft status", 400);
    }
    // 3. Validate at least one timelog exists for this timesheet
    const timelogCount = await tx.hrm_time_tracking_timelogs.count({
      where: {
        hrm_time_tracking_timesheet_id: props.timesheetId,
        deleted_at: null,
      },
    });
    if (timelogCount === 0) {
      throw new HttpException("EmptyTimesheet", 400);
    }
    // 4. Validate no duplicate weekly submission (same employee, same week, already submitted/approved)
    const duplicate = await tx.hrm_time_tracking_timesheets.findFirst({
      where: {
        hrm_time_tracking_employee_id: employee.id,
        week_start_date: timesheet.week_start_date,
        status: { in: ["submitted", "approved"] },
        id: { not: props.timesheetId },
        deleted_at: null,
      },
      select: { id: true },
    });
    if (duplicate !== null) {
      throw new HttpException("DuplicateWeeklyTimesheet", 400);
    }
    // 5. Atomically update status to 'submitted'
    await tx.hrm_time_tracking_timesheets.update({
      where: { id: props.timesheetId },
      data: {
        status: "submitted",
        submitted_at: new Date(),
        updated_at: new Date(),
      },
    });
    // 6. Fetch the updated full timesheet with all relations
    return await tx.hrm_time_tracking_timesheets.findUniqueOrThrow({
      where: { id: props.timesheetId },
      ...HrmTimeTrackingTimesheetTransformer.select(),
    });
  });
  return await HrmTimeTrackingTimesheetTransformer.transform(record);
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
// import { IHrmTimeTrackingTimesheet } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackingTimesheet";
// import { IHrmTimeTrackingEmployee } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackingEmployee";
// import { IHrmTimeTrackingMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackingMember";
// import { IHrmTimeTrackingRole } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackingRole";
// import { IHrmTimeTrackingOrganization } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackingOrganization";
// import { IHrmTimeTrackingDepartment } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackingDepartment";
// import { IHrmTimeTrackingTimelog } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackingTimelog";
// import { IHrmTimeTrackingProject } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackingProject";
// import { IHrmTimeTrackingTask } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackingTask";
// 
// // DON'T CHANGE FUNCTION NAME AND PARAMETERS,
// // ONLY YOU HAVE TO WRITE THIS FUNCTION BODY, AND USE IMPORTED.
// export async function postHrmTimeTrackingMemberTimesheetsTimesheetId(props: {
//   member: MemberPayload;
//   timesheetId: string & tags.Format<"uuid">;
// }): Promise<IHrmTimeTrackingTimesheet> {
//   const record = await MyGlobal.prisma.hrm_time_tracking_timesheets.findFirstOrThrow({
//     ...HrmTimeTrackingTimesheetTransformer.select(),
//     where: { ... },
//   });
//   return await HrmTimeTrackingTimesheetTransformer.transform(record);
// }
// ```
//--------------------------------------------------------------