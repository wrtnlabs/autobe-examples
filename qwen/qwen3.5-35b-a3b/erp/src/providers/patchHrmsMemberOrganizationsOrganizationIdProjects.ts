import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IHrmsProject } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmsProject";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { IPageIHrmsProject } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIHrmsProject";
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

export async function patchHrmsMemberOrganizationsOrganizationIdProjects(props: {
  member: MemberPayload;
  organizationId: string & tags.Format<"uuid">;
  body: IHrmsProject.IRequest;
}): Promise<IPageIHrmsProject.ISummary> {
  // 1. Validate organization exists
  const organization = await MyGlobal.prisma.hrms_organizations.findFirst({
    where: {
      id: props.organizationId,
      deleted_at: null,
    },
  });
  if (organization === null) {
    throw new HttpException("Organization not found", 404);
  }
  // 2. Build WHERE clause for projects
  const projectWhereInput: Prisma.hrms_projectsWhereInput = {
    hrms_organization_id: props.organizationId,
    deleted_at: null,
    ...(props.body.status !== undefined && { status: props.body.status }),
    ...(props.body.date_from !== undefined && {
      start_date: { gte: new Date(props.body.date_from + "T00:00:00+09:00") },
    }),
    ...(props.body.date_to !== undefined && {
      end_date: { lte: new Date(props.body.date_to + "T23:59:59+09:00") },
    }),
  };
  // 3. Calculate pagination
  const page = props.body.page ?? 1;
  const limit = props.body.limit ?? 100;
  const skip = (page - 1) * limit;
  // 4. Build ORDER BY
  const orderByInput = (
    props.body.sort_by === "project_name"
      ? { name: props.body.order ?? ("asc" as const) }
      : props.body.sort_by === "budget_utilization"
        ? { budget_hours: props.body.order ?? ("asc" as const) }
        : props.body.sort_by === "actual_hours"
          ? { created_at: props.body.order ?? ("asc" as const) }
          : { created_at: "desc" as const }
  ) satisfies Prisma.hrms_projectsOrderByWithRelationInput;
  // 5. Query projects with all fields needed for transformation
  const projects = await MyGlobal.prisma.hrms_projects.findMany({
    where: projectWhereInput,
    orderBy: orderByInput,
    skip,
    take: limit + 1,
    select: {
      id: true,
      name: true,
      description: true,
      color_code: true,
      hrms_organization_id: true,
      status: true,
      budget_hours: true,
      start_date: true,
      end_date: true,
      created_at: true,
      updated_at: true,
    },
  });
  const hasNextPage = projects.length > limit;
  const nextCursor = hasNextPage ? projects[limit].id : undefined;
  const paginatedProjects = hasNextPage ? projects.slice(0, limit) : projects;
  // 6. Count total
  const total = await MyGlobal.prisma.hrms_projects.count({
    where: projectWhereInput,
  });
  // 7. Fetch task counts per project - filter by project IDs only
  const projectIds = paginatedProjects.map((p) => p.id);
  const taskWhereInput: Prisma.hrms_tasksWhereInput =
    projectIds.length > 0 ? { hrms_project_id: { in: projectIds } } : {};
  const taskCountsByProject = await MyGlobal.prisma.hrms_tasks.groupBy({
    by: ["hrms_project_id"],
    where: taskWhereInput,
    _count: {
      id: true,
    },
  });
  // 8. Fetch timelog counts per project
  const timelogWhereInput: Prisma.hrms_timelogsWhereInput =
    projectIds.length > 0 ? { project_id: { in: projectIds } } : {};
  const timelogCountsByProject = await MyGlobal.prisma.hrms_timelogs.groupBy({
    by: ["project_id"],
    where: timelogWhereInput,
    _count: {
      id: true,
    },
    _avg: {
      duration_minutes: true,
    },
  });
  // 9. Transform to ISummary
  const data = await ArrayUtil.asyncMap(paginatedProjects, async (project) => {
    const budgetHours = project.budget_hours;
    const plannedHours = budgetHours !== null ? budgetHours : 0;
    // Calculate task counts
    const projectTaskCounts = taskCountsByProject.find(
      (tc) => tc.hrms_project_id === project.id,
    );
    // Handle _count union type
    const totalTasks = (() => {
      const count = projectTaskCounts?._count;
      return count?.id ?? 0;
    })();
    // Status groupBy results are nested under each "by" field name
    // Use type assertion to help TypeScript understand the complex Prisma type
    const statusGroupBy = projectTaskCounts?.hrms_project_id as any;
    const pendingTasks = (() => {
      let sum = 0;
      if (statusGroupBy) {
        if ("open" in statusGroupBy) {
          const openCount = (statusGroupBy as any).open?._count;
          sum += openCount?.id ?? 0;
        }
        if ("pending" in statusGroupBy) {
          const pendingCount = (statusGroupBy as any).pending?._count;
          sum += pendingCount?.id ?? 0;
        }
      }
      return sum;
    })();
    const inProgressTasks = (() => {
      if (!statusGroupBy) return 0;
      const inProgressCount = (statusGroupBy as any)["in-progress"]?._count;
      return inProgressCount?.id ?? 0;
    })();
    const completedTasks = (() => {
      if (!statusGroupBy) return 0;
      const completedCount = (statusGroupBy as any).completed?._count;
      return completedCount?.id ?? 0;
    })();
    const closedTasks = (() => {
      if (!statusGroupBy) return 0;
      const closedCount = (statusGroupBy as any).closed?._count;
      return closedCount?.id ?? 0;
    })();
    // Calculate actual hours and budget utilization
    const projectTimelog = timelogCountsByProject.find(
      (tc) => tc.project_id === project.id,
    );
    const actualHours = (() => {
      if (!projectTimelog) return 0;
      const avg = projectTimelog._avg;
      if (!avg || !avg.duration_minutes) return 0;
      return Math.round(((avg.duration_minutes * 60) / 60) * 100) / 100;
    })();
    const budgetUtilizationPercentage =
      budgetHours !== null && budgetHours > 0
        ? Math.round((actualHours / budgetHours) * 10000) / 100
        : null;
    // Fetch organization name
    const organizationName = organization.name;
    // Build status with proper type
    const statusValue = project.status;
    const status: "active" | "archived" | "completed" =
      statusValue === "active"
        ? "active"
        : statusValue === "archived"
          ? "archived"
          : "completed";
    return {
      id: project.id,
      name: project.name,
      description: project.description ?? "",
      color_code: project.color_code,
      organization_id: project.hrms_organization_id,
      organization_name: organizationName,
      status: status,
      budget_hours: budgetHours,
      start_date: toISOStringSafe(
        project.start_date ?? new Date("9999-12-31T23:59:59.999Z"),
      ),
      end_date: toISOStringSafe(
        project.end_date ?? new Date("9999-12-31T23:59:59.999Z"),
      ),
      planned_hours: plannedHours,
      actual_hours: actualHours,
      budget_utilization_percentage: budgetUtilizationPercentage,
      total_tasks: totalTasks,
      pending_tasks: pendingTasks,
      in_progress_tasks: inProgressTasks,
      completed_tasks: completedTasks,
      closed_tasks: closedTasks,
      timelog_count: (() => {
        if (!projectTimelog) return 0;
        const count = projectTimelog._count;
        return count?.id ?? 0;
      })(),
      created_at: toISOStringSafe(project.created_at),
      updated_at: toISOStringSafe(project.updated_at),
    } satisfies IHrmsProject.ISummary;
  });
  return {
    pagination: {
      current: page,
      limit: limit,
      records: total,
      pages: total > 0 ? Math.ceil(total / limit) : 0,
    } satisfies IPage.IPagination,
    data: data,
  } satisfies IPageIHrmsProject.ISummary;
}
