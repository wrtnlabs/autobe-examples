import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IHrmPlatformDepartment } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformDepartment";
import { IHrmPlatformEmployee } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformEmployee";
import { IHrmPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformMember";
import { IHrmPlatformOrganization } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformOrganization";
import { IHrmPlatformRole } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformRole";
import { IHrmPlatformTimesheetWeeklyStat } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformTimesheetWeeklyStat";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { MemberPayload } from "../decorators/payload/MemberPayload";
import { HrmPlatformTimesheetWeeklyStatAtSummaryTransformer } from "../transformers/HrmPlatformTimesheetWeeklyStatAtSummaryTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function getHrmPlatformMemberTimetrackingWeeklyHoursEmployeeId(props: {
  member: MemberPayload;
  employeeId: string & tags.Format<"uuid">;
}): Promise<IHrmPlatformTimesheetWeeklyStat.ISummary> {
  const session =
    await MyGlobal.prisma.hrm_platform_member_sessions.findFirstOrThrow({
      where: {
        id: props.member.session_id,
        expired_at: { gt: new Date() },
        hrm_platform_member_id: props.member.id,
        member: {
          id: props.member.id,
          is_active: true,
          deleted_at: null,
        },
      },
      select: { organization_id: true },
    });
  if (session.organization_id === null) {
    throw new HttpException("Organization ID is null", 400);
  }
  const employee =
    await MyGlobal.prisma.hrm_platform_employees.findFirstOrThrow({
      where: {
        id: props.employeeId,
        hrm_platform_organization_id: session.organization_id,
        deleted_at: null,
      },
      select: { id: true },
    });
  const currentISO = "2026-04-07T23:56:46.472Z";
  const [datePart] = currentISO.split("T");
  const [yearStr, monthStr, dayStr] = datePart.split("-").map(Number);
  const dayOfWeek = (() => {
    const zeller = (y: number, m: number, d: number) => {
      let yy = y;
      let mm = m;
      if (mm < 3) {
        yy -= 1;
        mm += 12;
      }
      const k = yy % 100;
      const j = Math.floor(yy / 100);
      const h =
        (d +
          Math.floor((13 * (mm + 1)) / 5) +
          k +
          Math.floor(k / 4) +
          Math.floor(j / 4) -
          2 * j) %
        7;
      return ((h + 6) % 7) + 1;
    };
    return zeller(yearStr, monthStr, dayStr);
  })();
  const mondayOffset = dayOfWeek - 1;
  let mondayDay = dayStr - mondayOffset;
  let mondayMonth = monthStr;
  let mondayYear = yearStr;
  if (mondayDay < 1) {
    mondayMonth -= 1;
    if (mondayMonth < 1) {
      mondayMonth = 12;
      mondayYear -= 1;
    }
    const daysInMonth = new Date(
      Date.UTC(mondayYear, mondayMonth, 0),
    ).getUTCDate();
    mondayDay = daysInMonth + mondayDay;
  }
  const mondayMonthStr =
    mondayMonth < 10 ? `0${mondayMonth}` : `${mondayMonth}`;
  const mondayDayStr = mondayDay < 10 ? `0${mondayDay}` : `${mondayDay}`;
  const weekStart = `${mondayYear}-${mondayMonthStr}-${mondayDayStr}T00:00:00.000Z`;
  const record =
    await MyGlobal.prisma.hrm_platform_timesheet_weekly_stats.findFirstOrThrow({
      ...HrmPlatformTimesheetWeeklyStatAtSummaryTransformer.select(),
      where: {
        employee_id: props.employeeId,
        week_start: weekStart,
      },
    });
  return await HrmPlatformTimesheetWeeklyStatAtSummaryTransformer.transform(
    record,
  );
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
// import { IHrmPlatformTimesheetWeeklyStat } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformTimesheetWeeklyStat";
// import { IHrmPlatformOrganization } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformOrganization";
// import { IHrmPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformMember";
// import { IHrmPlatformEmployee } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformEmployee";
// import { IHrmPlatformRole } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformRole";
// import { IHrmPlatformDepartment } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformDepartment";
// 
// // DON'T CHANGE FUNCTION NAME AND PARAMETERS,
// // ONLY YOU HAVE TO WRITE THIS FUNCTION BODY, AND USE IMPORTED.
// export async function getHrmPlatformMemberTimetrackingWeeklyHoursEmployeeId(props: {
//   member: MemberPayload;
//   employeeId: string & tags.Format<"uuid">;
// }): Promise<IHrmPlatformTimesheetWeeklyStat.ISummary> {
//   const record = await MyGlobal.prisma.hrm_platform_timesheet_weekly_stats.findFirstOrThrow({
//     ...HrmPlatformTimesheetWeeklyStatAtSummaryTransformer.select(),
//     where: { ... },
//   });
//   return await HrmPlatformTimesheetWeeklyStatAtSummaryTransformer.transform(record);
// }
// ```
//--------------------------------------------------------------