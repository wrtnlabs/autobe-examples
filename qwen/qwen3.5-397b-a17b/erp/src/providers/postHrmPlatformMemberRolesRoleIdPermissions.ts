import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
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
  const role = await MyGlobal.prisma.hrm_platform_roles.findUniqueOrThrow({
    where: { id: props.roleId },
    select: {
      id: true,
      name: true,
      built_in: true,
      organization_id: true,
    },
  });
  if (role.built_in) {
    throw new HttpException("Cannot modify permissions of built-in roles", 400);
  }
  const employee =
    await MyGlobal.prisma.hrm_platform_employees.findFirstOrThrow({
      where: {
        member_id: props.member.id,
        organization_id: role.organization_id,
        deleted_at: null,
      },
      select: {
        id: true,
        role_id: true,
        organization_id: true,
      },
    });
  const existingPermission =
    await MyGlobal.prisma.hrm_platform_role_permissions.findFirst({
      where: {
        role_id: props.roleId,
        permission: props.body.permission,
        deleted_at: null,
      },
    });
  if (existingPermission) {
    throw new HttpException("Permission already assigned to this role", 400);
  }
  const userRole = await MyGlobal.prisma.hrm_platform_roles.findUniqueOrThrow({
    where: { id: employee.role_id },
    select: {
      built_in: true,
      name: true,
    },
  });
  const isOwner = userRole.built_in && userRole.name === "Owner";
  if (!isOwner) {
    const hasOrgManage =
      await MyGlobal.prisma.hrm_platform_role_permissions.findFirst({
        where: {
          role_id: employee.role_id,
          permission: "org:manage",
          deleted_at: null,
        },
      });
    if (!hasOrgManage) {
      throw new HttpException(
        "Forbidden: Requires org:manage permission or owner role",
        403,
      );
    }
  }
  const created = await MyGlobal.prisma.hrm_platform_role_permissions.create({
    data: await HrmPlatformRolePermissionCollector.collect({
      body: props.body,
      hrmPlatformRoles: { id: props.roleId },
    }),
    ...HrmPlatformRolePermissionTransformer.select(),
  });
  await MyGlobal.prisma.hrm_platform_activity_logs.create({
    data: {
      id: v4(),
      member_id: props.member.id,
      organization_id: role.organization_id,
      action_type: "role.permission.added",
      target_entity_type: "role",
      target_entity_id: props.roleId,
      details: `Added permission ${props.body.permission} to role ${role.name}`,
      created_at: new Date(),
      updated_at: new Date(),
      deleted_at: null,
    },
  });
  return await HrmPlatformRolePermissionTransformer.transform(created);
}
