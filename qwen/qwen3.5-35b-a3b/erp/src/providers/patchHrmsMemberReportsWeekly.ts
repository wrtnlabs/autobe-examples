import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IHrmsProject } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmsProject";
import { IHrmsTimelog } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmsTimelog";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { IPageIHrmsTimelog } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIHrmsTimelog";
import { IWeekRange } from "@ORGANIZATION/PROJECT-api/lib/structures/IWeekRange";
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

export async function patchHrmsMemberReportsWeekly(props: {
  member: MemberPayload;
  body: IHrmsTimelog;
}): Promise<IPageIHrmsTimelog.ISummary> {
  const dateRange = props.body.current_week;
  if (!dateRange || !dateRange.start_date || !dateRange.end_date) {
    throw new HttpException(
      "dateRange.start_date and dateRange.end_date are required",
      400,
    );
  }
  const startDate = new Date(dateRange.start_date);
  const endDate = new Date(dateRange.end_date);
  if (startDate > endDate) {
    throw new HttpException("Start date must be on or before end date", 400);
  }
  const orgMember = await MyGlobal.prisma.hrms_organization_members.findFirst({
    where: {
      hrms_member_id: props.member.id,
      deleted_at: null,
    },
    select: {
      id: true,
      hrms_organization_id: true,
    },
  });
  if (!orgMember) {
    throw new HttpException("User has no organization membership", 404);
  }
  const organization =
    await MyGlobal.prisma.hrms_organizations.findUniqueOrThrow({
      where: { id: orgMember.hrms_organization_id },
    });
  const employeeIdsResult = await MyGlobal.prisma.hrms_employees.findMany({
    where: {
      hrms_organization_id: organization.id,
      deleted_at: null,
    } as Prisma.hrms_employeesWhereInput,
    select: { id: true },
  } satisfies Prisma.hrms_employeesFindManyArgs);
  const employeeIds = employeeIdsResult.map((e) => e.id);
  const whereInput: Prisma.hrms_timelogsWhereInput = {
    employee_id: { in: employeeIds },
    date: {
      gte: startDate,
      lte: endDate,
    },
    deleted_at: null,
  };
  const timelogs = await MyGlobal.prisma.hrms_timelogs.findMany({
    where: whereInput,
    select: {
      id: true,
      employee_id: true,
      project_id: true,
      date: true,
      duration_minutes: true,
    },
    orderBy: { date: "asc" },
  });
  const weeklyAggregation = new Map<
    string,
    {
      weekStart: string & tags.Format<"date">;
      weekUuid: string & tags.Format<"uuid">;
      totalHours: number;
      totalTimelogs: number;
      employeeIds: Set<string>;
    }
  >();
  const timeZone = organization.timezone ?? "Asia/Seoul";
  const timeOffsetMs = getTimezoneOffsetMs(startDate, timeZone);
  for (const timelog of timelogs) {
    const logDate = new Date(timelog.date.getTime() + timeOffsetMs);
    const weekStart = getMonday(logDate);
    const weekKey = formatIsoDate(weekStart);
    const weekUuid = v4() as string & tags.Format<"uuid">;
    if (!weeklyAggregation.has(weekKey)) {
      weeklyAggregation.set(weekKey, {
        weekStart: weekKey,
        weekUuid: weekUuid,
        totalHours: 0,
        totalTimelogs: 0,
        employeeIds: new Set<string>(),
      });
    }
    const week = weeklyAggregation.get(weekKey)!;
    week.totalHours += timelog.duration_minutes / 60;
    week.totalTimelogs += 1;
    week.employeeIds.add(timelog.employee_id);
  }
  const data = Array.from(weeklyAggregation.values()).map(
    (week) =>
      ({
        group_id: week.weekUuid,
        group_name: "",
        total_hours: week.totalHours,
        billable_hours: 0,
        non_billable_hours: 0,
      }) satisfies IHrmsTimelog.ISummary,
  );
  const pagination: IPage.IPagination = {
    current: 1,
    limit: data.length,
    records: data.length,
    pages: data.length > 0 ? 1 : 0,
  } satisfies IPage.IPagination;
  return {
    data,
    pagination,
  } satisfies IPageIHrmsTimelog.ISummary;
}
function formatIsoDate(date: Date): string & tags.Format<"date"> {
  return date.toISOString().split("T")[0] as string & tags.Format<"date">;
}
function getMonday(date: Date): Date {
  const day = date.getDay();
  const diff = date.getDate() - day + (day === 0 ? -6 : 1);
  const monday = new Date(date);
  monday.setDate(diff);
  monday.setHours(0, 0, 0, 0);
  return monday;
}
function getTimezoneOffsetMs(date: Date, timeZone: string): number {
  const now = Date.now();
  const dateObj = new Date(now);
  const options: Intl.DateTimeFormatOptions = {
    timeZone,
    timeZoneName: "long",
  };
  const offsetStr = new Intl.DateTimeFormat("en-US", options)
    .formatToParts(dateObj)
    .find((part) => part.type === "timeZoneName");
  if (!offsetStr) return 0;
  const match = offsetStr.value.match(/(UTC)([+-]?\d*):?\d*/);
  if (!match) return 0;
  const sign = match[2]?.startsWith("-") ? -1 : 1;
  const hours = parseInt(match[2] || "0", 10) || 0;
  const minutes = new Intl.DateTimeFormat("en-US", {
    ...options,
    timeZoneName: "short",
  })
    .formatToParts(dateObj)
    .find((part) => part.type === "timeZoneName")
    ?.value.match(/\d+/);
  const minutesOffset = minutes ? parseInt(minutes[0], 10) || 0 : 0;
  return sign * (hours * 60 + minutesOffset) * 60000;
}
