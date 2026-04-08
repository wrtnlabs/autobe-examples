import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IErpHrmDepartment } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmDepartment";
import { IErpHrmEmployee } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmEmployee";
import { IErpHrmMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmMember";
import { IErpHrmOrganization } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmOrganization";
import { IErpHrmProject } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmProject";
import { IErpHrmRole } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmRole";
import { IErpHrmTask } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmTask";
import { IErpHrmTimelog } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmTimelog";
import { IErpHrmTimesheet } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmTimesheet";
import { IErpHrmTimesheetTimelog } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmTimesheetTimelog";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { MemberPayload } from "../decorators/payload/MemberPayload";
import { ErpHrmTimesheetTransformer } from "../transformers/ErpHrmTimesheetTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function putErpHrmMemberTimesheetsTimesheetId(props: {
  member: MemberPayload;
  timesheetId: string & tags.Format<"uuid">;
  body: IErpHrmTimesheet.IUpdate;
}): Promise<IErpHrmTimesheet> {
  // 1. Get timesheet with ownership verification
  const timesheet = await MyGlobal.prisma.erp_hrm_timesheets.findUniqueOrThrow({
    where: { id: props.timesheetId },
    select: {
      id: true,
      erp_hrm_employee_id: true,
      status: true,
      week_start_date: true,
      timesheetTimelogs: {
        select: { id: true },
      },
    },
  });
  // 2. Verify ownership
  if (timesheet.erp_hrm_employee_id !== props.member.id) {
    throw new HttpException("Forbidden", 403);
  }
  // 3. Only draft timesheets can be updated
  if (timesheet.status !== "draft") {
    throw new HttpException("Only draft timesheets can be updated", 403);
  }
  // Build update data
  const updateData: Prisma.erp_hrm_timesheetsUpdateInput = {
    updated_at: new Date(),
  };
  // Handle status transition to submitted
  if (props.body.status === "submitted") {
    // Validate: timesheet must have at least one timelog
    if (timesheet.timesheetTimelogs.length === 0) {
      throw new HttpException(
        "Timesheet must contain at least one timelog before submission",
        400,
      );
    }
    // Validate: no duplicate submitted/approved timesheet for same employee and week
    const existingTimesheet =
      await MyGlobal.prisma.erp_hrm_timesheets.findFirst({
        where: {
          erp_hrm_employee_id: timesheet.erp_hrm_employee_id,
          week_start_date: timesheet.week_start_date,
          status: { in: ["submitted", "approved"] },
          id: { not: props.timesheetId },
          deleted_at: null,
        },
      });
    if (existingTimesheet) {
      throw new HttpException(
        "A timesheet for this period already exists with submitted or approved status",
        409,
      );
    }
    updateData.status = "submitted";
    updateData.submitted_at = new Date();
  }
  // Calculate total_hours from associated timelogs via junction table
  const timelogs = await MyGlobal.prisma.erp_hrm_timesheet_timelogs.findMany({
    where: { erp_hrm_timesheet_id: props.timesheetId },
    select: {
      timelog: {
        select: { duration_minutes: true },
      },
    },
  });
  const totalMinutes = timelogs.reduce(
    (sum, t) => sum + (t.timelog.duration_minutes ?? 0),
    0,
  );
  const totalHours = totalMinutes / 60;
  updateData.total_hours = totalHours;
  // Update timesheet
  await MyGlobal.prisma.erp_hrm_timesheets.update({
    where: { id: props.timesheetId },
    data: updateData,
  });
  // Return updated timesheet
  const updated = await MyGlobal.prisma.erp_hrm_timesheets.findUniqueOrThrow({
    where: { id: props.timesheetId },
    ...ErpHrmTimesheetTransformer.select(),
  });
  return await ErpHrmTimesheetTransformer.transform(updated);
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
// import { IErpHrmTimesheet } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmTimesheet";
// import { IErpHrmEmployee } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmEmployee";
// import { IErpHrmMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmMember";
// import { IErpHrmRole } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmRole";
// import { IErpHrmOrganization } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmOrganization";
// import { IErpHrmDepartment } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmDepartment";
// import { IErpHrmTimesheetTimelog } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmTimesheetTimelog";
// import { IErpHrmTimelog } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmTimelog";
// import { IErpHrmProject } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmProject";
// import { IErpHrmTask } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmTask";
// 
// // DON'T CHANGE FUNCTION NAME AND PARAMETERS,
// // ONLY YOU HAVE TO WRITE THIS FUNCTION BODY, AND USE IMPORTED.
// export async function putErpHrmMemberTimesheetsTimesheetId(props: {
//   member: MemberPayload;
//   timesheetId: string & tags.Format<"uuid">;
//   body: IErpHrmTimesheet.IUpdate;
// }): Promise<IErpHrmTimesheet> {
//   await MyGlobal.prisma.erp_hrm_timesheets.update({
//     where: { ... },
//     data: { ... },
//   });
//   const updated = await MyGlobal.prisma.erp_hrm_timesheets.findUniqueOrThrow({
//     where: { ... },
//     ...ErpHrmTimesheetTransformer.select(),
//   });
//   return await ErpHrmTimesheetTransformer.transform(updated);
// }
// ```
//--------------------------------------------------------------