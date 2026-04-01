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
    where: { id: props.taskId },
    select: {
      id: true,
      hrm_platform_projects_id: true,
      status: true,
    },
  });
  if (task.hrm_platform_projects_id !== props.projectId) {
    throw new HttpException(
      "Task does not belong to the specified project",
      404,
    );
  }
  // Verify member is a project member
  const projectMember =
    await MyGlobal.prisma.hrm_platform_project_members.findFirst({
      where: {
        hrm_platform_project_id: props.projectId,
        employee: {
          hrm_platform_user_id: props.member.id,
        },
      },
      select: {
        role: true,
        hrm_platform_employee_id: true,
      },
    });
  if (!projectMember) {
    throw new HttpException("You are not a member of this project", 403);
  }
  // Check if member has project-lead role or project:manage permission
  let hasPermission = projectMember.role === "project-lead";
  if (!hasPermission) {
    // Fetch employee role via hrm_platform_employee_id
    const employee = await MyGlobal.prisma.hrm_platform_employees.findUnique({
      where: { id: projectMember.hrm_platform_employee_id },
      select: {
        hrm_platform_role_id: true,
      },
    });
    if (employee?.hrm_platform_role_id) {
      const rolePermissions =
        await MyGlobal.prisma.hrm_platform_role_permissions.findMany({
          where: {
            hrm_platform_role_id: employee.hrm_platform_role_id,
          },
          select: {
            permission: {
              select: { code: true },
            },
          },
        });
      hasPermission = rolePermissions.some(
        (rp) => rp.permission.code === "project:manage",
      );
    }
  }
  if (!hasPermission) {
    throw new HttpException(
      "You do not have permission to update task status",
      403,
    );
  }
  const oldStatus = task.status;
  // Update task status
  await MyGlobal.prisma.hrm_platform_tasks.update({
    where: { id: props.taskId },
    data: {
      status: props.body.status,
      updated_at: new Date(),
    },
  });
  // Create history entry
  const historyId = v4();
  const now = new Date();
  await MyGlobal.prisma.hrm_platform_task_histories.create({
    data: {
      id: historyId as string & tags.Format<"uuid">,
      hrm_platform_task_id: props.taskId,
      hrm_platform_member_id: props.member.id,
      created_at: now,
      updated_at: now,
      changed_at: now,
      old_status: oldStatus,
      new_status: props.body.status,
    },
  });
  // Return updated task
  const updated = await MyGlobal.prisma.hrm_platform_tasks.findUniqueOrThrow({
    where: { id: props.taskId },
    ...HrmPlatformTaskTransformer.select(),
  });
  return await HrmPlatformTaskTransformer.transform(updated);
}
