import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IHrmsTask } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmsTask";
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

export async function getHrmsMemberTasksTaskId(props: {
  member: MemberPayload;
  taskId: string & tags.Format<"uuid">;
}): Promise<IHrmsTask> {
  // IHrmsTask is an analytics response type, not a single task detail
  // Fetch the task to get organization context
  const task = await MyGlobal.prisma.hrms_tasks.findUniqueOrThrow({
    where: {
      id: props.taskId,
      deleted_at: null,
    },
    include: {
      project: true,
    },
  } satisfies Prisma.hrms_tasksFindManyArgs);
  // Get organization context from the task's project
  const organizationId = task.project.hrms_organization_id;
  // Verify member belongs to the organization
  const memberOrgMembership =
    await MyGlobal.prisma.hrms_organization_members.findFirst({
      where: {
        hrms_member_id: props.member.id,
        hrms_organization_id: organizationId,
        deleted_at: null,
      },
    });
  if (!memberOrgMembership) {
    throw new HttpException("Forbidden", 403);
  }
  // Fetch all projects in the organization for analytics
  const projects = await MyGlobal.prisma.hrms_projects.findMany({
    where: {
      hrms_organization_id: organizationId,
      deleted_at: null,
    },
  });
  // Calculate analytics per project
  const analytics: IHrmsTask.ISummary[] = [];
  for (const project of projects) {
    const taskCount = await MyGlobal.prisma.hrms_tasks.count({
      where: {
        hrms_project_id: project.id,
        deleted_at: null,
      },
    });
    analytics.push({
      project_id: project.id,
      project_name: project.name,
      task_count: taskCount,
    } satisfies IHrmsTask.ISummary);
  }
  // Sort by task count descending
  analytics.sort((a, b) => b.task_count - a.task_count);
  // Calculate total projects
  const totalProjects = await MyGlobal.prisma.hrms_projects.count({
    where: {
      hrms_organization_id: organizationId,
      deleted_at: null,
    },
  });
  // Calculate total budget hours
  const budgetSum = await MyGlobal.prisma.hrms_projects.aggregate({
    where: {
      hrms_organization_id: organizationId,
      deleted_at: null,
    },
    _sum: {
      budget_hours: true,
    },
  });
  const totalBudgetHours = budgetSum._sum.budget_hours ?? null;
  // Calculate total logged hours for the member
  const projectsForMember = projects.map((p) => p.id);
  const loggedHoursResult = await MyGlobal.prisma.hrms_timelogs.aggregate({
    where: {
      employee_id: props.member.id,
      project_id: { in: projectsForMember },
    },
    _sum: {
      duration_minutes: true,
    },
  });
  // Convert duration (milliseconds) to hours
  const totalLoggedHours = loggedHoursResult._sum.duration_minutes
    ? loggedHoursResult._sum.duration_minutes / 60
    : null;
  return {
    analytics: analytics,
    total_projects: totalProjects,
    total_budget_hours: totalBudgetHours ?? null,
    total_logged_hours: totalLoggedHours,
  } satisfies IHrmsTask;
}
