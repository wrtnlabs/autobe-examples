import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { MemberPayload } from "../decorators/payload/MemberPayload";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function deleteHrmPlatformMemberProjectsProjectIdTasksTaskId(props: {
  member: MemberPayload;
  projectId: string & tags.Format<"uuid">;
  taskId: string & tags.Format<"uuid">;
}): Promise<void> {
  const now: string & tags.Format<"date-time"> = toISOStringSafe(new Date());
  const task = await MyGlobal.prisma.hrm_platform_tasks.findUniqueOrThrow({
    where: {
      id: props.taskId,
      hrm_platform_project_id: props.projectId,
      deleted_at: null,
    },
  });
  const employee =
    await MyGlobal.prisma.hrm_platform_employees.findFirstOrThrow({
      where: {
        member_id: props.member.id,
        deleted_at: null,
      },
    });
  const projectMembership =
    await MyGlobal.prisma.hrm_platform_project_members.findFirst({
      where: {
        hrm_platform_project_id: props.projectId,
        hrm_platform_employee_id: employee.id,
        role: "project-lead",
      },
    });
  const isProjectLead = projectMembership !== null;
  const hasManagePermission =
    await MyGlobal.prisma.hrm_platform_role_permissions.findFirst({
      where: {
        hrm_platform_role_id: employee.role_id,
        permission: {
          code: "project:manage",
          deleted_at: null,
        },
      },
    });
  if (!isProjectLead && !hasManagePermission) {
    throw new HttpException("Forbidden", 403);
  }
  await MyGlobal.prisma.hrm_platform_tasks.update({
    where: {
      id: props.taskId,
    },
    data: {
      deleted_at: now,
    },
  });
  await MyGlobal.prisma.hrm_platform_tasks.updateMany({
    where: {
      parent_task_id: props.taskId,
      deleted_at: null,
    },
    data: {
      deleted_at: now,
    },
  });
}
