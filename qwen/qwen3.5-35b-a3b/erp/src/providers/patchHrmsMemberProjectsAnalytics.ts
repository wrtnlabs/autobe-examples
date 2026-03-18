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

export async function patchHrmsMemberProjectsAnalytics(props: {
  member: MemberPayload;
  body: IHrmsProject.IRequest;
}): Promise<IPageIHrmsProject.ISummary> {
  const page = props.body.page ?? 1;
  const limit = Math.min(props.body.limit ?? 100, 100);
  const skip = (page - 1) * limit;
  const projectWhere: Prisma.hrms_projectsWhereInput = {
    deleted_at: null,
    status: props.body.status ?? undefined,
  };
  const organizationId = getOrganizationIdFromMember(props.member);
  projectWhere.hrms_organization_id = organizationId;
  const total = await MyGlobal.prisma.hrms_projects.count({
    where: projectWhere,
  });
  const projects = await MyGlobal.prisma.hrms_projects.findMany({
    where: projectWhere,
    skip,
    take: limit,
    orderBy: getOrderBy(props.body.sort_by, props.body.order),
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
      organization: {
        select: { name: true },
      },
      _count: {
        select: {
          tasks: true,
        },
      },
    },
  });
  const projectIds = projects.map((p) => p.id);
  const timelogWhereBase: Prisma.hrms_timelogsWhereInput = {
    deleted_at: null,
    project_id: {
      in: projectIds,
    },
  };
  const timelogWhere: Prisma.hrms_timelogsWhereInput = {
    ...timelogWhereBase,
  };
  if (props.body.date_from || props.body.date_to) {
    const dateFilter: Prisma.hrms_timelogsWhereInput["date"] = {};
    if (props.body.date_from) {
      const [year, month, day] = props.body.date_from
        .split("-")
        .map((part) => parseInt(part, 10));
      dateFilter.gte = new Date(year, month - 1, day, 0, 0, 0, 0);
    }
    if (props.body.date_to) {
      const [year, month, day] = props.body.date_to
        .split("-")
        .map((part) => parseInt(part, 10));
      dateFilter.lte = new Date(year, month - 1, day, 23, 59, 59, 999);
    }
    timelogWhere.date = dateFilter;
  }
  const timelogAggregations = await MyGlobal.prisma.hrms_timelogs.groupBy({
    by: ["project_id"],
    where: timelogWhere,
    _sum: {
      duration_minutes: true,
    },
    _count: {
      id: true,
    },
  });
  const timelogMap = new Map(
    timelogAggregations.map((t) => [
      t.project_id,
      {
        duration_minutes: t._sum.duration_minutes ?? 0,
        count: t._count.id ?? 0,
      },
    ]),
  );
  const taskAggregations = await MyGlobal.prisma.hrms_tasks.groupBy({
    by: ["hrms_project_id", "status"] as any,
    where: {
      hrms_project_id: {
        in: projectIds,
      },
      deleted_at: null,
    },
    _count: {
      id: true,
    },
  });
  const taskMap = new Map(
    projects.map((project) => [
      project.id,
      { pending: 0, in_progress: 0, completed: 0, closed: 0 },
    ]),
  );
  taskAggregations.forEach((t) => {
    const projectTaskCounts = taskMap.get(t.hrms_project_id) || {
      pending: 0,
      in_progress: 0,
      completed: 0,
      closed: 0,
    };
    const count = t._count.id ?? 0;
    if (t.status === "open" || t.status === "pending") {
      projectTaskCounts.pending += count;
    } else if (t.status === "in-progress") {
      projectTaskCounts.in_progress += count;
    } else if (t.status === "completed") {
      projectTaskCounts.completed += count;
    } else if (t.status === "closed") {
      projectTaskCounts.closed += count;
    }
    taskMap.set(t.hrms_project_id, projectTaskCounts);
  });
  const data = projects.map((project) => {
    const timelogData = timelogMap.get(project.id) ?? {
      duration_minutes: 0,
      count: 0,
    };
    const taskCounts = taskMap.get(project.id) ?? {
      pending: 0,
      in_progress: 0,
      completed: 0,
      closed: 0,
    };
    const actualHours = timelogData.duration_minutes / 60;
    const plannedHours = project.budget_hours ?? 0;
    const budgetUtilization =
      project.budget_hours !== null && project.budget_hours > 0
        ? (actualHours / project.budget_hours) * 100
        : null;
    return {
      id: project.id,
      name: project.name,
      description: project.description ?? "",
      color_code: project.color_code,
      organization_id: project.hrms_organization_id,
      organization_name: project.organization.name,
      status: project.status as "active" | "completed" | "archived",
      budget_hours: project.budget_hours,
      start_date: project.start_date?.toISOString() ?? null,
      end_date: project.end_date?.toISOString() ?? null,
      planned_hours: plannedHours,
      actual_hours: actualHours,
      budget_utilization_percentage: budgetUtilization,
      total_tasks: project._count.tasks,
      pending_tasks: taskCounts.pending,
      in_progress_tasks: taskCounts.in_progress,
      completed_tasks: taskCounts.completed,
      closed_tasks: taskCounts.closed,
      timelog_count: timelogData.count,
      created_at: project.created_at.toISOString(),
      updated_at: project.updated_at.toISOString(),
    } satisfies IHrmsProject.ISummary;
  });
  return {
    pagination: {
      current: page,
      limit: limit,
      records: total,
      pages: Math.ceil(total / limit),
    } satisfies IPage.IPagination,
    data: data,
  } satisfies IPageIHrmsProject.ISummary;
}
function getOrganizationIdFromMember(
  member: MemberPayload,
): string & tags.Format<"uuid"> {
  throw new Error(
    "Organization context must be provided via member payload or session",
  );
}
function getOrderBy(
  sort_by: string | undefined,
  order: "asc" | "desc" | undefined,
): Prisma.hrms_projectsOrderByWithRelationInput {
  const direction = order === "desc" ? "desc" : "asc";
  if (sort_by === "project_name") {
    return { name: direction };
  }
  if (sort_by === "created_at") {
    return { created_at: direction };
  }
  return { created_at: direction };
}
