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
  const page = props.body.page ?? 1;
  const limit = props.body.limit ?? 100;
  const skip = (page - 1) * limit;
  const employee = await MyGlobal.prisma.hrm_platform_employees.findFirst({
    where: {
      member_id: props.member.id,
      deleted_at: null,
    },
    select: {
      organization_id: true,
    },
  });
  if (!employee) {
    throw new HttpException("Employee record not found", 404);
  }
  const whereConditions: Prisma.hrm_platform_timelogsWhereInput = {
    deleted_at: null,
    employee: {
      organization_id: employee.organization_id,
      deleted_at: null,
    },
  };
  if (props.body.from_date || props.body.to_date) {
    whereConditions.date = {};
    if (props.body.from_date) {
      whereConditions.date.gte = new Date(props.body.from_date);
    }
    if (props.body.to_date) {
      whereConditions.date.lte = new Date(props.body.to_date);
    }
  }
  if (props.body.project_code) {
    const project = await MyGlobal.prisma.hrm_platform_projects.findFirst({
      where: {
        id: props.body.project_code,
        organization_id: employee.organization_id,
        deleted_at: null,
      },
      select: {
        id: true,
      },
    });
    if (!project) {
      throw new HttpException("Project not found", 404);
    }
    whereConditions.project_id = project.id;
  }
  const timelogs = await MyGlobal.prisma.hrm_platform_timelogs.findMany({
    where: whereConditions,
    select: {
      id: true,
      date: true,
      duration_minutes: true,
      employee_id: true,
    },
    orderBy: {
      date: "desc",
    },
    skip,
    take: limit,
  });
  const total = await MyGlobal.prisma.hrm_platform_timelogs.count({
    where: whereConditions,
  });
  const weeklyData = new Map<
    string,
    {
      totalMinutes: number;
      timelogCount: number;
      employeeIds: Set<string>;
    }
  >();
  for (const timelog of timelogs) {
    const weekStart = getWeekStart(timelog.date);
    const weekKey = toISOStringSafe(weekStart);
    if (!weeklyData.has(weekKey)) {
      weeklyData.set(weekKey, {
        totalMinutes: 0,
        timelogCount: 0,
        employeeIds: new Set(),
      });
    }
    const weekData = weeklyData.get(weekKey)!;
    weekData.totalMinutes += timelog.duration_minutes;
    weekData.timelogCount += 1;
    weekData.employeeIds.add(timelog.employee_id);
  }
  const data: IHrmPlatformWeeklySummaryReport.ISummary[] = [];
  for (const [weekKey, weekData] of weeklyData.entries()) {
    const weekStart = new Date(weekKey);
    const weekEnd = new Date(weekStart);
    weekEnd.setDate(weekEnd.getDate() + 6);
    weekEnd.setHours(23, 59, 59, 999);
    data.push({
      weekStart: toISOStringSafe(weekStart),
      weekEnd: toISOStringSafe(weekEnd),
      totalHours: weekData.totalMinutes / 60,
      timelogCount: weekData.timelogCount,
      employeeCount: weekData.employeeIds.size,
    });
  }
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
function getWeekStart(date: Date): Date {
  const result = new Date(date);
  const day = result.getDay();
  const diff = result.getDate() - day + (day === 0 ? -6 : 1);
  result.setDate(diff);
  result.setHours(0, 0, 0, 0);
  return result;
}
