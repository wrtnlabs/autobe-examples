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
  // Validate organization exists and user has access
  const organization =
    await MyGlobal.prisma.hrms_organizations.findUniqueOrThrow({
      where: {
        id: props.organizationId,
        deleted_at: null,
      },
    });
  // Validate member has access to this organization
  const membership =
    await MyGlobal.prisma.hrms_organization_members.findFirstOrThrow({
      where: {
        hrms_member_id: props.member.id,
        hrms_organization_id: props.organizationId,
      },
    });
  // Build dynamic WHERE clause for filtering
  const whereInput: Prisma.hrms_projectsWhereInput = {
    hrms_organization_id: props.organizationId,
    deleted_at: null,
    ...(props.body.status !== undefined && {
      status: props.body.status,
    }),
    ...(props.body.date_from !== undefined && {
      timelogs: {
        some: {
          date: {
            gte: new Date(props.body.date_from + "T00:00:00Z"),
          },
        },
      },
    }),
    ...(props.body.date_to !== undefined && {
      timelogs: {
        some: {
          date: {
            lte: new Date(props.body.date_to + "T23:59:59Z"),
          },
        },
      },
    }),
  };
  // Build ORDER BY clause
  const orderByInput: Prisma.hrms_projectsOrderByWithRelationInput = (() => {
    if (props.body.sort_by === "project_name") {
      return { name: props.body.order ?? "asc" };
    }
    if (props.body.sort_by === "budget_utilization") {
      return { budget_hours: props.body.order ?? "asc" };
    }
    if (props.body.sort_by === "actual_hours") {
      return { created_at: props.body.order ?? "asc" };
    }
    if (props.body.sort_by === "created_at") {
      return { created_at: props.body.order ?? "desc" };
    }
    return { created_at: "desc" };
  })();
  // Determine pagination parameters
  const page = props.body.page ?? 1;
  const limit = props.body.limit ?? 100;
  const skip = (page - 1) * limit;
  // Execute query with selected fields
  const projects = await MyGlobal.prisma.hrms_projects.findMany({
    where: whereInput,
    orderBy: orderByInput,
    skip,
    take: limit + 1, // Fetch one extra for cursor detection
    include: {
      organization: {
        select: {
          id: true,
          name: true,
        },
      },
      _count: {
        select: {
          tasks: true,
          timelogs: true,
        },
      },
    },
  });
  // Check if we have more results for cursor
  const hasMore = projects.length > limit;
  const nextCursor = hasMore ? projects[projects.length - 1].id : undefined;
  // Trim the extra record
  const data = projects.slice(0, limit);
  // Calculate actual hours for each project
  const projectsWithHours = await ArrayUtil.asyncMap(data, async (project) => {
    // Get actual hours from timelogs
    const timelogAggregate = await MyGlobal.prisma.hrms_timelogs.aggregate({
      where: {
        project_id: project.id,
        deleted_at: null,
      },
      _sum: {
        duration_minutes: true,
      },
    });
    const actualHours =
      Math.round(((timelogAggregate._sum.duration_minutes ?? 0) / 60) * 100) /
      100;
    // Calculate budget utilization
    const budgetUtilizationPercentage =
      project.budget_hours !== null && project.budget_hours > 0
        ? Math.round((actualHours / project.budget_hours) * 100 * 100) / 100
        : null;
    // Count tasks by status
    const totalTasks = project._count.tasks;
    const pendingTasks = await MyGlobal.prisma.hrms_tasks.count({
      where: {
        hrms_project_id: project.id,
        deleted_at: null,
        status: { in: ["open", "pending"] },
      },
    });
    const inProgressTasks = await MyGlobal.prisma.hrms_tasks.count({
      where: {
        hrms_project_id: project.id,
        deleted_at: null,
        status: "in-progress",
      },
    });
    const completedTasks = await MyGlobal.prisma.hrms_tasks.count({
      where: {
        hrms_project_id: project.id,
        deleted_at: null,
        status: "completed",
      },
    });
    const closedTasks = await MyGlobal.prisma.hrms_tasks.count({
      where: {
        hrms_project_id: project.id,
        deleted_at: null,
        status: "closed",
      },
    });
    // Calculate planned hours
    const plannedHours =
      project.budget_hours !== null ? project.budget_hours : 0;
    return {
      id: project.id as string & tags.Format<"uuid">,
      name: project.name,
      description: project.description ?? "",
      color_code: project.color_code,
      organization_id: project.hrms_organization_id as string &
        tags.Format<"uuid">,
      organization_name: project.organization.name,
      status: typia.assert<"active" | "completed" | "archived">(project.status),
      budget_hours: project.budget_hours,
      start_date: project.start_date?.toISOString() ?? null,
      end_date: project.end_date?.toISOString() ?? null,
      planned_hours: plannedHours,
      actual_hours: actualHours,
      budget_utilization_percentage: budgetUtilizationPercentage,
      total_tasks: totalTasks as number & tags.Type<"int32">,
      pending_tasks: pendingTasks as number & tags.Type<"int32">,
      in_progress_tasks: inProgressTasks as number & tags.Type<"int32">,
      completed_tasks: completedTasks as number & tags.Type<"int32">,
      closed_tasks: closedTasks as number & tags.Type<"int32">,
      timelog_count: project._count.timelogs as number & tags.Type<"int32">,
      created_at: project.created_at.toISOString(),
      updated_at: project.updated_at.toISOString(),
    } satisfies IHrmsProject.ISummary;
  });
  // Get total count
  const total = await MyGlobal.prisma.hrms_projects.count({
    where: whereInput,
  });
  return {
    pagination: {
      current: page,
      limit: limit,
      records: total,
      pages: Math.ceil(total / limit),
    } satisfies IPage.IPagination,
    data: projectsWithHours,
    ...(nextCursor !== undefined && {
      next_cursor: nextCursor,
    }),
  } satisfies IPageIHrmsProject.ISummary;
}
