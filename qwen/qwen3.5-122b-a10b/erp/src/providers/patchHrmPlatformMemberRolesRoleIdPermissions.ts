import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IHrmPlatformPermission } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformPermission";
import { IHrmPlatformRole } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformRole";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { MemberPayload } from "../decorators/payload/MemberPayload";
import { HrmPlatformRoleTransformer } from "../transformers/HrmPlatformRoleTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function patchHrmPlatformMemberRolesRoleIdPermissions(props: {
  member: MemberPayload;
  roleId: string & tags.Format<"uuid">;
  body: IHrmPlatformRole.IPermissionUpdate;
}): Promise<IHrmPlatformRole> {
  const role = await MyGlobal.prisma.hrm_platform_roles.findUniqueOrThrow({
    where: { id: props.roleId },
    select: {
      id: true,
      hrm_platform_organization_id: true,
      is_builtin: true,
    },
  });
  if (role.is_builtin) {
    throw new HttpException("Cannot modify built-in role permissions", 403);
  }
  const permissionIds = Array.from(new Set(props.body.permission_ids));
  if (permissionIds.length > 0) {
    const permissions = await MyGlobal.prisma.hrm_platform_permissions.findMany(
      {
        where: {
          id: { in: permissionIds },
          deleted_at: null,
        },
        select: { id: true },
      },
    );
    if (permissions.length !== permissionIds.length) {
      throw new HttpException(
        "One or more permission IDs are invalid or deleted",
        400,
      );
    }
  }
  await MyGlobal.prisma.$transaction(async (tx) => {
    await tx.hrm_platform_role_permissions.deleteMany({
      where: { hrm_platform_role_id: props.roleId },
    });
    if (permissionIds.length > 0) {
      await tx.hrm_platform_role_permissions.createMany({
        data: permissionIds.map((permissionId) => ({
          id: v4() as string & tags.Format<"uuid">,
          hrm_platform_role_id: props.roleId,
          hrm_platform_permission_id: permissionId,
          created_at: new Date(),
          updated_at: new Date(),
          deleted_at: null,
        })),
      });
    }
  });
  const updatedRole =
    await MyGlobal.prisma.hrm_platform_roles.findUniqueOrThrow({
      where: { id: props.roleId },
      ...HrmPlatformRoleTransformer.select(),
    });
  return await HrmPlatformRoleTransformer.transform(updatedRole);
}
