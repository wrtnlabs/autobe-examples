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
  // Step 1: Verify task exists and belongs to the project
  const task = await MyGlobal.prisma.hrm_platform_tasks.findUniqueOrThrow({
    where: { id: props.taskId },
    select: {
      id: true,
      hrm_platform_projects_id: true,
      hrm_platform_tasks_id: true,
      hrm_platform_employees_id: true,
      status: true,
    },
  });
  if (task.hrm_platform_projects_id !== props.projectId) {
    throw new HttpException(
      "Task does not belong to the specified project",
      400,
    );
  }
  // Step 2: Verify project belongs to member's organization
  const project = await MyGlobal.prisma.hrm_platform_projects.findUniqueOrThrow(
    {
      where: { id: props.projectId },
      select: {
        id: true,
        hrm_platform_organization_id: true,
      },
    },
  );
  // Get member's employee record to verify organization context
  const employee = await MyGlobal.prisma.hrm_platform_employees.findFirst({
    where: {
      hrm_platform_user_id: props.member.id,
      hrm_platform_organization_id: project.hrm_platform_organization_id,
      deleted_at: null,
    },
  });
  if (!employee) {
    throw new HttpException("You are not a member of this organization", 403);
  }
  // Step 3: Check authorization - must be project lead or have project:manage permission
  const projectMembership =
    await MyGlobal.prisma.hrm_platform_project_members.findFirst({
      where: {
        hrm_platform_employee_id: employee.id,
        hrm_platform_project_id: props.projectId,
        deleted_at: null,
      },
    });
  if (!projectMembership) {
    throw new HttpException("You are not a member of this project", 403);
  }
  if (projectMembership.role !== "project-lead") {
    throw new HttpException(
      "You do not have permission to update this task",
      403,
    );
  }
  // Step 4: Validate body does not contain immutable 'title' field
  // TypeScript type already excludes title from IUpdate, so this is compile-time safe
  // Step 5: If assigned employee is provided, verify it's a project member
  if (props.body.hrm_platform_employees_id !== undefined) {
    if (props.body.hrm_platform_employees_id !== null) {
      const assignedEmployee =
        await MyGlobal.prisma.hrm_platform_employees.findUnique({
          where: { id: props.body.hrm_platform_employees_id },
        });
      if (!assignedEmployee) {
        throw new HttpException("Assigned employee not found", 404);
      }
      // Verify assigned employee is a member of the project
      const assignedProjectMembership =
        await MyGlobal.prisma.hrm_platform_project_members.findFirst({
          where: {
            hrm_platform_employee_id: props.body.hrm_platform_employees_id,
            hrm_platform_project_id: props.projectId,
            deleted_at: null,
          },
        });
      if (!assignedProjectMembership) {
        throw new HttpException(
          "Assigned employee is not a member of this project",
          400,
        );
      }
    }
  }
  // Step 6: If parent task is provided, verify it belongs to the same project
  if (props.body.hrm_platform_tasks_id !== undefined) {
    if (props.body.hrm_platform_tasks_id !== null) {
      const parentTask = await MyGlobal.prisma.hrm_platform_tasks.findUnique({
        where: { id: props.body.hrm_platform_tasks_id },
        select: { hrm_platform_projects_id: true },
      });
      if (!parentTask) {
        throw new HttpException("Parent task not found", 404);
      }
      if (parentTask.hrm_platform_projects_id !== props.projectId) {
        throw new HttpException(
          "Parent task must belong to the same project",
          409,
        );
      }
    }
  }
  // Step 7: Record old status for history if status is being changed
  const oldStatus = task.status;
  const newStatus = props.body.status ?? oldStatus;
  const statusChanged =
    props.body.status !== undefined && props.body.status !== oldStatus;
  // Step 8: Update the task
  const updateData: Prisma.hrm_platform_tasksUpdateInput = {
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
    updateData.due_date = props.body.due_date
      ? new Date(props.body.due_date)
      : null;
  }
  // Use relation property names instead of FK columns
  if (props.body.hrm_platform_employees_id !== undefined) {
    if (props.body.hrm_platform_employees_id === null) {
      updateData.assignedEmployee = { disconnect: true };
    } else {
      updateData.assignedEmployee = {
        connect: { id: props.body.hrm_platform_employees_id },
      };
    }
  }
  if (props.body.hrm_platform_tasks_id !== undefined) {
    if (props.body.hrm_platform_tasks_id === null) {
      updateData.parent = { disconnect: true };
    } else {
      updateData.parent = { connect: { id: props.body.hrm_platform_tasks_id } };
    }
  }
  await MyGlobal.prisma.hrm_platform_tasks.update({
    where: { id: props.taskId },
    data: updateData,
  });
  // Step 9: Record status change in task_histories if status changed
  if (statusChanged) {
    await MyGlobal.prisma.hrm_platform_task_histories.create({
      data: {
        id: v4(),
        hrm_platform_task_id: props.taskId,
        hrm_platform_member_id: props.member.id,
        changed_at: new Date(),
        old_status: oldStatus,
        new_status: newStatus,
        created_at: new Date(),
        updated_at: new Date(),
        deleted_at: null,
      },
    });
  }
  // Step 10: Return updated task using transformer
  const updatedTask =
    await MyGlobal.prisma.hrm_platform_tasks.findUniqueOrThrow({
      where: { id: props.taskId },
      ...HrmPlatformTaskTransformer.select(),
    });
  return await HrmPlatformTaskTransformer.transform(updatedTask);
}
