import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IHrmPlatformOrganization } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformOrganization";
import { IHrmPlatformRole } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformRole";
import { IHrmPlatformRolePermission } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformRolePermission";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { HrmPlatformRoleCollector } from "../collectors/HrmPlatformRoleCollector";
import { MemberPayload } from "../decorators/payload/MemberPayload";
import { HrmPlatformRoleTransformer } from "../transformers/HrmPlatformRoleTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function postHrmPlatformMemberRoles(props: {
  member: MemberPayload;
  body: IHrmPlatformRole.ICreate;
}): Promise<IHrmPlatformRole> {
  const VALID_PERMISSIONS = new Set([
    "org:manage",
    "employee:manage",
    "employee:view",
    "project:manage",
    "project:view",
    "time:manage",
    "time:approve",
    "time:view_all",
    "report:view",
  ]);
  const employee =
    await MyGlobal.prisma.hrm_platform_employees.findFirstOrThrow({
      where: {
        user_id: props.member.id,
        deleted_at: null,
      },
      select: {
        id: true,
        organization_id: true,
        role_id: true,
      },
    });
  const role = await MyGlobal.prisma.hrm_platform_roles.findUniqueOrThrow({
    where: { id: employee.role_id },
    select: {
      rolePermissions: {
        where: { deleted_at: null },
        select: { permission: true },
      },
    },
  });
  const hasOrgManage = role.rolePermissions.some(
    (rp) => rp.permission === "org:manage",
  );
  if (!hasOrgManage) {
    throw new HttpException("Forbidden: org:manage permission required", 403);
  }
  const existingRole = await MyGlobal.prisma.hrm_platform_roles.findFirst({
    where: {
      organization_id: employee.organization_id,
      name: props.body.name,
      deleted_at: null,
    },
  });
  if (existingRole) {
    throw new HttpException(
      `Role name '${props.body.name}' already exists in this organization`,
      409,
    );
  }
  for (const permission of props.body.permissions) {
    if (!VALID_PERMISSIONS.has(permission)) {
      throw new HttpException(`Invalid permission code: ${permission}`, 400);
    }
  }
  const created = await MyGlobal.prisma.hrm_platform_roles.create({
    data: await HrmPlatformRoleCollector.collect({
      body: props.body,
      hrmPlatformOrganizations: { id: employee.organization_id },
    }),
    ...HrmPlatformRoleTransformer.select(),
  });
  return await HrmPlatformRoleTransformer.transform(created);
}
