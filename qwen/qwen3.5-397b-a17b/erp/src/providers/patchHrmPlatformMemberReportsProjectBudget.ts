import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IHrmPlatformOrganization } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformOrganization";
import { IHrmPlatformProject } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformProject";
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
  const page = props.body.page ?? 1;
  const limit = props.body.limit ?? 100;
  // Build project where clause
  const projectWhere: Prisma.hrm_platform_projectsWhereInput = {
    deleted_at: null,
    budget_hours: { not: null },
  };
  if (props.body.project_id !== undefined) {
    projectWhere.id = props.body.project_id;
  }
  if (props.body.status !== undefined) {
    projectWhere.status = props.body.status;
  }
  // Build timelog where clause for aggregation
  const timelogWhere: Prisma.hrm_platform_timelogsWhereInput = {
    deleted_at: null,
  };
  if (props.body.date_from !== undefined && props.body.date_to !== undefined) {
    timelogWhere.date = { gte: props.body.date_from, lte: props.body.date_to };
  } else if (props.body.date_from !== undefined) {
    timelogWhere.date = { gte: props.body.date_from };
  } else if (props.body.date_to !== undefined) {
    timelogWhere.date = { lte: props.body.date_to };
  }
  if (props.body.billable !== undefined) {
    timelogWhere.billable = props.body.billable;
  }
  // Query all matching projects with only needed fields
  const allProjects = await MyGlobal.prisma.hrm_platform_projects.findMany({
    where: projectWhere,
    select: {
      id: true,
      name: true,
      color: true,
      status: true,
      budget_hours: true,
      start_date: true,
      end_date: true,
      created_at: true,
      updated_at: true,
      deleted_at: true,
      organization: {
        select: {
          id: true,
          name: true,
          description: true,
          logo_url: true,
          currency: true,
          timezone: true,
          created_at: true,
        },
      },
      timelogs: {
        where: timelogWhere,
        select: {
          duration_minutes: true,
        },
      },
    },
  });
  // Calculate metrics for each project
  const withMetrics = allProjects
    .map((project) => {
      if (project.budget_hours === null) {
        return null;
      }
      const budget_hours = project.budget_hours;
      const actual_hours =
        project.timelogs.reduce((sum, t) => sum + t.duration_minutes, 0) / 60;
      const remaining_hours = budget_hours - actual_hours;
      const utilization_percentage = (actual_hours / budget_hours) * 100;
      return {
        project,
        budget_hours,
        actual_hours,
        remaining_hours,
        utilization_percentage,
      };
    })
    .filter((item): item is NonNullable<typeof item> => item !== null);
  // Sort by utilization_percentage descending
  withMetrics.sort(
    (a, b) => b.utilization_percentage - a.utilization_percentage,
  );
  // Get total count before pagination
  const total = withMetrics.length;
  // Apply pagination
  const skip = (page - 1) * limit;
  const paginated = withMetrics.slice(skip, skip + limit);
  // Build response DTOs manually
  const data = paginated.map((item) => {
    const projectSummary: IHrmPlatformProject.ISummary = {
      id: item.project.id as string & tags.Format<"uuid">,
      name: item.project.name,
      color: item.project.color,
      status: item.project.status as "active" | "archived" | "completed",
      budget_hours: item.project.budget_hours,
      start_date: item.project.start_date?.toISOString() ?? null,
      end_date: item.project.end_date?.toISOString() ?? null,
      organization: {
        id: item.project.organization.id as string & tags.Format<"uuid">,
        name: item.project.organization.name,
        description: item.project.organization.description ?? undefined,
        logo_url: item.project.organization.logo_url ?? undefined,
        currency: item.project.organization.currency,
        timezone: item.project.organization.timezone,
        created_at: item.project.organization.created_at.toISOString(),
      } satisfies IHrmPlatformOrganization.ISummary,
      created_at: item.project.created_at.toISOString(),
      updated_at: item.project.updated_at.toISOString(),
      deleted_at: item.project.deleted_at?.toISOString() ?? null,
    } satisfies IHrmPlatformProject.ISummary;
    return {
      project: projectSummary,
      budget_hours: item.budget_hours,
      actual_hours: item.actual_hours,
      remaining_hours: item.remaining_hours,
      utilization_percentage: item.utilization_percentage,
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
  };
}
