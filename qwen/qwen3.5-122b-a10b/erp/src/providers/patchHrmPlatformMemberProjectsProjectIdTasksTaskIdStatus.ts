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

export async function patchHrmPlatformMemberProjectsProjectIdTasksTaskIdStatus(props: {
  member: MemberPayload;
  projectId: string & tags.Format<"uuid">;
  taskId: string & tags.Format<"uuid">;
  body: IHrmPlatformTask.IStatusChange;
}): Promise<IHrmPlatformTask> {
  // Verify task exists and belongs to the specified project
  const task = await MyGlobal.prisma.hrm_platform_tasks.findUniqueOrThrow({
    where: {
      id: props.taskId,
      hrm_platform_projects_id: props.projectId,
      deleted_at: null,
    },
    select: {
      id: true,
      status: true,
      hrm_platform_projects_id: true,
      hrm_platform_employees_id: true,
    },
  });
  // Verify authorization - member must be project lead or have project:manage permission
  const employee = await MyGlobal.prisma.hrm_platform_employees.findFirst({
    where: {
      hrm_platform_user_id: props.member.id,
      deleted_at: null,
    },
    select: {
      id: true,
      hrm_platform_role_id: true,
    },
  });
  if (!employee) {
    throw new HttpException("Forbidden", 403);
  }
  // Check if member is project lead for this project
  const projectMember =
    await MyGlobal.prisma.hrm_platform_project_members.findFirst({
      where: {
        hrm_platform_project_id: props.projectId,
        hrm_platform_employee_id: employee.id,
        deleted_at: null,
      },
      select: {
        role: true,
      },
    });
  let hasPermission = false;
  if (projectMember && projectMember.role === "project-lead") {
    hasPermission = true;
  } else {
    // Check for project:manage permission via role
    const permission = await MyGlobal.prisma.hrm_platform_permissions.findFirst(
      {
        where: {
          code: "project:manage",
          deleted_at: null,
        },
        select: {
          id: true,
        },
      },
    );
    if (permission) {
      const rolePermission =
        await MyGlobal.prisma.hrm_platform_role_permissions.findFirst({
          where: {
            hrm_platform_role_id: employee.hrm_platform_role_id,
            hrm_platform_permission_id: permission.id,
            deleted_at: null,
          },
        });
      if (rolePermission) {
        hasPermission = true;
      }
    }
  }
  if (!hasPermission) {
    throw new HttpException("Forbidden", 403);
  }
  // Update task status
  await MyGlobal.prisma.hrm_platform_tasks.update({
    where: { id: props.taskId },
    data: {
      status: props.body.status,
      updated_at: new Date(),
    },
  });
  // Create history entry
  const historyId = v4() as string & tags.Format<"uuid">;
  const changedAt = new Date();
  await MyGlobal.prisma.hrm_platform_task_histories.create({
    data: {
      id: historyId,
      hrm_platform_task_id: props.taskId,
      hrm_platform_member_id: props.member.id,
      changed_at: toISOStringSafe(changedAt),
      old_status: task.status,
      new_status: props.body.status,
      created_at: toISOStringSafe(changedAt),
      updated_at: toISOStringSafe(changedAt),
      deleted_at: null,
    },
  });
  // Fetch updated task with all relations
  const updatedTask =
    await MyGlobal.prisma.hrm_platform_tasks.findUniqueOrThrow({
      where: { id: props.taskId },
      ...HrmPlatformTaskTransformer.select(),
    });
  return await HrmPlatformTaskTransformer.transform(updatedTask);
}
