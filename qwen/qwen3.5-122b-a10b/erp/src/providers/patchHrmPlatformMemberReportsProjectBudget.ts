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
  // Get member's organization context - find employee record to get organization
  const employee = await MyGlobal.prisma.hrm_platform_employees.findFirst({
    where: {
      hrm_platform_user_id: props.member.id,
      deleted_at: null,
    },
    select: {
      hrm_platform_organization_id: true,
    },
  });
  if (!employee) {
    throw new HttpException("Member not enrolled in any organization", 403);
  }
  const organizationId = employee.hrm_platform_organization_id;
  // Build where clause for projects
  const projectWhere: Prisma.hrm_platform_projectsWhereInput = {
    hrm_platform_organization_id: organizationId,
    budget_hours: {
      gt: 0,
    },
    deleted_at: null,
  };
  // Add optional filters
  if (props.body.status) {
    projectWhere.status = props.body.status;
  }
  if (props.body.project_ids && props.body.project_ids.length > 0) {
    projectWhere.id = {
      in: props.body.project_ids,
    };
  }
  if (props.body.search) {
    projectWhere.OR = [
      { name: { contains: props.body.search, mode: "insensitive" } },
      { description: { contains: props.body.search, mode: "insensitive" } },
    ];
  }
  // Build where clause for timelogs (date range filtering)
  const timelogWhere: Prisma.hrm_platform_timelogsWhereInput = {
    deleted_at: null,
  };
  // Build date filter object without explicit Prisma type
  const dateFilter: Record<string, Date> = {};
  if (props.body.date_from) {
    dateFilter.gte = new Date(props.body.date_from);
  }
  if (props.body.date_to) {
    dateFilter.lte = new Date(props.body.date_to);
  }
  // Only assign if we have at least one date condition
  if (Object.keys(dateFilter).length > 0) {
    timelogWhere.date = dateFilter;
  }
  // Get all projects with budget
  const projects = await MyGlobal.prisma.hrm_platform_projects.findMany({
    where: projectWhere,
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
  if (projects.length === 0) {
    return {
      data: [],
      pagination: {
        current: props.body.page ?? 1,
        limit: props.body.limit ?? 50,
        records: 0,
        pages: 0,
      },
    };
  }
  // Calculate hours for each project using groupBy
  const projectIds = projects.map((p) => p.id);
  const hoursByProject = await MyGlobal.prisma.hrm_platform_timelogs.groupBy({
    by: ["hrm_platform_project_id"],
    where: {
      ...timelogWhere,
      hrm_platform_project_id: {
        in: projectIds,
      },
    },
    _sum: {
      duration_minutes: true,
    },
  });
  // Get billable hours separately
  const billableHours = await MyGlobal.prisma.hrm_platform_timelogs.groupBy({
    by: ["hrm_platform_project_id"],
    where: {
      ...timelogWhere,
      hrm_platform_project_id: {
        in: projectIds,
      },
      billable: true,
    },
    _sum: {
      duration_minutes: true,
    },
  });
  // Get non-billable hours separately
  const nonBillableHours = await MyGlobal.prisma.hrm_platform_timelogs.groupBy({
    by: ["hrm_platform_project_id"],
    where: {
      ...timelogWhere,
      hrm_platform_project_id: {
        in: projectIds,
      },
      billable: false,
    },
    _sum: {
      duration_minutes: true,
    },
  });
  // Create maps for quick lookup
  const totalHoursMap = new Map<string, number>();
  for (const entry of hoursByProject) {
    totalHoursMap.set(
      entry.hrm_platform_project_id,
      (entry._sum.duration_minutes ?? 0) / 60.0,
    );
  }
  const billableHoursMap = new Map<string, number>();
  for (const entry of billableHours) {
    billableHoursMap.set(
      entry.hrm_platform_project_id,
      (entry._sum.duration_minutes ?? 0) / 60.0,
    );
  }
  const nonBillableHoursMap = new Map<string, number>();
  for (const entry of nonBillableHours) {
    nonBillableHoursMap.set(
      entry.hrm_platform_project_id,
      (entry._sum.duration_minutes ?? 0) / 60.0,
    );
  }
  // Build summary records
  const summaries: IHrmPlatformProjectBudgetReport.ISummary[] = projects.map(
    (project) => {
      const totalHours = totalHoursMap.get(project.id) ?? 0;
      const billableHrs = billableHoursMap.get(project.id) ?? 0;
      const nonBillableHrs = nonBillableHoursMap.get(project.id) ?? 0;
      const budgetHours = project.budget_hours ?? 0;
      const budgetPercentage =
        budgetHours > 0 ? (totalHours / budgetHours) * 100 : 0;
      return {
        id: project.id as string & tags.Format<"uuid">,
        name: project.name,
        color_code: project.color_code,
        status: project.status,
        budget_hours: project.budget_hours,
        start_date: project.start_date
          ? toISOStringSafe(project.start_date)
          : null,
        end_date: project.end_date ? toISOStringSafe(project.end_date) : null,
        total_hours: totalHours,
        billable_hours: billableHrs,
        non_billable_hours: nonBillableHrs,
        budget_percentage: Math.round(budgetPercentage * 100) / 100,
      } satisfies IHrmPlatformProjectBudgetReport.ISummary;
    },
  );
  // Apply sorting
  const sortBy = props.body.sort_by ?? "budget_percentage";
  const sortOrder = props.body.sort_order ?? "desc";
  summaries.sort((a, b) => {
    let comparison = 0;
    switch (sortBy) {
      case "budget_percentage":
        comparison = a.budget_percentage - b.budget_percentage;
        break;
      case "project_name":
        comparison = a.name.localeCompare(b.name);
        break;
      case "actual_hours":
        comparison = a.total_hours - b.total_hours;
        break;
      case "budget_hours":
        comparison = (a.budget_hours ?? 0) - (b.budget_hours ?? 0);
        break;
      default:
        comparison = a.budget_percentage - b.budget_percentage;
    }
    return sortOrder === "asc" ? comparison : -comparison;
  });
  // Apply pagination
  const page = props.body.page ?? 1;
  const limit = props.body.limit ?? 50;
  const skip = (page - 1) * limit;
  const paginatedData = summaries.slice(skip, skip + limit);
  return {
    data: paginatedData,
    pagination: {
      current: page,
      limit: limit,
      records: summaries.length,
      pages: Math.ceil(summaries.length / limit),
    },
  } satisfies IPageIHrmPlatformProjectBudgetReport.ISummary;
}
