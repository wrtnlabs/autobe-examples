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
import { MemberPayload } from "../decorators/payload/MemberPayload";
import { HrmPlatformRolePermissionTransformer } from "../transformers/HrmPlatformRolePermissionTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function patchHrmPlatformMemberRolesRoleIdPermissions(props: {
  member: MemberPayload;
  roleId: string & tags.Format<"uuid">;
  body: IHrmPlatformRole.IPermissionsUpdate;
}): Promise<IHrmPlatformRolePermission> {
  const ALLOWED_PERMISSIONS = new Set([
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
  const role = await MyGlobal.prisma.hrm_platform_roles.findUniqueOrThrow({
    where: { id: props.roleId },
    select: {
      id: true,
      is_builtin: true,
      organization_id: true,
    },
  });
  if (role.is_builtin) {
    throw new HttpException("Cannot modify permissions of built-in roles", 403);
  }
  const employee =
    await MyGlobal.prisma.hrm_platform_employees.findFirstOrThrow({
      where: {
        user_id: props.member.id,
        deleted_at: null,
      },
      select: {
        organization_id: true,
      },
    });
  if (role.organization_id !== employee.organization_id) {
    throw new HttpException("Role does not belong to your organization", 403);
  }
  for (const permissionCode of props.body.permissionCodes) {
    if (!ALLOWED_PERMISSIONS.has(permissionCode)) {
      throw new HttpException(
        `Invalid permission code: ${permissionCode}`,
        400,
      );
    }
  }
  const now = new Date();
  await MyGlobal.prisma.hrm_platform_role_permissions.updateMany({
    where: {
      hrm_platform_role_id: props.roleId,
      deleted_at: null,
    },
    data: {
      deleted_at: now,
      updated_at: now,
    },
  });
  await MyGlobal.prisma.hrm_platform_role_permissions.createMany({
    data: props.body.permissionCodes.map(
      (code) =>
        ({
          id: v4(),
          hrm_platform_role_id: props.roleId,
          permission: code,
          created_at: now,
          updated_at: now,
          deleted_at: null,
        }) satisfies Prisma.hrm_platform_role_permissionsCreateManyInput,
    ),
  });
  const firstPermission =
    await MyGlobal.prisma.hrm_platform_role_permissions.findFirstOrThrow({
      where: {
        hrm_platform_role_id: props.roleId,
        deleted_at: null,
      },
      orderBy: {
        created_at: "desc",
      },
      ...HrmPlatformRolePermissionTransformer.select(),
    });
  return await HrmPlatformRolePermissionTransformer.transform(firstPermission);
}
