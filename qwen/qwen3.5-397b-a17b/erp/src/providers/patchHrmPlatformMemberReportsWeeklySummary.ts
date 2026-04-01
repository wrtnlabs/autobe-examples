import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IHrmPlatformWeeklySummaryReport } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformWeeklySummaryReport";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { IPageIHrmPlatformWeeklySummaryReport } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIHrmPlatformWeeklySummaryReport";
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

export async function patchHrmPlatformMemberReportsWeeklySummary(props: {
  member: MemberPayload;
  body: IHrmPlatformWeeklySummaryReport.IRequest;
}): Promise<IPageIHrmPlatformWeeklySummaryReport.ISummary> {
  const page: number & tags.Type<"int32"> & tags.Minimum<0> =
    props.body.page ?? 1;
  const limit: number & tags.Type<"int32"> & tags.Minimum<0> =
    props.body.limit ?? 100;
  const skip = (page - 1) * limit;
  const employee =
    await MyGlobal.prisma.hrm_platform_employees.findFirstOrThrow({
      where: {
        user_id: props.member.id,
        deleted_at: null,
      },
      select: {
        organization_id: true,
      },
    });
  let projectId: string | undefined;
  if (props.body.projectCode !== undefined) {
    const project = await MyGlobal.prisma.hrm_platform_projects.findFirst({
      where: {
        organization_id: employee.organization_id,
        deleted_at: null,
      },
      select: {
        id: true,
        name: true,
      },
    });
    if (project && project.name === props.body.projectCode) {
      projectId = project.id;
    }
  }
  const startDate = new Date(props.body.startDate);
  const endDate = new Date(props.body.endDate);
  const whereInput = {
    employee: {
      organization_id: employee.organization_id,
      deleted_at: null,
    },
    date: {
      gte: startDate,
      lte: endDate,
    },
    deleted_at: null,
    ...(projectId && { project_id: projectId }),
  } satisfies Prisma.hrm_platform_timelogsWhereInput;
  const timelogs = await MyGlobal.prisma.hrm_platform_timelogs.findMany({
    where: whereInput,
    select: {
      id: true,
      date: true,
      duration_minutes: true,
      employee_id: true,
    },
    orderBy: {
      date: "asc",
    },
  });
  const weeklyData = new Map<
    string,
    {
      weekStart: Date;
      weekEnd: Date;
      totalMinutes: number;
      timelogCount: number;
      employeeIds: Set<string>;
    }
  >();
  for (const timelog of timelogs) {
    const date = timelog.date;
    const dayOfWeek = date.getDay();
    const diffToMonday = dayOfWeek === 0 ? -6 : 1 - dayOfWeek;
    const weekStart = new Date(date);
    weekStart.setDate(date.getDate() + diffToMonday);
    weekStart.setHours(0, 0, 0, 0);
    const weekEnd = new Date(weekStart);
    weekEnd.setDate(weekStart.getDate() + 6);
    weekEnd.setHours(23, 59, 59, 999);
    const weekKey = weekStart.toISOString();
    const existing = weeklyData.get(weekKey);
    if (existing) {
      existing.totalMinutes += timelog.duration_minutes;
      existing.timelogCount += 1;
      existing.employeeIds.add(timelog.employee_id);
    } else {
      weeklyData.set(weekKey, {
        weekStart,
        weekEnd,
        totalMinutes: timelog.duration_minutes,
        timelogCount: 1,
        employeeIds: new Set([timelog.employee_id]),
      });
    }
  }
  const allWeeks = Array.from(weeklyData.values()).sort((a, b) => {
    return b.weekStart.getTime() - a.weekStart.getTime();
  });
  const total = allWeeks.length;
  const paginatedWeeks = allWeeks.slice(skip, skip + limit);
  const data: IHrmPlatformWeeklySummaryReport.ISummary[] = paginatedWeeks.map(
    (week) => ({
      weekStart: week.weekStart.toISOString(),
      weekEnd: week.weekEnd.toISOString(),
      totalHours: week.totalMinutes / 60,
      timelogCount: week.timelogCount,
      employeeCount: week.employeeIds.size,
    }),
  );
  return {
    pagination: {
      current: page,
      limit: limit,
      records: total,
      pages: Math.ceil(total / limit),
    } satisfies IPage.IPagination,
    data,
  } satisfies IPageIHrmPlatformWeeklySummaryReport.ISummary;
}
