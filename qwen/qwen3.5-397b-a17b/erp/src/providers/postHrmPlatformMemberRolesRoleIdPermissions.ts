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
import { HrmPlatformRolePermissionCollector } from "../collectors/HrmPlatformRolePermissionCollector";
import { MemberPayload } from "../decorators/payload/MemberPayload";
import { HrmPlatformRolePermissionTransformer } from "../transformers/HrmPlatformRolePermissionTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function postHrmPlatformMemberRolesRoleIdPermissions(props: {
  member: MemberPayload;
  roleId: string & tags.Format<"uuid">;
  body: IHrmPlatformRolePermission.ICreate;
}): Promise<IHrmPlatformRolePermission> {
  const VALID_PERMISSIONS = [
    "org:manage",
    "employee:manage",
    "employee:view",
    "project:manage",
    "project:view",
    "time:manage",
    "time:approve",
    "time:view_all",
    "report:view",
  ];
  const role = await MyGlobal.prisma.hrm_platform_roles.findUniqueOrThrow({
    where: { id: props.roleId },
    select: { id: true, is_builtin: true },
  });
  if (role.is_builtin) {
    throw new HttpException("Cannot modify permissions of built-in roles", 403);
  }
  if (!VALID_PERMISSIONS.includes(props.body.permission)) {
    throw new HttpException(
      `Invalid permission code. Must be one of: ${VALID_PERMISSIONS.join(", ")}`,
      400,
    );
  }
  const existing =
    await MyGlobal.prisma.hrm_platform_role_permissions.findFirst({
      where: {
        hrm_platform_role_id: props.roleId,
        permission: props.body.permission,
        deleted_at: null,
      },
    });
  if (existing) {
    throw new HttpException("Permission already exists for this role", 409);
  }
  const created = await MyGlobal.prisma.hrm_platform_role_permissions.create({
    data: await HrmPlatformRolePermissionCollector.collect({
      body: props.body,
      hrmPlatformRoles: { id: props.roleId },
    }),
    ...HrmPlatformRolePermissionTransformer.select(),
  });
  return await HrmPlatformRolePermissionTransformer.transform(created);
}
