import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IHrmPlatformDepartment } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformDepartment";
import { IHrmPlatformEmployee } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformEmployee";
import { IHrmPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformMember";
import { IHrmPlatformOrganization } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformOrganization";
import { IHrmPlatformOrganizationLogo } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformOrganizationLogo";
import { IHrmPlatformOrganizationSetting } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformOrganizationSetting";
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

export async function putHrmPlatformMemberTasksTaskId(props: {
  member: MemberPayload;
  taskId: string & tags.Format<"uuid">;
  body: IHrmPlatformTask.IUpdate;
}): Promise<IHrmPlatformTask> {
  // Find the task (throws 404 if not found or deleted)
  const task = await MyGlobal.prisma.hrm_platform_tasks.findUniqueOrThrow({
    where: {
      id: props.taskId,
      deleted_at: null,
    },
    select: {
      id: true,
      hrm_platform_project_id: true,
      status: true,
    },
  });
  // Verify authorization - member must have access to the project
  // Find the employee record for this member
  const employee = await MyGlobal.prisma.hrm_platform_employees.findFirst({
    where: {
      member_id: props.member.id,
      deleted_at: null,
    },
    select: {
      id: true,
    },
  });
  if (employee === null) {
    throw new HttpException("Forbidden", 403);
  }
  // Check project membership
  const projectMembership =
    await MyGlobal.prisma.hrm_platform_project_memberships.findFirst({
      where: {
        hrm_platform_project_id: task.hrm_platform_project_id,
        hrm_platform_employee_id: employee.id,
        deleted_at: null,
      },
    });
  if (projectMembership === null) {
    throw new HttpException("Forbidden", 403);
  }
  // Validate assigned_employee_id if provided
  if (
    props.body.assigned_employee_id !== undefined &&
    props.body.assigned_employee_id !== null
  ) {
    const assignedEmployee =
      await MyGlobal.prisma.hrm_platform_employees.findFirst({
        where: {
          id: props.body.assigned_employee_id,
          deleted_at: null,
          status: "active",
        },
        select: {
          id: true,
        },
      });
    if (assignedEmployee === null) {
      throw new HttpException("Employee not found or inactive", 400);
    }
    // Verify employee is a member of the project
    const employeeProjectMembership =
      await MyGlobal.prisma.hrm_platform_project_memberships.findFirst({
        where: {
          hrm_platform_project_id: task.hrm_platform_project_id,
          hrm_platform_employee_id: props.body.assigned_employee_id,
          deleted_at: null,
        },
      });
    if (employeeProjectMembership === null) {
      throw new HttpException("Employee is not a member of this project", 400);
    }
  }
  // Validate parent_task_id if provided
  if (
    props.body.parent_task_id !== undefined &&
    props.body.parent_task_id !== null
  ) {
    const parentTask = await MyGlobal.prisma.hrm_platform_tasks.findFirst({
      where: {
        id: props.body.parent_task_id,
        hrm_platform_project_id: task.hrm_platform_project_id,
        parent_task_id: null,
        deleted_at: null,
      },
    });
    if (parentTask === null) {
      throw new HttpException("Parent task not found or invalid", 400);
    }
    // Prevent circular reference
    if (parentTask.id === task.id) {
      throw new HttpException("Task cannot be its own parent", 400);
    }
  }
  // Check if status is changing
  const oldStatus = task.status;
  const newStatus = props.body.status ?? oldStatus;
  const statusChanged =
    props.body.status !== undefined && props.body.status !== oldStatus;
  // Build update data
  const updateData: Prisma.hrm_platform_tasksUpdateInput = {
    updated_at: new Date(),
    ...(props.body.title !== undefined && { title: props.body.title }),
    ...(props.body.description !== undefined && {
      description: props.body.description,
    }),
    ...(props.body.status !== undefined && { status: props.body.status }),
    ...(props.body.priority !== undefined && { priority: props.body.priority }),
    ...(props.body.due_date !== undefined && {
      due_date: props.body.due_date ? new Date(props.body.due_date) : null,
    }),
    ...(props.body.estimated_hours !== undefined && {
      estimated_hours: props.body.estimated_hours,
    }),
    ...(props.body.assigned_employee_id !== undefined && {
      assignedEmployee:
        props.body.assigned_employee_id === null
          ? { disconnect: true }
          : { connect: { id: props.body.assigned_employee_id } },
    }),
    ...(props.body.parent_task_id !== undefined && {
      parentTask:
        props.body.parent_task_id === null
          ? { disconnect: true }
          : { connect: { id: props.body.parent_task_id } },
    }),
  };
  // Update the task
  await MyGlobal.prisma.hrm_platform_tasks.update({
    where: { id: props.taskId },
    data: updateData,
  });
  // If status changed, create task history entry
  if (statusChanged) {
    await MyGlobal.prisma.hrm_platform_task_histories.create({
      data: {
        id: v4() as string & tags.Format<"uuid">,
        hrm_platform_task_id: props.taskId,
        hrm_platform_member_id: props.member.id,
        old_status: oldStatus,
        new_status: newStatus,
        created_at: new Date(),
      },
    });
  }
  // Fetch the updated task with transformer select
  const updatedTask =
    await MyGlobal.prisma.hrm_platform_tasks.findUniqueOrThrow({
      where: { id: props.taskId },
      ...HrmPlatformTaskTransformer.select(),
    });
  // Transform and return
  return await HrmPlatformTaskTransformer.transform(updatedTask);
}
