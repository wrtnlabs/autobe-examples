import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IErpHrmDepartment } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmDepartment";
import { IErpHrmEmployee } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmEmployee";
import { IErpHrmMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmMember";
import { IErpHrmProject } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmProject";
import { IErpHrmRole } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmRole";
import { IErpHrmTask } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmTask";
import { IErpHrmTimelog } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmTimelog";
import { IErpHrmTimesheet } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmTimesheet";
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
  const timesheet = await MyGlobal.prisma.erp_hrm_timesheets.findUniqueOrThrow({
    where: { id: props.timesheetId, deleted_at: null },
    select: {
      id: true,
      employee_id: true,
      status: true,
      week_start_date: true,
      week_end_date: true,
    },
  });
  if (timesheet.status !== "draft") {
    throw new HttpException("Timesheet is not in draft status", 409);
  }
  const session =
    await MyGlobal.prisma.erp_hrm_member_sessions.findUniqueOrThrow({
      where: { id: props.member.session_id },
      select: { erp_hrm_organization_id: true },
    });
  const employee = await MyGlobal.prisma.erp_hrm_employees.findFirstOrThrow({
    where: {
      erp_hrm_member_id: props.member.id,
      erp_hrm_organization_id: session.erp_hrm_organization_id ?? undefined,
      deleted_at: null,
    },
    select: { id: true, erp_hrm_role_id: true },
  });
  const isOwner = timesheet.employee_id === employee.id;
  if (!isOwner) {
    const role = await MyGlobal.prisma.erp_hrm_roles.findUniqueOrThrow({
      where: { id: employee.erp_hrm_role_id },
      select: { name: true, is_builtin: true },
    });
    const roleIsOwner: boolean = role.is_builtin && role.name === "Owner";
    let hasTimeManage: boolean = roleIsOwner;
    if (!hasTimeManage) {
      const timeManagePerm =
        await MyGlobal.prisma.erp_hrm_permissions.findFirst({
          where: { key: "time:manage" },
          select: { id: true },
        });
      if (timeManagePerm !== null) {
        const rolePerm =
          await MyGlobal.prisma.erp_hrm_role_permissions.findFirst({
            where: {
              erp_hrm_role_id: employee.erp_hrm_role_id,
              permission: { id: timeManagePerm.id },
            },
          });
        hasTimeManage = rolePerm !== null;
      }
    }
    if (!hasTimeManage) {
      throw new HttpException("Forbidden", 403);
    }
  }
  const startStr: (string & tags.Format<"date-time">) | undefined =
    props.body.week_start_date;
  const endStr: (string & tags.Format<"date-time">) | undefined =
    props.body.week_end_date;
  if (startStr === undefined && endStr === undefined) {
    const current = await MyGlobal.prisma.erp_hrm_timesheets.findUniqueOrThrow({
      where: { id: props.timesheetId },
      ...ErpHrmTimesheetTransformer.select(),
    });
    return await ErpHrmTimesheetTransformer.transform(current);
  }
  const parseISODate = (
    iso: string,
  ): {
    year: number;
    month: number;
    day: number;
  } => {
    const match: RegExpMatchArray | null = iso.match(
      /^(\d{4})-(\d{2})-(\d{2})/,
    );
    if (match === null) {
      throw new HttpException("Invalid ISO date format", 422);
    }
    return {
      year: parseInt(match[1], 10),
      month: parseInt(match[2], 10),
      day: parseInt(match[3], 10),
    };
  };
  const getDayOfWeek = (year: number, month: number, day: number): number => {
    const adjustedMonth: number = month < 3 ? month + 12 : month;
    const adjustedYear: number = month < 3 ? year - 1 : year;
    const k: number = adjustedYear % 100;
    const j: number = Math.floor(adjustedYear / 100);
    const h: number =
      (day +
        Math.floor((13 * (adjustedMonth + 1)) / 5) +
        k +
        Math.floor(k / 4) +
        Math.floor(j / 4) +
        5 * j) %
      7;
    return ((h + 5) % 7) + 1;
  };
  const isLeapYear = (year: number): boolean => {
    return (year % 4 === 0 && year % 100 !== 0) || year % 400 === 0;
  };
  const daysInMonth = (year: number, month: number): number => {
    const days: number[] = [
      31,
      isLeapYear(year) ? 29 : 28,
      31,
      30,
      31,
      30,
      31,
      31,
      30,
      31,
      30,
      31,
    ];
    return days[month - 1];
  };
  const addDays = (
    year: number,
    month: number,
    day: number,
    delta: number,
  ): {
    year: number;
    month: number;
    day: number;
  } => {
    let y: number = year;
    let m: number = month;
    let d: number = day + delta;
    while (d > daysInMonth(y, m)) {
      d -= daysInMonth(y, m);
      m += 1;
      if (m > 12) {
        m = 1;
        y += 1;
      }
    }
    while (d < 1) {
      m -= 1;
      if (m < 1) {
        m = 12;
        y -= 1;
      }
      d += daysInMonth(y, m);
    }
    return { year: y, month: m, day: d };
  };
  const countDaysSinceEpoch = (
    year: number,
    month: number,
    day: number,
  ): number => {
    let total: number = 0;
    for (let y: number = 1970; y < year; y++) {
      total += isLeapYear(y) ? 366 : 365;
    }
    for (let m: number = 1; m < month; m++) {
      total += daysInMonth(year, m);
    }
    total += day - 1;
    return total;
  };
  const formatISODate = (year: number, month: number, day: number): string => {
    const y: string = year.toString().padStart(4, "0");
    const m: string = month.toString().padStart(2, "0");
    const d: string = day.toString().padStart(2, "0");
    return `${y}-${m}-${d}T00:00:00.000Z`;
  };
  let newWeekStart: string & tags.Format<"date-time">;
  let newWeekEnd: string & tags.Format<"date-time">;
  if (startStr !== undefined && endStr !== undefined) {
    const startParsed = parseISODate(startStr);
    const endParsed = parseISODate(endStr);
    if (
      getDayOfWeek(startParsed.year, startParsed.month, startParsed.day) !== 1
    ) {
      throw new HttpException("week_start_date must be a Monday", 422);
    }
    if (getDayOfWeek(endParsed.year, endParsed.month, endParsed.day) !== 0) {
      throw new HttpException("week_end_date must be a Sunday", 422);
    }
    const startEpoch: number = countDaysSinceEpoch(
      startParsed.year,
      startParsed.month,
      startParsed.day,
    );
    const endEpoch: number = countDaysSinceEpoch(
      endParsed.year,
      endParsed.month,
      endParsed.day,
    );
    if (endEpoch - startEpoch !== 6) {
      throw new HttpException(
        "week_end_date must be exactly 6 days after week_start_date",
        422,
      );
    }
    newWeekStart = startStr;
    newWeekEnd = endStr;
  } else if (startStr !== undefined) {
    const startParsed = parseISODate(startStr);
    if (
      getDayOfWeek(startParsed.year, startParsed.month, startParsed.day) !== 1
    ) {
      throw new HttpException("week_start_date must be a Monday", 422);
    }
    const endParsed = addDays(
      startParsed.year,
      startParsed.month,
      startParsed.day,
      6,
    );
    newWeekStart = startStr;
    newWeekEnd = formatISODate(
      endParsed.year,
      endParsed.month,
      endParsed.day,
    ) as string & tags.Format<"date-time">;
  } else {
    const endStrValue: string & tags.Format<"date-time"> = endStr as string &
      tags.Format<"date-time">;
    const endParsed = parseISODate(endStrValue);
    if (getDayOfWeek(endParsed.year, endParsed.month, endParsed.day) !== 0) {
      throw new HttpException("week_end_date must be a Sunday", 422);
    }
    const startParsed = addDays(
      endParsed.year,
      endParsed.month,
      endParsed.day,
      -6,
    );
    newWeekEnd = endStrValue;
    newWeekStart = formatISODate(
      startParsed.year,
      startParsed.month,
      startParsed.day,
    ) as string & tags.Format<"date-time">;
  }
  const conflict = await MyGlobal.prisma.erp_hrm_timesheets.findFirst({
    where: {
      employee_id: timesheet.employee_id,
      week_start_date: newWeekStart,
      deleted_at: null,
      id: { not: props.timesheetId },
    },
    select: { id: true },
  });
  if (conflict !== null) {
    throw new HttpException(
      "Another timesheet already exists for this calendar week",
      409,
    );
  }
  await MyGlobal.prisma.erp_hrm_timesheets.update({
    where: { id: props.timesheetId },
    data: {
      week_start_date: new Date(newWeekStart),
      week_end_date: new Date(newWeekEnd),
      updated_at: new Date(),
    },
  });
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
// import { IErpHrmDepartment } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmDepartment";
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