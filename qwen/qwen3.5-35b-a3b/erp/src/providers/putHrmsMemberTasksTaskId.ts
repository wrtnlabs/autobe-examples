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

export async function putHrmsMemberTasksTaskId(props: {
  member: MemberPayload;
  taskId: string & tags.Format<"uuid">;
  body: IHrmsTask.IUpdate;
}): Promise<IHrmsTask> {
  // 1. Validate task exists and is not soft-deleted
  const task = await MyGlobal.prisma.hrms_tasks.findUniqueOrThrow({
    where: {
      id: props.taskId,
      deleted_at: null,
    },
    include: {
      project: {
        include: {
          organization: {
            select: {
              id: true,
              owner_id: true,
            },
          },
        },
      },
      assignedEmployee: {
        select: {
          id: true,
          organization_member_id: true,
        },
      },
    },
  });
  // 2. Check if member has project:manage permission or is project lead
  const memberProjectRole =
    await MyGlobal.prisma.hrms_project_members.findFirst({
      where: {
        project_id: task.hrms_project_id,
        employee_id: task.assignedEmployee?.id,
        deleted_at: null,
      },
    });
  // Check if member is project owner or is a project lead
  const isProjectOwner = task.project.organization.owner_id === props.member.id;
  const isProjectLead = memberProjectRole?.status === "active";
  if (!isProjectOwner && !isProjectLead) {
    throw new HttpException("Forbidden", 403);
  }
  // 3. Update task
  await MyGlobal.prisma.hrms_tasks.update({
    where: { id: props.taskId },
    data: {
      ...(props.body.description !== undefined && {
        description: props.body.description,
      }),
      ...(props.body.status !== undefined && { status: props.body.status }),
      ...(props.body.priority !== undefined && {
        priority: props.body.priority,
      }),
      ...(props.body.estimated_hours !== undefined && {
        estimated_hours: props.body.estimated_hours,
      }),
      ...(props.body.due_date !== undefined && {
        due_date: props.body.due_date ? new Date(props.body.due_date) : null,
      }),
      ...(props.body.billable !== undefined && {
        billable: props.body.billable,
      }),
      hrms_employee_id: props.body.hrms_employee_id ?? null,
      updated_at: new Date(),
    },
  });
  // 4. If status changed, create history record
  if (props.body.status !== undefined && props.body.status !== task.status) {
    await MyGlobal.prisma.hrms_task_status_histories.create({
      data: {
        id: v4(),
        hrms_task_id: props.taskId,
        hrms_member_id: props.member.id,
        old_status: task.status,
        new_status: props.body.status,
        created_at: new Date(),
        updated_at: new Date(),
        deleted_at: null,
      },
    });
  }
  // 5. Fetch project analytics data for response
  const organizationId = task.project.organization.id;
  // Get analytics for all projects
  const analyticsData = await MyGlobal.prisma.hrms_tasks.groupBy({
    by: ["hrms_project_id"],
    where: { hrms_project_id: task.hrms_project_id },
    _count: { id: true },
  });
  const analytics = await ArrayUtil.asyncMap(analyticsData, async (item) => {
    const project = await MyGlobal.prisma.hrms_projects.findUnique({
      where: { id: item.hrms_project_id },
      select: { name: true },
    });
    if (!project) {
      return null;
    }
    return {
      project_id: item.hrms_project_id,
      project_name: project.name,
      task_count: item._count?.id ?? 0,
    } satisfies IHrmsTask.ISummary;
  });
  const validAnalytics = analytics.filter(
    (a): a is IHrmsTask.ISummary => a !== null,
  );
  // Get total projects count
  const totalProjects = await MyGlobal.prisma.hrms_projects.count({
    where: {
      hrms_organization_id: organizationId,
      deleted_at: null,
    },
  });
  // Get total budget hours
  const budgetHoursResult = await MyGlobal.prisma.hrms_projects.aggregate({
    where: {
      hrms_organization_id: organizationId,
      deleted_at: null,
    },
    _sum: { budget_hours: true },
  });
  const totalBudgetHours = budgetHoursResult._sum.budget_hours ?? null;
  // Get total logged hours
  const loggedHoursResult = await MyGlobal.prisma.hrms_timelogs.aggregate({
    where: {
      project: {
        hrms_organization_id: organizationId,
        deleted_at: null,
      },
    },
    _sum: { duration_minutes: true },
  });
  // Convert duration (minutes) to hours
  const totalLoggedHours = loggedHoursResult._sum?.duration_minutes
    ? Math.round((loggedHoursResult._sum.duration_minutes / 60) * 100) / 100
    : null;
  // 6. Return IHrmsTask analytics response
  return {
    analytics: validAnalytics,
    total_projects: totalProjects,
    total_budget_hours: totalBudgetHours,
    total_logged_hours: totalLoggedHours,
  } satisfies IHrmsTask;
}
