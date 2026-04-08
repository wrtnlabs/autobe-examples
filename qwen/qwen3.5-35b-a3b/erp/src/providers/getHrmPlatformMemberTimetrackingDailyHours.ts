import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IPlatformTimeTrackingDailyHour } from "@ORGANIZATION/PROJECT-api/lib/structures/IPlatformTimeTrackingDailyHour";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { MemberPayload } from "../decorators/payload/MemberPayload";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function getHrmPlatformMemberTimetrackingDailyHours(props: {
  member: MemberPayload;
}): Promise<IPlatformTimeTrackingDailyHour.IResponse> {
  const employeeRecord = await MyGlobal.prisma.hrm_platform_employees.findFirst(
    {
      where: {
        hrm_platform_member_id: props.member.id,
        deleted_at: null,
      },
      select: {
        id: true,
        hrm_platform_organization_id: true,
      },
    },
  );
  if (
    employeeRecord === null ||
    employeeRecord.hrm_platform_organization_id === null
  ) {
    throw new HttpException("Employee record not found", 404);
  }
  const employeeId = employeeRecord.id;
  const organizationId = employeeRecord.hrm_platform_organization_id;
  const timezoneConfig =
    await MyGlobal.prisma.hrm_platform_time_tracking_timezones.findFirst({
      where: {
        organization_id: organizationId,
        deleted_at: null,
      },
      select: {
        timezone: true,
      },
    });
  if (timezoneConfig === null) {
    throw new HttpException("Organization timezone not configured", 400);
  }
  const timeZone = timezoneConfig.timezone;
  const now = new Date();
  const options: Intl.DateTimeFormatOptions = {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  } as const;
  const dateFormatter = new Intl.DateTimeFormat("en-CA", options);
  const dateParts = dateFormatter.formatToParts(now);
  const dateMap = new Map<string, string>();
  dateParts.forEach((part) => {
    dateMap.set(part.type, part.value);
  });
  const year = dateMap.get("year") ?? "0000";
  const month = dateMap.get("month") ?? "00";
  const day = dateMap.get("day") ?? "00";
  const dateContext: string & tags.Format<"date"> = `${year}-${month}-${day}`;
  const todayStart: string & tags.Format<"date-time"> =
    `${dateContext}T00:00:00.000Z`;
  const todayEnd: string & tags.Format<"date-time"> =
    `${dateContext}T23:59:59.999Z`;
  const timelogs = await MyGlobal.prisma.hrm_platform_timelogs.findMany({
    where: {
      employee_id: employeeId,
      start_datetime: {
        gte: todayStart,
        lte: todayEnd,
      },
      deleted_at: null,
    },
    select: {
      duration_minutes: true,
    },
  });
  const totalMinutes = timelogs.reduce(
    (sum: number, timelog) => sum + timelog.duration_minutes,
    0,
  );
  const hours = totalMinutes / 60;
  return {
    hours,
    date: dateContext,
  } satisfies IPlatformTimeTrackingDailyHour.IResponse;
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
// import { IPlatformTimeTrackingDailyHour } from "@ORGANIZATION/PROJECT-api/lib/structures/IPlatformTimeTrackingDailyHour";
// 
// // DON'T CHANGE FUNCTION NAME AND PARAMETERS,
// // ONLY YOU HAVE TO WRITE THIS FUNCTION BODY, AND USE IMPORTED.
// export async function getHrmPlatformMemberTimetrackingDailyHours(props: {
//   member: MemberPayload;
// }): Promise<IPlatformTimeTrackingDailyHour.IResponse> {
//   // No matching Collector/Transformer found for this operation.
//     // You MUST call getDatabaseSchemas first to get exact relation property names.
//     // NEVER guess relation names from table names — always verify against the schema.
//     ...
// }
// ```
//--------------------------------------------------------------