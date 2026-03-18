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
import { HrmPlatformTaskCollector } from "../collectors/HrmPlatformTaskCollector";
import { MemberPayload } from "../decorators/payload/MemberPayload";
import { HrmPlatformTaskTransformer } from "../transformers/HrmPlatformTaskTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function postHrmPlatformMemberProjectsProjectIdTasks(props: {
  member: MemberPayload;
  projectId: string & tags.Format<"uuid">;
  body: IHrmPlatformTask.ICreate;
}): Promise<IHrmPlatformTask> {
  // 1. Verify project exists and is not soft-deleted
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
    throw new HttpException("Project not found", 404);
  }
  // 2. Authorization check - verify member is project lead or has project:manage permission
  const projectMember =
    await MyGlobal.prisma.hrm_platform_project_members.findFirst({
      where: {
        hrm_platform_project_id: props.projectId,
        employee: {
          hrm_platform_user_id: props.member.id,
          deleted_at: null,
        },
        deleted_at: null,
      },
      select: { role: true },
    });
  if (projectMember === null) {
    throw new HttpException("Forbidden", 403);
  }
  if (projectMember.role !== "project-lead") {
    // Check for project:manage permission at organization level
    const employee = await MyGlobal.prisma.hrm_platform_employees.findFirst({
      where: {
        hrm_platform_user_id: props.member.id,
        hrm_platform_organization_id: project.hrm_platform_organization_id,
        deleted_at: null,
      },
      select: { id: true },
    });
    if (employee === null) {
      throw new HttpException("Forbidden", 403);
    }
    const hasPermission =
      await MyGlobal.prisma.hrm_platform_employees.findFirst({
        where: {
          id: employee.id,
          deleted_at: null,
          role: {
            hrm_platform_organization_id: project.hrm_platform_organization_id,
            deleted_at: null,
            permissions: {
              some: {
                permission: {
                  code: "project:manage",
                },
              },
            },
          },
        },
      });
    if (hasPermission === null) {
      throw new HttpException("Forbidden", 403);
    }
  }
  // 3. Validate assigned employee if provided
  if (
    props.body.assigned_employee_id !== undefined &&
    props.body.assigned_employee_id !== null
  ) {
    const assignedEmployee =
      await MyGlobal.prisma.hrm_platform_employees.findFirst({
        where: {
          id: props.body.assigned_employee_id,
          deleted_at: null,
          projectMemberships: {
            some: {
              hrm_platform_project_id: props.projectId,
              deleted_at: null,
            },
          },
        },
      });
    if (assignedEmployee === null) {
      throw new HttpException(
        "Assigned employee must be a project member",
        400,
      );
    }
  }
  // 4. Validate parent task if provided (one-level nesting)
  if (
    props.body.parent_task_id !== undefined &&
    props.body.parent_task_id !== null
  ) {
    const parentTask = await MyGlobal.prisma.hrm_platform_tasks.findFirst({
      where: {
        id: props.body.parent_task_id,
        deleted_at: null,
        hrm_platform_projects_id: props.projectId,
      },
      select: { id: true, hrm_platform_tasks_id: true },
    });
    if (parentTask === null) {
      throw new HttpException(
        "Parent task not found or does not belong to this project",
        400,
      );
    }
    // Enforce one-level nesting - parent cannot be a child task itself
    if (parentTask.hrm_platform_tasks_id !== null) {
      throw new HttpException(
        "Parent task cannot be a subtask (one-level nesting only)",
        409,
      );
    }
  }
  // 5. Create task using collector
  const created = await MyGlobal.prisma.hrm_platform_tasks.create({
    data: await HrmPlatformTaskCollector.collect({
      body: props.body,
      hrmPlatformProjects: { id: props.projectId },
    }),
    ...HrmPlatformTaskTransformer.select(),
  });
  // 6. Return transformed task
  return await HrmPlatformTaskTransformer.transform(created);
}
