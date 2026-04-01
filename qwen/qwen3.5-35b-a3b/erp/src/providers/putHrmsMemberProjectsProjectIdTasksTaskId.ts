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

export async function putHrmsMemberProjectsProjectIdTasksTaskId(props: {
  member: MemberPayload;
  projectId: string & tags.Format<"uuid">;
  taskId: string & tags.Format<"uuid">;
  body: IHrmsTask.IUpdate;
}): Promise<IHrmsTask> {
  const project = await MyGlobal.prisma.hrms_projects.findUniqueOrThrow({
    where: { id: props.projectId },
    select: {
      id: true,
      hrms_organization_id: true,
      deleted_at: true,
      name: true,
    },
  });
  if (project.deleted_at !== null) {
    throw new HttpException("Project not found", 404);
  }
  const task = await MyGlobal.prisma.hrms_tasks.findUniqueOrThrow({
    where: { id: props.taskId },
    select: {
      id: true,
      hrms_project_id: true,
      status: true,
      hrms_employee_id: true,
      deleted_at: true,
    },
  });
  if (task.deleted_at !== null) {
    throw new HttpException("Task not found", 404);
  }
  if (task.hrms_project_id !== props.projectId) {
    throw new HttpException("Task does not belong to project", 404);
  }
  const projectMembership =
    await MyGlobal.prisma.hrms_project_members.findFirst({
      where: {
        employee_id: props.member.id,
        project_id: props.projectId,
        status: "active",
        deleted_at: null,
      },
    });
  if (projectMembership === null || projectMembership.role !== "project-lead") {
    throw new HttpException("Forbidden", 403);
  }
  if (
    props.body.hrms_employee_id !== undefined &&
    props.body.hrms_employee_id !== null
  ) {
    const projectEmployeeMembership =
      await MyGlobal.prisma.hrms_project_members.findFirst({
        where: {
          employee_id: props.body.hrms_employee_id,
          project_id: props.projectId,
          status: "active",
          deleted_at: null,
        },
      });
    if (projectEmployeeMembership === null) {
      throw new HttpException("Employee is not a member of the project", 400);
    }
  }
  const oldStatus: string | null = task.status;
  const newStatus: string | null = props.body.status ?? task.status;
  if (oldStatus !== null && newStatus !== null && oldStatus !== newStatus) {
    await MyGlobal.prisma.hrms_task_status_histories.create({
      data: {
        id: v4(),
        hrms_task_id: props.taskId,
        hrms_member_id: props.member.id,
        old_status: oldStatus,
        new_status: newStatus,
        created_at: new Date(),
        updated_at: new Date(),
        deleted_at: null,
      },
    });
  }
  const updatedTask = await MyGlobal.prisma.hrms_tasks.update({
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
        due_date: props.body.due_date,
      }),
      ...(props.body.billable !== undefined && {
        billable: props.body.billable,
      }),
      ...(props.body.hrms_employee_id !== undefined && {
        hrms_employee_id: props.body.hrms_employee_id,
      }),
      updated_at: new Date(),
    },
    select: {
      id: true,
      hrms_project_id: true,
      hrms_employee_id: true,
      title: true,
      description: true,
      status: true,
      priority: true,
      estimated_hours: true,
      due_date: true,
      billable: true,
      created_at: true,
      updated_at: true,
      deleted_at: true,
    },
  });
  const projectAnalytics = await MyGlobal.prisma.hrms_tasks.groupBy({
    by: ["hrms_project_id"],
    where: { hrms_project_id: props.projectId, deleted_at: null },
    _count: { id: true },
  });
  const totalProjects = await MyGlobal.prisma.hrms_projects.count({
    where: {
      hrms_organization_id: project.hrms_organization_id,
      deleted_at: null,
    },
  });
  const totalBudgetHours = await MyGlobal.prisma.hrms_projects.aggregate({
    where: {
      hrms_organization_id: project.hrms_organization_id,
      deleted_at: null,
    },
    _sum: { budget_hours: true },
  });
  const totalLoggedHours = await MyGlobal.prisma.hrms_timelogs.aggregate({
    _sum: { duration_minutes: true },
  });
  const totalLoggedHoursValue = totalLoggedHours._sum?.duration_minutes
    ? Math.round((totalLoggedHours._sum.duration_minutes / 60) * 100) / 100
    : null;
  return {
    analytics: projectAnalytics.map((pa) => ({
      project_id: pa.hrms_project_id as string & tags.Format<"uuid">,
      project_name: project.name,
      task_count: pa._count.id,
    })),
    total_projects: totalProjects,
    total_budget_hours: totalBudgetHours._sum.budget_hours ?? null,
    total_logged_hours: totalLoggedHoursValue,
  } as IHrmsTask;
}
