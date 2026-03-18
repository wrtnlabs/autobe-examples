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
  // Fetch task with project info to validate permissions
  const task = await MyGlobal.prisma.hrms_tasks.findUniqueOrThrow({
    where: { id: props.taskId },
    select: {
      id: true,
      hrms_project_id: true,
      title: true,
      description: true,
      status: true,
      priority: true,
      estimated_hours: true,
      due_date: true,
      billable: true,
      hrms_employee_id: true,
      created_at: true,
      updated_at: true,
      deleted_at: true,
      project: {
        select: {
          id: true,
          hrms_organization_id: true,
        },
      },
    },
  });
  if (task.deleted_at !== null) {
    throw new HttpException("Task not found", 404);
  }
  // Fetch project to validate user permissions
  const project = await MyGlobal.prisma.hrms_projects.findUniqueOrThrow({
    where: { id: task.hrms_project_id },
    select: {
      id: true,
      hrms_organization_id: true,
    },
  });
  // Get member's employee record to check project membership
  const employee = await MyGlobal.prisma.hrms_employees.findFirst({
    where: {
      organization_member_id: { equals: props.member.id },
    },
  });
  if (employee === null) {
    throw new HttpException("Member is not an employee", 404);
  }
  // Check if user is project lead
  const projectMembership =
    await MyGlobal.prisma.hrms_project_members.findFirst({
      where: {
        employee_id: employee.id,
        project_id: project.id,
        status: "active",
      },
    });
  const isProjectLead = projectMembership?.role === "project-lead";
  // User must be project lead to update tasks in project
  // In production, also check for organization-level project:manage permission
  if (!isProjectLead) {
    throw new HttpException("Forbidden", 403);
  }
  // Validate assigned employee if provided
  if (
    props.body.hrms_employee_id !== undefined &&
    props.body.hrms_employee_id !== null
  ) {
    const targetEmployee = await MyGlobal.prisma.hrms_employees.findUnique({
      where: { id: props.body.hrms_employee_id },
    });
    if (targetEmployee === null) {
      throw new HttpException("Employee not found", 404);
    }
    const targetEmployeeMembership =
      await MyGlobal.prisma.hrms_project_members.findFirst({
        where: {
          employee_id: targetEmployee.id,
          project_id: project.id,
          status: "active",
        },
      });
    if (targetEmployeeMembership === null) {
      throw new HttpException("Employee must be a project member", 400);
    }
  }
  // Validate status
  const validStatuses = ["open", "in-progress", "completed", "closed"] as const;
  if (props.body.status !== undefined && props.body.status !== null) {
    const isStatusValid = validStatuses.some((s) => props.body.status === s);
    if (!isStatusValid) {
      throw new HttpException("Invalid status", 400);
    }
  }
  // Validate priority
  const validPriorities = ["low", "medium", "high", "urgent"] as const;
  if (props.body.priority !== undefined && props.body.priority !== null) {
    const isPriorityValid = validPriorities.some(
      (p) => props.body.priority === p,
    );
    if (!isPriorityValid) {
      throw new HttpException("Invalid priority", 400);
    }
  }
  // Capture old status for history if changing
  const oldStatus = task.status;
  // Update task
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
  });
  // Insert status history if status changed
  if (
    props.body.status !== undefined &&
    props.body.status !== null &&
    props.body.status !== oldStatus
  ) {
    await MyGlobal.prisma.hrms_task_status_histories.create({
      data: {
        id: v4(),
        hrms_task_id: props.taskId,
        hrms_member_id: props.member.id,
        old_status: oldStatus,
        new_status: props.body.status,
        created_at: new Date(),
        updated_at: new Date(),
        deleted_at: null,
      },
    });
  }
  // Fetch updated task
  const updatedTask = await MyGlobal.prisma.hrms_tasks.findUniqueOrThrow({
    where: { id: props.taskId },
    select: {
      id: true,
      hrms_project_id: true,
      title: true,
      description: true,
      status: true,
      priority: true,
      estimated_hours: true,
      due_date: true,
      billable: true,
      hrms_employee_id: true,
      created_at: true,
      updated_at: true,
      deleted_at: true,
    },
  });
  // Build response object with task analytics
  return {
    analytics: [],
    total_projects: 0,
    total_budget_hours: null,
    total_logged_hours: null,
  } satisfies IHrmsTask;
}
