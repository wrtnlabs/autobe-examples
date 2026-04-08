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

export async function getHrmPlatformMemberProjectsProjectIdTasksTaskId(props: {
  member: MemberPayload;
  projectId: string & tags.Format<"uuid">;
  taskId: string & tags.Format<"uuid">;
}): Promise<IHrmPlatformTask> {
  const task = await MyGlobal.prisma.hrm_platform_tasks.findFirstOrThrow({
    where: {
      id: props.taskId,
      hrm_platform_project_id: props.projectId,
      deleted_at: null,
    },
    ...HrmPlatformTaskTransformer.select(),
  });
  const employee = await MyGlobal.prisma.hrm_platform_employees.findFirst({
    where: {
      member_id: props.member.id,
      organization_id: task.project.organization.id,
      deleted_at: null,
    },
    select: {
      id: true,
      role: {
        select: {
          id: true,
          rolePermissions: {
            select: {
              permission: {
                select: {
                  code: true,
                },
              },
            },
          },
        },
      },
      projectMemberships: {
        where: {
          hrm_platform_project_id: props.projectId,
        },
        select: {
          id: true,
        },
      },
    },
  });
  if (!employee) {
    throw new HttpException("Forbidden", 403);
  }
  const isProjectMember = employee.projectMemberships.length > 0;
  const hasManagePermission = employee.role.rolePermissions.some(
    (rp: {
      permission: {
        code: string;
      };
    }) => rp.permission.code === "project:manage",
  );
  if (!isProjectMember && !hasManagePermission) {
    throw new HttpException("Forbidden", 403);
  }
  return await HrmPlatformTaskTransformer.transform(task);
}
