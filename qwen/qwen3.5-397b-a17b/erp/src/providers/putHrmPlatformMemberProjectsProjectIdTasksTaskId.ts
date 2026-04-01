import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IHrmPlatformDepartment } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformDepartment";
import { IHrmPlatformEmployee } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformEmployee";
import { IHrmPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformMember";
import { IHrmPlatformOrganization } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformOrganization";
import { IHrmPlatformProject } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformProject";
import { IHrmPlatformRole } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformRole";
import { IHrmPlatformTask } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformTask";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { MemberPayload } from "../decorators/payload/MemberPayload";
import { HrmPlatformTaskTransformer } from "../transformers/HrmPlatformTaskTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function putHrmPlatformMemberProjectsProjectIdTasksTaskId(props: {
  member: MemberPayload;
  projectId: string & tags.Format<"uuid">;
  taskId: string & tags.Format<"uuid">;
  body: IHrmPlatformTask.IUpdate;
}): Promise<IHrmPlatformTask> {
  // Verify task exists and belongs to the specified project
  const task = await MyGlobal.prisma.hrm_platform_tasks.findUniqueOrThrow({
    where: { id: props.taskId },
    select: {
      id: true,
      hrm_platform_project_id: true,
      hrm_platform_employee_id: true,
      parent_task_id: true,
      status: true,
    },
  });
  if (task.hrm_platform_project_id !== props.projectId) {
    throw new HttpException(
      "Task does not belong to the specified project",
      400,
    );
  }
  // Find the employee record for this member
  const employee = await MyGlobal.prisma.hrm_platform_employees.findFirst({
    where: {
      user_id: props.member.id,
      deleted_at: null,
    },
    select: {
      id: true,
      role_id: true,
    },
  });
  if (!employee) {
    throw new HttpException("Employee record not found", 403);
  }
  // Check authorization - verify user is project lead or has project:manage permission
  const projectMembership =
    await MyGlobal.prisma.hrm_platform_project_members.findFirst({
      where: {
        hrm_platform_project_id: props.projectId,
        hrm_platform_employee_id: employee.id,
        deleted_at: null,
      },
      select: {
        id: true,
        role: true,
      },
    });
  // Check if user has project:manage permission through their role
  let hasProjectManagePermission = false;
  if (projectMembership) {
    if (projectMembership.role === "project-lead") {
      hasProjectManagePermission = true;
    } else {
      // Check if employee's role has project:manage permission
      const rolePermission =
        await MyGlobal.prisma.hrm_platform_role_permissions.findFirst({
          where: {
            hrm_platform_role_id: employee.role_id,
            permission: "project:manage",
          },
        });
      hasProjectManagePermission = !!rolePermission;
    }
  }
  if (!hasProjectManagePermission) {
    throw new HttpException(
      "Forbidden: You do not have permission to update this task",
      403,
    );
  }
  // Validate hrm_platform_employee_id if provided
  if (props.body.hrm_platform_employee_id !== undefined) {
    if (props.body.hrm_platform_employee_id !== null) {
      const employeeMembership =
        await MyGlobal.prisma.hrm_platform_project_members.findFirst({
          where: {
            hrm_platform_project_id: props.projectId,
            hrm_platform_employee_id: props.body.hrm_platform_employee_id,
          },
        });
      if (!employeeMembership) {
        throw new HttpException(
          "Assigned employee must be a member of the project",
          400,
        );
      }
    }
  }
  // Validate parent_task_id if provided
  if (props.body.parent_task_id !== undefined) {
    if (props.body.parent_task_id !== null) {
      const parentTask = await MyGlobal.prisma.hrm_platform_tasks.findUnique({
        where: { id: props.body.parent_task_id },
        select: {
          hrm_platform_project_id: true,
          parent_task_id: true,
        },
      });
      if (!parentTask) {
        throw new HttpException("Parent task not found", 400);
      }
      if (parentTask.hrm_platform_project_id !== props.projectId) {
        throw new HttpException(
          "Parent task must belong to the same project",
          400,
        );
      }
      if (parentTask.parent_task_id !== null) {
        throw new HttpException("Parent task cannot be a subtask itself", 400);
      }
    }
  }
  // Create task history entry if status is changing
  if (props.body.status !== undefined && props.body.status !== task.status) {
    await MyGlobal.prisma.hrm_platform_task_histories.create({
      data: {
        id: v4(),
        hrm_platform_task_id: props.taskId,
        hrm_platform_member_id: props.member.id,
        old_status: task.status,
        new_status: props.body.status,
        created_at: new Date(),
      },
    });
  }
  // Build update data object
  const updateData: Prisma.hrm_platform_tasksUpdateInput = {
    updated_at: new Date(),
    ...(props.body.title !== undefined && { title: props.body.title }),
    ...(props.body.description !== undefined && {
      description: props.body.description,
    }),
    ...(props.body.status !== undefined && { status: props.body.status }),
    ...(props.body.priority !== undefined && { priority: props.body.priority }),
    ...(props.body.estimated_hours !== undefined && {
      estimated_hours: props.body.estimated_hours,
    }),
    ...(props.body.due_date !== undefined && {
      due_date:
        props.body.due_date !== null ? new Date(props.body.due_date) : null,
    }),
    ...(props.body.hrm_platform_employee_id !== undefined && {
      assignee:
        props.body.hrm_platform_employee_id !== null
          ? { connect: { id: props.body.hrm_platform_employee_id } }
          : { disconnect: true },
    }),
    ...(props.body.parent_task_id !== undefined && {
      parentTask:
        props.body.parent_task_id !== null
          ? { connect: { id: props.body.parent_task_id } }
          : { disconnect: true },
    }),
  };
  // Update the task
  await MyGlobal.prisma.hrm_platform_tasks.update({
    where: { id: props.taskId },
    data: updateData,
  });
  // Fetch and return the updated task
  const updated = await MyGlobal.prisma.hrm_platform_tasks.findUniqueOrThrow({
    where: { id: props.taskId },
    ...HrmPlatformTaskTransformer.select(),
  });
  return await HrmPlatformTaskTransformer.transform(updated);
}
