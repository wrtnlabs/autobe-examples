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
import { AdminPayload } from "../decorators/payload/AdminPayload";
import { HrmPlatformTaskTransformer } from "../transformers/HrmPlatformTaskTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function putHrmPlatformAdminTasksTaskId(props: {
  admin: AdminPayload;
  taskId: string & tags.Format<"uuid">;
  body: IHrmPlatformTask.IUpdate;
}): Promise<IHrmPlatformTask> {
  // Find the existing task (must exist and not be soft-deleted)
  const existingTask =
    await MyGlobal.prisma.hrm_platform_tasks.findUniqueOrThrow({
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
  // Build update data object with only provided fields
  const updateData: Prisma.hrm_platform_tasksUpdateInput = {
    updated_at: new Date(),
  };
  // Add optional fields if provided in body
  if (props.body.title !== undefined) {
    updateData.title = props.body.title;
  }
  if (props.body.description !== undefined) {
    updateData.description = props.body.description;
  }
  if (props.body.status !== undefined) {
    updateData.status = props.body.status;
  }
  if (props.body.priority !== undefined) {
    updateData.priority = props.body.priority;
  }
  if (props.body.due_date !== undefined) {
    updateData.due_date = props.body.due_date
      ? new Date(props.body.due_date)
      : null;
  }
  if (props.body.estimated_hours !== undefined) {
    updateData.estimated_hours = props.body.estimated_hours;
  }
  if (
    props.body.assigned_employee_id !== undefined &&
    props.body.assigned_employee_id !== null
  ) {
    // Validate employee exists, is active, and is a member of the project
    const employee = await MyGlobal.prisma.hrm_platform_employees.findFirst({
      where: {
        id: props.body.assigned_employee_id,
        deleted_at: null,
        status: "active",
      },
      select: {
        id: true,
      },
    });
    if (employee === null) {
      throw new HttpException("Assigned employee not found or not active", 400);
    }
    // Verify employee is a member of the task's project
    const projectMembership =
      await MyGlobal.prisma.hrm_platform_project_memberships.findFirst({
        where: {
          hrm_platform_employee_id: props.body.assigned_employee_id,
          hrm_platform_project_id: existingTask.hrm_platform_project_id,
          deleted_at: null,
        },
      });
    if (projectMembership === null) {
      throw new HttpException(
        "Assigned employee is not a member of this project",
        400,
      );
    }
    updateData.assignedEmployee = {
      connect: { id: props.body.assigned_employee_id },
    };
  }
  if (props.body.parent_task_id !== undefined) {
    if (props.body.parent_task_id !== null) {
      // Validate parent task exists, belongs to same project, and is not itself a subtask
      const parentTask = await MyGlobal.prisma.hrm_platform_tasks.findFirst({
        where: {
          id: props.body.parent_task_id,
          hrm_platform_project_id: existingTask.hrm_platform_project_id,
          parent_task_id: null, // Parent task cannot be a subtask
          deleted_at: null,
        },
        select: {
          id: true,
        },
      });
      if (parentTask === null) {
        throw new HttpException(
          "Parent task not found, not in same project, or is already a subtask",
          400,
        );
      }
      // Prevent circular reference
      if (props.body.parent_task_id === props.taskId) {
        throw new HttpException("Task cannot be its own parent", 400);
      }
      updateData.parentTask = {
        connect: { id: props.body.parent_task_id },
      };
    } else {
      // Setting parent_task_id to null (removing subtask relationship)
      updateData.parentTask = {
        disconnect: true,
      };
    }
  }
  // Check if status is being modified
  const statusChanged =
    props.body.status !== undefined &&
    props.body.status !== existingTask.status;
  let updatedTask;
  if (statusChanged) {
    // Use transaction to update task and create history entry
    const oldStatus = existingTask.status;
    const newStatus = props.body.status!;
    await MyGlobal.prisma.$transaction(async (tx) => {
      // Update the task
      await tx.hrm_platform_tasks.update({
        where: { id: props.taskId },
        data: updateData,
      });
      // Create task history entry
      await tx.hrm_platform_task_histories.create({
        data: {
          id: v4(),
          hrm_platform_task_id: props.taskId,
          hrm_platform_member_id: props.admin.id,
          old_status: oldStatus,
          new_status: newStatus,
          created_at: new Date(),
        },
      });
    });
    // Fetch the updated task with full relations
    updatedTask = await MyGlobal.prisma.hrm_platform_tasks.findUniqueOrThrow({
      where: { id: props.taskId },
      ...HrmPlatformTaskTransformer.select(),
    });
  } else {
    // No status change - just update the task
    await MyGlobal.prisma.hrm_platform_tasks.update({
      where: { id: props.taskId },
      data: updateData,
    });
    // Fetch the updated task with full relations
    updatedTask = await MyGlobal.prisma.hrm_platform_tasks.findUniqueOrThrow({
      where: { id: props.taskId },
      ...HrmPlatformTaskTransformer.select(),
    });
  }
  // Transform and return the updated task
  return await HrmPlatformTaskTransformer.transform(updatedTask);
}
