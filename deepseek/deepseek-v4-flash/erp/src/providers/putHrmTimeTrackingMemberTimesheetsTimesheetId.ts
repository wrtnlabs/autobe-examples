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

export async function putHrmTimeTrackingMemberTimesheetsTimesheetId(props: {
  member: MemberPayload;
  timesheetId: string & tags.Format<"uuid">;
  body: IHrmTimeTrackingTimesheet.IUpdate;
}): Promise<IHrmTimeTrackingTimesheet> {
  // 1. Fetch the timesheet with enough info for validation
  const timesheet =
    await MyGlobal.prisma.hrm_time_tracking_timesheets.findUniqueOrThrow({
      where: { id: props.timesheetId },
      select: {
        id: true,
        status: true,
        week_start_date: true,
        hrm_time_tracking_employee_id: true,
        employee: {
          select: {
            id: true,
            hrm_time_tracking_member_id: true,
          },
        },
      },
    });
  // 2. Verify ownership — employee must belong to this member
  if (timesheet.employee.hrm_time_tracking_member_id !== props.member.id) {
    throw new HttpException("Forbidden", 403);
  }
  // 3. Verify status is 'draft'
  if (timesheet.status !== "draft") {
    throw new HttpException("Only draft timesheets can be submitted", 422);
  }
  // 4. Verify at least one non-deleted timelog exists
  const timelogCount = await MyGlobal.prisma.hrm_time_tracking_timelogs.count({
    where: {
      hrm_time_tracking_timesheet_id: props.timesheetId,
      deleted_at: null,
    },
  });
  if (timelogCount === 0) {
    throw new HttpException(
      "Timesheet must contain at least one timelog before submission",
      422,
    );
  }
  // 5. Verify no other timesheet for same week is submitted or approved
  const duplicate =
    await MyGlobal.prisma.hrm_time_tracking_timesheets.findFirst({
      where: {
        id: { not: props.timesheetId },
        hrm_time_tracking_employee_id: timesheet.hrm_time_tracking_employee_id,
        week_start_date: timesheet.week_start_date,
        status: { in: ["submitted", "approved"] },
        deleted_at: null,
      },
      select: { id: true },
    });
  if (duplicate !== null) {
    throw new HttpException(
      "Another timesheet for this work week is already submitted or approved",
      409,
    );
  }
  // 6. Update status to submitted
  await MyGlobal.prisma.hrm_time_tracking_timesheets.update({
    where: { id: props.timesheetId },
    data: {
      status: "submitted",
      submitted_at: new Date(),
      updated_at: new Date(),
    },
  });
  // 7. Fetch and return the full updated timesheet
  const updated =
    await MyGlobal.prisma.hrm_time_tracking_timesheets.findUniqueOrThrow({
      where: { id: props.timesheetId },
      ...HrmTimeTrackingTimesheetTransformer.select(),
    });
  return await HrmTimeTrackingTimesheetTransformer.transform(updated);
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
// export async function putHrmTimeTrackingMemberTimesheetsTimesheetId(props: {
//   member: MemberPayload;
//   timesheetId: string & tags.Format<"uuid">;
//   body: IHrmTimeTrackingTimesheet.IUpdate;
// }): Promise<IHrmTimeTrackingTimesheet> {
//   await MyGlobal.prisma.hrm_time_tracking_timesheets.update({
//     where: { ... },
//     data: { ... },
//   });
//   const updated = await MyGlobal.prisma.hrm_time_tracking_timesheets.findUniqueOrThrow({
//     where: { ... },
//     ...HrmTimeTrackingTimesheetTransformer.select(),
//   });
//   return await HrmTimeTrackingTimesheetTransformer.transform(updated);
// }
// ```
//--------------------------------------------------------------