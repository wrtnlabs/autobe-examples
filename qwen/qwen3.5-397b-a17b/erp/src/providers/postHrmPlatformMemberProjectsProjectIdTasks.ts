import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IHrmPlatformDepartment } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformDepartment";
import { IHrmPlatformEmployee } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformEmployee";
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
  // Step 1: Verify project exists and is not soft-deleted
  const project = await MyGlobal.prisma.hrm_platform_projects.findUnique({
    where: { id: props.projectId },
    select: { id: true, deleted_at: true },
  });
  if (!project || project.deleted_at !== null) {
    throw new HttpException("Project not found", 404);
  }
  // Step 2: Check authorization - must be project-lead OR have project:manage permission
  const projectMembership =
    await MyGlobal.prisma.hrm_platform_project_members.findFirst({
      where: {
        hrm_platform_project_id: props.projectId,
        deleted_at: null,
      },
      include: {
        employee: {
          select: {
            id: true,
            member_id: true,
            role: {
              select: {
                id: true,
                name: true,
                permissions: {
                  select: {
                    permission: true,
                  },
                },
              },
            },
          },
        },
      },
    });
  if (!projectMembership) {
    throw new HttpException("Not a member of this project", 403);
  }
  // Check if user is the member associated with this project membership
  const isProjectMember =
    projectMembership.employee.member_id === props.member.id;
  if (!isProjectMember) {
    throw new HttpException("Not authorized for this project", 403);
  }
  // Check project-level role (member or project-lead)
  const isProjectLead = projectMembership.role === "project-lead";
  // Check organizational role permissions
  const hasProjectManagePermission =
    projectMembership.employee.role.permissions.some(
      (p: { permission: string }) => p.permission === "project:manage",
    );
  if (!isProjectLead && !hasProjectManagePermission) {
    throw new HttpException(
      "Must be project-lead or have project:manage permission",
      403,
    );
  }
  // Step 3: Validate assigned employee (if provided)
  if (props.body.hrm_platform_employee_id) {
    const employeeMembership =
      await MyGlobal.prisma.hrm_platform_project_members.findFirst({
        where: {
          hrm_platform_project_id: props.projectId,
          hrm_platform_employee_id: props.body.hrm_platform_employee_id,
          deleted_at: null,
        },
      });
    if (!employeeMembership) {
      throw new HttpException(
        "Assigned employee must be a project member",
        400,
      );
    }
  }
  // Step 4: Validate parent task (if provided)
  if (props.body.parent_id) {
    const parentTask = await MyGlobal.prisma.hrm_platform_tasks.findUnique({
      where: { id: props.body.parent_id },
      select: {
        id: true,
        hrm_platform_project_id: true,
        parent_id: true,
        deleted_at: true,
      },
    });
    if (!parentTask || parentTask.deleted_at !== null) {
      throw new HttpException("Parent task not found", 400);
    }
    if (parentTask.hrm_platform_project_id !== props.projectId) {
      throw new HttpException(
        "Parent task must belong to the same project",
        400,
      );
    }
    if (parentTask.parent_id !== null) {
      throw new HttpException(
        "Subtasks cannot have their own subtasks (one-level nesting only)",
        400,
      );
    }
  }
  // Step 5: Create the task using collector
  const created = await MyGlobal.prisma.hrm_platform_tasks.create({
    data: await HrmPlatformTaskCollector.collect({
      body: props.body,
      hrmPlatformProjects: { id: props.projectId },
    }),
    ...HrmPlatformTaskTransformer.select(),
  });
  // Step 6: Create initial task history if status is not default 'open'
  const statusToRecord = props.body.status ?? "open";
  if (statusToRecord !== "open") {
    await MyGlobal.prisma.hrm_platform_task_histories.create({
      data: {
        id: v4(),
        task: { connect: { id: created.id } },
        user: { connect: { id: props.member.id } },
        old_status: null,
        new_status: statusToRecord,
        created_at: new Date(),
      },
    });
  }
  // Step 7: Transform and return
  return await HrmPlatformTaskTransformer.transform(created);
}
