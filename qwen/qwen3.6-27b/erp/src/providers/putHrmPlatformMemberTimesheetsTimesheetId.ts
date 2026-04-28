import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IHrmPlatformDepartment } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformDepartment";
import { IHrmPlatformEmployee } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformEmployee";
import { IHrmPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformMember";
import { IHrmPlatformOrganization } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformOrganization";
import { IHrmPlatformProject } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformProject";
import { IHrmPlatformRole } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformRole";
import { IHrmPlatformTask } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformTask";
import { IHrmPlatformTimelog } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformTimelog";
import { IHrmPlatformTimesheet } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformTimesheet";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { MemberPayload } from "../decorators/payload/MemberPayload";
import { HrmPlatformTimesheetTransformer } from "../transformers/HrmPlatformTimesheetTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function putHrmPlatformMemberTimesheetsTimesheetId(props: {
  member: MemberPayload;
  timesheetId: string & tags.Format<"uuid">;
  body: IHrmPlatformTimesheet.IUpdate;
}): Promise<IHrmPlatformTimesheet> {
  const timesheet =
    await MyGlobal.prisma.hrm_platform_timesheets.findUniqueOrThrow({
      where: { id: props.timesheetId },
      select: {
        id: true,
        hrm_platform_employee_id: true,
        status: true,
        week_start_date: true,
        week_end_date: true,
      },
    });
  const employee = await MyGlobal.prisma.hrm_platform_employees.findFirst({
    where: {
      hrm_platform_member_id: props.member.id,
    },
    select: {
      id: true,
    },
  });
  if (!employee) {
    throw new HttpException("Employee record not found for this member", 404);
  }
  if (timesheet.hrm_platform_employee_id !== employee.id) {
    throw new HttpException(
      "You are not authorized to edit this timesheet",
      403,
    );
  }
  if (timesheet.status !== "draft") {
    throw new HttpException(
      "Timesheet can only be updated in draft status",
      400,
    );
  }
  const currentTimelogs = await MyGlobal.prisma.hrm_platform_timelogs.findMany({
    where: { hrm_platform_timesheet_id: props.timesheetId },
    select: { id: true },
  });
  const currentTimelogIds = new Set(currentTimelogs.map((t) => t.id));
  const requestTimelogIds = new Set(props.body.timelogIds);
  const additions = [...requestTimelogIds].filter(
    (id) => !currentTimelogIds.has(id),
  );
  const removals = [...currentTimelogIds].filter(
    (id) => !requestTimelogIds.has(id),
  );
  const weekStart = toISOStringSafe(timesheet.week_start_date);
  const weekEnd = toISOStringSafe(timesheet.week_end_date);
  if (additions.length > 0) {
    const additionTimelogs =
      await MyGlobal.prisma.hrm_platform_timelogs.findMany({
        where: { id: { in: additions } },
        select: {
          id: true,
          hrm_platform_employee_id: true,
          hrm_platform_timesheet_id: true,
          date: true,
        },
      });
    for (const timelog of additionTimelogs) {
      if (timelog.hrm_platform_employee_id !== employee.id) {
        throw new HttpException(
          `Timelog ${timelog.id} does not belong to you`,
          403,
        );
      }
      const timelogDate = toISOStringSafe(timelog.date);
      if (timelogDate < weekStart || timelogDate > weekEnd) {
        throw new HttpException(
          `Timelog ${timelog.id} date is outside the timesheet week range`,
          400,
        );
      }
      if (
        timelog.hrm_platform_timesheet_id !== null &&
        timelog.hrm_platform_timesheet_id !== props.timesheetId
      ) {
        throw new HttpException(
          `Timelog ${timelog.id} is already part of another timesheet`,
          400,
        );
      }
    }
  }
  if (removals.length > 0) {
    await MyGlobal.prisma.hrm_platform_timelogs.updateMany({
      where: {
        id: { in: removals },
        hrm_platform_timesheet_id: props.timesheetId,
      },
      data: { hrm_platform_timesheet_id: null },
    });
  }
  if (additions.length > 0) {
    await MyGlobal.prisma.hrm_platform_timelogs.updateMany({
      where: {
        id: { in: additions },
      },
      data: { hrm_platform_timesheet_id: props.timesheetId },
    });
  }
  const updatedTimelogs = await MyGlobal.prisma.hrm_platform_timelogs.findMany({
    where: { hrm_platform_timesheet_id: props.timesheetId },
    select: { duration_minutes: true },
  });
  const totalHours = updatedTimelogs.reduce(
    (sum, t) => sum + t.duration_minutes / 60.0,
    0,
  );
  await MyGlobal.prisma.hrm_platform_timesheets.update({
    where: { id: props.timesheetId },
    data: {
      total_hours: totalHours,
      updated_at: new Date(),
    },
  });
  const result =
    await MyGlobal.prisma.hrm_platform_timesheets.findUniqueOrThrow({
      where: { id: props.timesheetId },
      ...HrmPlatformTimesheetTransformer.select(),
    });
  return await HrmPlatformTimesheetTransformer.transform(result);
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
// import { IHrmPlatformTimesheet } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformTimesheet";
// import { IHrmPlatformEmployee } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformEmployee";
// import { IHrmPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformMember";
// import { IHrmPlatformRole } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformRole";
// import { IHrmPlatformDepartment } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformDepartment";
// import { IHrmPlatformTimelog } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformTimelog";
// import { IHrmPlatformProject } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformProject";
// import { IHrmPlatformOrganization } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformOrganization";
// import { IHrmPlatformTask } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformTask";
// 
// // DON'T CHANGE FUNCTION NAME AND PARAMETERS,
// // ONLY YOU HAVE TO WRITE THIS FUNCTION BODY, AND USE IMPORTED.
// export async function putHrmPlatformMemberTimesheetsTimesheetId(props: {
//   member: MemberPayload;
//   timesheetId: string & tags.Format<"uuid">;
//   body: IHrmPlatformTimesheet.IUpdate;
// }): Promise<IHrmPlatformTimesheet> {
//   await MyGlobal.prisma.hrm_platform_timesheets.update({
//     where: { ... },
//     data: { ... },
//   });
//   const updated = await MyGlobal.prisma.hrm_platform_timesheets.findUniqueOrThrow({
//     where: { ... },
//     ...HrmPlatformTimesheetTransformer.select(),
//   });
//   return await HrmPlatformTimesheetTransformer.transform(updated);
// }
// ```
//--------------------------------------------------------------