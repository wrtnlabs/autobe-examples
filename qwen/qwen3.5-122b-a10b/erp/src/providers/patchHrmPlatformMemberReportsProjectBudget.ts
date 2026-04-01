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
  // Build project where conditions
  const projectWhere: Prisma.hrm_platform_projectsWhereInput = {
    deleted_at: null,
    budget_hours: {
      not: null,
    },
    ...(props.body.project_ids && props.body.project_ids.length > 0
      ? { id: { in: props.body.project_ids } }
      : {}),
    ...(props.body.status ? { status: props.body.status } : {}),
    ...(props.body.search
      ? {
          OR: [
            { name: { contains: props.body.search, mode: "insensitive" } },
            {
              description: { contains: props.body.search, mode: "insensitive" },
            },
          ],
        }
      : {}),
  };
  // Build timelog where conditions for date range
  const timelogWhereBase: Prisma.hrm_platform_timelogsWhereInput = {
    deleted_at: null,
  };
  if (props.body.date_from !== undefined || props.body.date_to !== undefined) {
    const dateFilter: {
      gte?: Date;
      lte?: Date;
    } = {};
    if (props.body.date_from !== undefined) {
      dateFilter.gte = new Date(props.body.date_from);
    }
    if (props.body.date_to !== undefined) {
      dateFilter.lte = new Date(props.body.date_to);
    }
    timelogWhereBase.created_at = dateFilter;
  }
  // Pagination parameters
  const page = props.body.page ?? 1;
  const limit = props.body.limit ?? 50;
  const skip = (page - 1) * limit;
  // Build order by - cannot use timelogs relation, use project fields only
  const orderBy: Prisma.hrm_platform_projectsOrderByWithRelationInput =
    props.body.sort_by === "project_name"
      ? { name: props.body.sort_order === "asc" ? "asc" : "desc" }
      : props.body.sort_by === "budget_hours"
        ? { budget_hours: props.body.sort_order === "asc" ? "asc" : "desc" }
        : { created_at: "desc" as const }; // default: created_at desc
  // Get total count of matching projects
  const total = await MyGlobal.prisma.hrm_platform_projects.count({
    where: projectWhere,
  });
  // Query projects with budget hours (without timelogs relation)
  const projects = await MyGlobal.prisma.hrm_platform_projects.findMany({
    where: projectWhere,
    skip,
    take: limit,
    orderBy,
    select: {
      id: true,
      name: true,
      color_code: true,
      status: true,
      budget_hours: true,
      start_date: true,
      end_date: true,
    },
  });
  // For each project, query timelogs and aggregate hours
  const data = await ArrayUtil.asyncMap(projects, async (project) => {
    const timelogWhere: Prisma.hrm_platform_timelogsWhereInput = {
      ...timelogWhereBase,
      hrm_platform_project_id: project.id,
    };
    const timelogs = await MyGlobal.prisma.hrm_platform_timelogs.findMany({
      where: timelogWhere,
      select: {
        duration_minutes: true,
        billable: true,
      },
    });
    const totalHours = timelogs.reduce(
      (sum: number, tl) => sum + tl.duration_minutes / 60.0,
      0,
    );
    const billableHours = timelogs.reduce(
      (sum: number, tl) => sum + (tl.billable ? tl.duration_minutes / 60.0 : 0),
      0,
    );
    const nonBillableHours = totalHours - billableHours;
    const budgetHours = project.budget_hours ?? 0;
    const budgetPercentage =
      budgetHours > 0 ? (totalHours / budgetHours) * 100 : 0;
    return {
      id: project.id as string & tags.Format<"uuid">,
      name: project.name,
      color_code: project.color_code,
      status: project.status,
      budget_hours: project.budget_hours,
      start_date: project.start_date?.toISOString() ?? null,
      end_date: project.end_date?.toISOString() ?? null,
      total_hours: totalHours,
      billable_hours: billableHours,
      non_billable_hours: nonBillableHours,
      budget_percentage: Math.round(budgetPercentage * 100) / 100,
    } satisfies IHrmPlatformProjectBudgetReport.ISummary;
  });
  return {
    data,
    pagination: {
      current: page,
      limit,
      records: total,
      pages: Math.ceil(total / limit),
    } satisfies IPage.IPagination,
  } satisfies IPageIHrmPlatformProjectBudgetReport.ISummary;
}
