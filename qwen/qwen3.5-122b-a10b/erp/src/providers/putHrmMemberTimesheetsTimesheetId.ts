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

export async function putHrmMemberTimesheetsTimesheetId(props: {
  member: MemberPayload;
  timesheetId: string & tags.Format<"uuid">;
  body: IHrmTimesheetTimelog.IUpdate;
}): Promise<IHrmTimesheetTimelog> {
  const timesheet = await MyGlobal.prisma.hrm_timesheets.findUnique({
    where: { id: props.timesheetId },
    select: {
      id: true,
      hrm_employee_id: true,
      status: true,
      week_start_date: true,
      week_end_date: true,
    },
  });
  if (timesheet === null) {
    throw new HttpException("Timesheet not found", 404);
  }
  const employee = await MyGlobal.prisma.hrm_employees.findUnique({
    where: { id: timesheet.hrm_employee_id },
    select: {
      user_id: true,
    },
  });
  if (employee?.user_id !== props.member.id) {
    throw new HttpException("Forbidden", 403);
  }
  if (timesheet.status !== "draft") {
    throw new HttpException(
      "Cannot update timesheet that is not in draft status",
      409,
    );
  }
  if (
    props.body.status === "rejected" &&
    (props.body.rejection_reason === undefined ||
      props.body.rejection_reason === null ||
      props.body.rejection_reason.length === 0)
  ) {
    throw new HttpException(
      "Rejection reason is required when status is rejected",
      400,
    );
  }
  if (
    props.body.week_start_date !== undefined ||
    props.body.week_end_date !== undefined
  ) {
    const startDate = props.body.week_start_date ?? timesheet.week_start_date;
    const endDate = props.body.week_end_date ?? timesheet.week_end_date;
    const conflicting = await MyGlobal.prisma.hrm_timesheets.findFirst({
      where: {
        hrm_employee_id: timesheet.hrm_employee_id,
        id: { not: props.timesheetId },
        week_start_date: {
          lte: new Date(endDate),
        },
        week_end_date: {
          gte: new Date(startDate),
        },
        status: {
          in: ["submitted", "approved"],
        },
        deleted_at: null,
      },
    });
    if (conflicting !== null) {
      throw new HttpException(
        "A timesheet for this week period already exists in submitted or approved status",
        409,
      );
    }
  }
  await MyGlobal.prisma.hrm_timesheets.update({
    where: { id: props.timesheetId },
    data: {
      updated_at: new Date(),
      ...(props.body.week_start_date !== undefined && {
        week_start_date: props.body.week_start_date,
      }),
      ...(props.body.week_end_date !== undefined && {
        week_end_date: props.body.week_end_date,
      }),
      ...(props.body.status !== undefined && { status: props.body.status }),
      ...(props.body.rejection_reason !== undefined && {
        rejection_reason: props.body.rejection_reason,
      }),
    },
  });
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
// export async function putHrmMemberTimesheetsTimesheetId(props: {
//   member: MemberPayload;
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