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
  // 1. Validate project exists and is not soft-deleted
  const project = await MyGlobal.prisma.hrm_platform_projects.findUnique({
    where: { id: props.projectId },
    select: { id: true, deleted_at: true },
  });
  if (project === null || project.deleted_at !== null) {
    throw new HttpException("Project not found", 404);
  }
  // 2. Authorization check: project lead role
  const projectMember =
    await MyGlobal.prisma.hrm_platform_project_members.findFirst({
      where: {
        hrm_platform_project_id: props.projectId,
        hrm_platform_employee_id: props.member.id,
        deleted_at: null,
      },
      select: { role: true },
    });
  if (projectMember === null || projectMember.role !== "project-lead") {
    throw new HttpException("Forbidden", 403);
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
            },
          },
        },
        select: { id: true },
      });
    if (assignedEmployee === null) {
      throw new HttpException(
        "Assigned employee must be a project member",
        400,
      );
    }
  }
  // 4. Validate parent task if provided
  if (
    props.body.parent_task_id !== undefined &&
    props.body.parent_task_id !== null
  ) {
    const parentTask = await MyGlobal.prisma.hrm_platform_tasks.findFirst({
      where: {
        id: props.body.parent_task_id,
        deleted_at: null,
        hrm_platform_projects_id: props.projectId,
        hrm_platform_tasks_id: null,
      },
      select: { id: true },
    });
    if (parentTask === null) {
      throw new HttpException(
        "Parent task must exist in the same project and cannot be a child task",
        400,
      );
    }
  }
  // 5. Create task using collector
  const task = await MyGlobal.prisma.hrm_platform_tasks.create({
    data: await HrmPlatformTaskCollector.collect({
      body: props.body,
      hrmPlatformProjects: {
        id: props.projectId,
      } satisfies IEntity,
    }),
    ...HrmPlatformTaskTransformer.select(),
  });
  // 6. Create task history record for initial status change
  await MyGlobal.prisma.hrm_platform_task_histories.create({
    data: {
      id: v4() as string & tags.Format<"uuid">,
      hrm_platform_task_id: task.id,
      hrm_platform_member_id: props.member.id,
      old_status: "",
      new_status: "open",
      created_at: new Date(),
      changed_at: new Date(),
      updated_at: new Date(),
    },
  });
  // 7. Return transformed task
  return await HrmPlatformTaskTransformer.transform(task);
}
