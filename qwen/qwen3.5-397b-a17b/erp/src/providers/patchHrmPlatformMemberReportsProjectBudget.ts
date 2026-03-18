import { IEHrmPlatformProjectStatus } from "@ORGANIZATION/PROJECT-api/lib/structures/IEHrmPlatformProjectStatus";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IHrmPlatformProjectBudgetReport } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformProjectBudgetReport";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { IPageIHrmPlatformProjectBudgetReport } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIHrmPlatformProjectBudgetReport";
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

export async function patchHrmPlatformMemberReportsProjectBudget(props: {
  member: MemberPayload;
  body: IHrmPlatformProjectBudgetReport.IRequest;
}): Promise<IPageIHrmPlatformProjectBudgetReport.ISummary> {
  const session =
    await MyGlobal.prisma.hrm_platform_member_sessions.findUniqueOrThrow({
      where: { id: props.member.session_id },
      select: { member: { select: { id: true } } },
    });
  const employee =
    await MyGlobal.prisma.hrm_platform_employees.findFirstOrThrow({
      where: {
        member_id: session.member.id,
        deleted_at: null,
      },
      select: { organization_id: true },
    });
  const page = props.body.page ?? 1;
  const limit = props.body.limit ?? 20;
  const skip = (page - 1) * limit;
  const sort = props.body.sort ?? "utilization_percentage";
  const direction = props.body.direction ?? "desc";
  const projectWhere: Prisma.hrm_platform_projectsWhereInput = {
    organization_id: employee.organization_id,
    deleted_at: null,
    ...(props.body.search && {
      name: { contains: props.body.search, mode: "insensitive" },
    }),
    ...(props.body.status && {
      status: props.body.status,
    }),
  };
  const dateFrom = props.body.dateFrom
    ? new Date(props.body.dateFrom)
    : undefined;
  const dateTo = props.body.dateTo ? new Date(props.body.dateTo) : undefined;
  const timelogWhere: Prisma.hrm_platform_timelogsWhereInput = {
    deleted_at: null,
    ...(dateFrom && { date: { gte: dateFrom } }),
    ...(dateTo && { date: { lte: dateTo } }),
  };
  const projects = await MyGlobal.prisma.hrm_platform_projects.findMany({
    where: projectWhere,
    select: {
      id: true,
      name: true,
      color_code: true,
      status: true,
      budget_hours: true,
      started_at: true,
      ended_at: true,
      timelogs: {
        where: timelogWhere,
        select: {
          duration_minutes: true,
        },
      },
    },
  });
  const aggregated = projects.map((project) => {
    const actual_minutes = project.timelogs.reduce(
      (sum, t) => sum + t.duration_minutes,
      0,
    );
    const actual_hours = actual_minutes / 60;
    const budget_hours = project.budget_hours ?? 0;
    let utilization_percentage: number | null = null;
    if (project.budget_hours !== null && project.budget_hours > 0) {
      const raw = (actual_hours / project.budget_hours) * 100;
      utilization_percentage = Math.min(100, Math.max(0, raw));
    }
    const result: IHrmPlatformProjectBudgetReport.ISummary = {
      id: project.id,
      name: project.name,
      color_code: project.color_code,
      status: typia.assert<IEHrmPlatformProjectStatus>(project.status),
      budget_hours: budget_hours,
      actual_hours: actual_hours,
      utilization_percentage: utilization_percentage,
      start_date: project.started_at
        ? toISOStringSafe(project.started_at).split("T")[0]
        : null,
      end_date: project.ended_at
        ? toISOStringSafe(project.ended_at).split("T")[0]
        : null,
    };
    return result;
  });
  const filtered = aggregated.filter((item) => {
    if (
      props.body.minUtilization !== undefined &&
      item.utilization_percentage !== null
    ) {
      if (item.utilization_percentage < props.body.minUtilization) return false;
    }
    if (
      props.body.maxUtilization !== undefined &&
      item.utilization_percentage !== null
    ) {
      if (item.utilization_percentage > props.body.maxUtilization) return false;
    }
    return true;
  });
  const sorted = filtered.sort((a, b) => {
    let comparison = 0;
    switch (sort) {
      case "project_name":
        comparison = a.name.localeCompare(b.name);
        break;
      case "budget_hours":
        comparison = a.budget_hours - b.budget_hours;
        break;
      case "actual_hours":
        comparison = a.actual_hours - b.actual_hours;
        break;
      case "utilization_percentage":
      default:
        const aUtil = a.utilization_percentage ?? -1;
        const bUtil = b.utilization_percentage ?? -1;
        comparison = aUtil - bUtil;
        break;
    }
    return direction === "asc" ? comparison : -comparison;
  });
  const total = sorted.length;
  const paginated = sorted.slice(skip, skip + limit);
  const pagination: IPage.IPagination = {
    current: page,
    limit: limit,
    records: total,
    pages: Math.ceil(total / limit),
  };
  return {
    data: paginated,
    pagination: pagination,
  };
}
