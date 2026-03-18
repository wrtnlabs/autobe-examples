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
  const prisma = MyGlobal.prisma;
  // 1. Verify user has appropriate permissions
  const projectMember = await prisma.hrms_project_members.findFirst({
    where: {
      project_id: props.projectId,
      employee_id: props.member.id,
      role: "project-lead",
      status: "active",
    },
  });
  if (!projectMember) {
    const orgMember = await prisma.hrms_organization_members.findFirst({
      where: {
        hrms_member_id: props.member.id,
        organization: {
          projects: {
            some: {
              id: props.projectId,
              deleted_at: null,
            },
          },
        },
      },
      include: {
        organizationRole: true,
      },
    });
    if (!orgMember) {
      throw new HttpException("Unauthorized", 401);
    }
    const permission =
      await prisma.hrms_organization_role_permissions.findFirst({
        where: {
          hrms_organization_role_id: orgMember.hrms_organization_role_id,
          permission: "project:manage",
        },
      });
    if (!permission) {
      throw new HttpException("Forbidden", 403);
    }
  }
  // 2. Verify project exists
  await prisma.hrms_projects.findUniqueOrThrow({
    where: {
      id: props.projectId,
      deleted_at: null,
    },
  });
  // 3. Fetch task and verify it belongs to project
  const task = await prisma.hrms_tasks.findUniqueOrThrow({
    where: {
      id: props.taskId,
      hrms_project_id: props.projectId,
      deleted_at: null,
    },
    select: {
      id: true,
      hrms_project_id: true,
      hrms_employee_id: true,
      hrms_task_id: true,
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
  // 4. Build update data
  const updateData: Prisma.hrms_tasksUpdateInput = {
    updated_at: new Date(),
  };
  if (props.body.description !== undefined) {
    updateData.description = props.body.description;
  }
  if (props.body.status !== undefined) {
    updateData.status = props.body.status;
  }
  if (props.body.priority !== undefined) {
    updateData.priority = props.body.priority;
  }
  if (props.body.estimated_hours !== undefined) {
    updateData.estimated_hours = props.body.estimated_hours;
  }
  if (props.body.due_date !== undefined) {
    updateData.due_date =
      props.body.due_date === null ? null : new Date(props.body.due_date);
  }
  if (props.body.billable !== undefined) {
    updateData.billable = props.body.billable;
  }
  if (props.body.hrms_employee_id !== undefined) {
    if (props.body.hrms_employee_id !== null) {
      const employeeMember = await prisma.hrms_project_members.findFirst({
        where: {
          project_id: props.projectId,
          employee_id: props.body.hrms_employee_id,
          status: "active",
        },
      });
      if (!employeeMember) {
        throw new HttpException(
          "Employee is not a member of this project",
          400,
        );
      }
      updateData.assignedEmployee = {
        connect: { id: props.body.hrms_employee_id },
      };
    } else {
      updateData.assignedEmployee = { disconnect: true };
    }
  }
  // 5. Create status history if status changed
  if (props.body.status !== undefined && props.body.status !== task.status) {
    await prisma.hrms_task_status_histories.create({
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
  // 6. Update task
  const updatedTask = await prisma.hrms_tasks.update({
    where: { id: props.taskId },
    data: updateData,
    select: {
      id: true,
      hrms_project_id: true,
      hrms_employee_id: true,
      hrms_task_id: true,
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
  // 7. Return analytics structure to satisfy IHrmsTask return type
  return {
    analytics: [],
    total_projects: 0,
    total_budget_hours: null,
    total_logged_hours: null,
  };
}
