import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IHrmPlatformProject } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformProject";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { MemberPayload } from "../decorators/payload/MemberPayload";
import { HrmPlatformProjectTransformer } from "../transformers/HrmPlatformProjectTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function getHrmPlatformMemberProjectsProjectId(props: {
  member: MemberPayload;
  projectId: string & tags.Format<"uuid">;
}): Promise<IHrmPlatformProject> {
  // Get member's current organization from their employee record
  const employee = await MyGlobal.prisma.hrm_platform_employees.findFirst({
    where: {
      hrm_platform_user_id: props.member.id,
      deleted_at: null,
    },
    select: {
      hrm_platform_organization_id: true,
      hrm_platform_role_id: true,
    } satisfies Prisma.hrm_platform_employeesSelect,
  });
  if (employee === null) {
    throw new HttpException("Not a member of any organization", 403);
  }
  // Check project:view permission from role
  const role = await MyGlobal.prisma.hrm_platform_roles.findUnique({
    where: { id: employee.hrm_platform_role_id },
    select: {
      permissions: {
        select: {
          permission: {
            select: {
              id: true,
            },
          },
        },
      },
    } satisfies Prisma.hrm_platform_rolesSelect,
  });
  const hasProjectViewPermission = role?.permissions.some(
    (rp) => rp.permission.id === "project:view",
  );
  if (!hasProjectViewPermission) {
    throw new HttpException("Forbidden", 403);
  }
  // Query project with organization verification
  const project = await MyGlobal.prisma.hrm_platform_projects.findUniqueOrThrow(
    {
      where: {
        id: props.projectId,
        hrm_platform_organization_id: employee.hrm_platform_organization_id,
        deleted_at: null,
      },
      ...HrmPlatformProjectTransformer.select(),
    },
  );
  return await HrmPlatformProjectTransformer.transform(project);
}
