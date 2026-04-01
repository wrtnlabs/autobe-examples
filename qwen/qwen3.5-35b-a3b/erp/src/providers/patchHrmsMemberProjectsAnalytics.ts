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
  // Get the member's organization context from organization_members
  const organizationMembers =
    await MyGlobal.prisma.hrms_organization_members.findMany({
      where: {
        hrms_member_id: props.member.id,
        deleted_at: null,
      },
      take: 1,
    });
  if (organizationMembers.length === 0) {
    throw new HttpException("Organization context not found", 404);
  }
  const organizationMember = organizationMembers[0];
  const organizationId = organizationMember.hrms_organization_id;
  // Build where clause for projects
  const projectsWhere: Prisma.hrms_projectsWhereInput = {
    hrms_organization_id: organizationId,
    deleted_at: null,
    ...(props.body.status ? { status: props.body.status } : {}),
  };
  // Calculate pagination
  const page = props.body.page ?? 1;
  const limit = props.body.limit ?? 100;
  const skip = (page - 1) * limit;
  // Get total count
  const total = await MyGlobal.prisma.hrms_projects.count({
    where: projectsWhere,
  });
  // Fetch projects with analytics
  const projects = await MyGlobal.prisma.hrms_projects.findMany({
    where: projectsWhere,
    skip,
    take: limit,
    orderBy: {
      ...(props.body.sort_by === "project_name"
        ? { name: props.body.order ?? "asc" }
        : props.body.sort_by === "budget_utilization"
          ? { budget_hours: props.body.order ?? "desc" }
          : { created_at: props.body.order ?? "desc" }),
    } satisfies Prisma.hrms_projectsOrderByWithRelationInput,
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
        select: { id: true, name: true },
      },
      timelogs: {
        where: {
          deleted_at: null,
          ...(props.body.date_from
            ? { date: { gte: new Date(props.body.date_from + "T00:00:00Z") } }
            : {}),
          ...(props.body.date_to
            ? { date: { lte: new Date(props.body.date_to + "T23:59:59Z") } }
            : {}),
        },
        select: { duration_minutes: true },
      },
      tasks: {
        select: { status: true, deleted_at: true },
      },
    },
  });
  // Transform projects to analytics format
  const data = await ArrayUtil.asyncMap(projects, async (project) => {
    const actualMinutes = project.timelogs.reduce(
      (
        sum: number,
        tl: {
          duration_minutes: number | null;
        },
      ) => sum + (tl.duration_minutes ?? 0),
      0,
    );
    const actualHours = actualMinutes / 60;
    const pendingTasks = project.tasks.filter(
      (task: { status: string; deleted_at: Date | null }) =>
        !task.deleted_at &&
        (task.status === "open" || task.status === "pending"),
    ).length;
    const inProgressTasks = project.tasks.filter(
      (task: { status: string; deleted_at: Date | null }) =>
        !task.deleted_at && task.status === "in-progress",
    ).length;
    const completedTasks = project.tasks.filter(
      (task: { status: string; deleted_at: Date | null }) =>
        !task.deleted_at && task.status === "completed",
    ).length;
    const closedTasks = project.tasks.filter(
      (task: { status: string; deleted_at: Date | null }) =>
        !task.deleted_at && task.status === "closed",
    ).length;
    const budgetUtilizationPercentage =
      project.budget_hours && project.budget_hours > 0
        ? (actualHours / project.budget_hours) * 100
        : null;
    const safeStatus = typia.assert<"active" | "completed" | "archived">(
      project.status,
    );
    return {
      id: project.id,
      name: project.name,
      description: project.description ?? "",
      color_code: project.color_code,
      organization_id: project.hrms_organization_id,
      organization_name: project.organization.name,
      status: safeStatus,
      budget_hours: project.budget_hours,
      start_date: project.start_date
        ? toISOStringSafe(project.start_date)
        : null,
      end_date: project.end_date ? toISOStringSafe(project.end_date) : null,
      planned_hours: project.budget_hours ?? 0,
      actual_hours: actualHours,
      budget_utilization_percentage: budgetUtilizationPercentage,
      total_tasks: project.tasks.filter(
        (t: { deleted_at: Date | null }) => !t.deleted_at,
      ).length,
      pending_tasks: pendingTasks,
      in_progress_tasks: inProgressTasks,
      completed_tasks: completedTasks,
      closed_tasks: closedTasks,
      timelog_count: project.timelogs.length,
      created_at: toISOStringSafe(project.created_at),
      updated_at: toISOStringSafe(project.updated_at),
    } satisfies IHrmsProject.ISummary;
  });
  return {
    data,
    pagination: {
      current: page,
      limit,
      records: total,
      pages: Math.ceil(total / limit),
    } satisfies IPage.IPagination,
  } satisfies IPageIHrmsProject.ISummary;
}
