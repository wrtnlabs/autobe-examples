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
  // Step 1: Verify task exists and belongs to project
  const task = await MyGlobal.prisma.hrm_platform_tasks.findUniqueOrThrow({
    where: { id: props.taskId },
    select: {
      id: true,
      hrm_platform_projects_id: true,
      hrm_platform_tasks_id: true,
      status: true,
      deleted_at: true,
    },
  });
  if (task.hrm_platform_projects_id !== props.projectId) {
    throw new HttpException(
      "Task does not belong to the specified project",
      400,
    );
  }
  if (task.deleted_at !== null) {
    throw new HttpException("Task has been deleted", 404);
  }
  // Step 2: Verify project exists and is not deleted
  const project = await MyGlobal.prisma.hrm_platform_projects.findUniqueOrThrow(
    {
      where: { id: props.projectId },
      select: {
        id: true,
        hrm_platform_organization_id: true,
        deleted_at: true,
      },
    },
  );
  if (project.deleted_at !== null) {
    throw new HttpException("Project has been deleted", 404);
  }
  // Step 3: Get member's employee record in the organization
  const employee =
    await MyGlobal.prisma.hrm_platform_employees.findFirstOrThrow({
      where: {
        hrm_platform_user_id: props.member.id,
        hrm_platform_organization_id: project.hrm_platform_organization_id,
        deleted_at: null,
      },
    });
  // Step 4: Check authorization - project lead or project:manage permission
  const projectMember =
    await MyGlobal.prisma.hrm_platform_project_members.findFirst({
      where: {
        hrm_platform_project_id: props.projectId,
        hrm_platform_employee_id: employee.id,
        deleted_at: null,
      },
    });
  if (!projectMember) {
    throw new HttpException("You are not a member of this project", 403);
  }
  let hasAuthorization = projectMember.role === "project-lead";
  if (!hasAuthorization) {
    // Check for project:manage permission through the employee's role
    const permission = await MyGlobal.prisma.hrm_platform_permissions.findFirst(
      {
        where: {
          code: "project:manage",
          deleted_at: null,
        },
      },
    );
    if (permission) {
      const hasPermission =
        await MyGlobal.prisma.hrm_platform_role_permissions.findFirst({
          where: {
            hrm_platform_role_id: employee.hrm_platform_role_id,
            hrm_platform_permission_id: permission.id,
            deleted_at: null,
          },
        });
      hasAuthorization = !!hasPermission;
    }
  }
  if (!hasAuthorization) {
    throw new HttpException(
      "Forbidden: You need project-lead role or project:manage permission",
      403,
    );
  }
  // Step 5: Validate assigned employee is a project member (if provided)
  if (
    props.body.hrm_platform_employees_id !== undefined &&
    props.body.hrm_platform_employees_id !== null
  ) {
    const assignedEmployee =
      await MyGlobal.prisma.hrm_platform_employees.findUnique({
        where: { id: props.body.hrm_platform_employees_id },
      });
    if (!assignedEmployee) {
      throw new HttpException("Assigned employee not found", 400);
    }
    const isProjectMember =
      await MyGlobal.prisma.hrm_platform_project_members.findFirst({
        where: {
          hrm_platform_project_id: props.projectId,
          hrm_platform_employee_id: props.body.hrm_platform_employees_id,
          deleted_at: null,
        },
      });
    if (!isProjectMember) {
      throw new HttpException(
        "Assigned employee is not a member of this project",
        400,
      );
    }
  }
  // Step 6: Validate parent task belongs to same project (if provided)
  if (
    props.body.hrm_platform_tasks_id !== undefined &&
    props.body.hrm_platform_tasks_id !== null
  ) {
    const parentTask = await MyGlobal.prisma.hrm_platform_tasks.findUnique({
      where: { id: props.body.hrm_platform_tasks_id },
      select: { hrm_platform_projects_id: true, deleted_at: true },
    });
    if (!parentTask) {
      throw new HttpException("Parent task not found", 400);
    }
    if (parentTask.deleted_at !== null) {
      throw new HttpException("Parent task has been deleted", 400);
    }
    if (parentTask.hrm_platform_projects_id !== props.projectId) {
      throw new HttpException(
        "Parent task must belong to the same project",
        409,
      );
    }
  }
  // Step 7: Record status change in history if status changed
  const oldStatus = task.status;
  const newStatus = props.body.status ?? oldStatus;
  if (props.body.status !== undefined && oldStatus !== newStatus) {
    const historyId = v4();
    const now = new Date();
    await MyGlobal.prisma.hrm_platform_task_histories.create({
      data: {
        id: historyId,
        hrm_platform_task_id: props.taskId,
        hrm_platform_member_id: props.member.id,
        changed_at: now,
        old_status: oldStatus,
        new_status: newStatus,
        created_at: now,
        updated_at: now,
        deleted_at: null,
      },
    });
  }
  // Step 8: Update the task using relation property names
  const now = new Date();
  await MyGlobal.prisma.hrm_platform_tasks.update({
    where: { id: props.taskId },
    data: {
      updated_at: now,
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
      ...(props.body.hrm_platform_employees_id !== undefined &&
        props.body.hrm_platform_employees_id !== null && {
          assignedEmployee: {
            connect: { id: props.body.hrm_platform_employees_id },
          },
        }),
      ...(props.body.hrm_platform_tasks_id !== undefined &&
        props.body.hrm_platform_tasks_id !== null && {
          parent: { connect: { id: props.body.hrm_platform_tasks_id } },
        }),
    },
  });
  // Step 9: Return updated task using transformer
  const updatedTask =
    await MyGlobal.prisma.hrm_platform_tasks.findUniqueOrThrow({
      where: { id: props.taskId },
      ...HrmPlatformTaskTransformer.select(),
    });
  return await HrmPlatformTaskTransformer.transform(updatedTask);
}
