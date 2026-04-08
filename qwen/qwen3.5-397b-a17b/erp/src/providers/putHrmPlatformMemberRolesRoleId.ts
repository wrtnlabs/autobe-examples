import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IHrmPlatformOrganization } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformOrganization";
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

export async function putHrmPlatformMemberRolesRoleId(props: {
  member: MemberPayload;
  roleId: string & tags.Format<"uuid">;
  body: IHrmPlatformRole.IUpdate;
}): Promise<IHrmPlatformRole> {
  const role = await MyGlobal.prisma.hrm_platform_roles.findUniqueOrThrow({
    where: { id: props.roleId },
    select: {
      id: true,
      organization_id: true,
      is_built_in: true,
      name: true,
    },
  });
  const membership =
    await MyGlobal.prisma.hrm_platform_organization_memberships.findFirst({
      where: {
        hrm_platform_member_id: props.member.id,
        hrm_platform_organization_id: role.organization_id,
        deleted_at: null,
      },
    });
  if (!membership) {
    throw new HttpException("Forbidden", 403);
  }
  if (role.is_built_in) {
    throw new HttpException("Built-in roles cannot be modified", 403);
  }
  if (props.body.name !== undefined) {
    const existingRole = await MyGlobal.prisma.hrm_platform_roles.findFirst({
      where: {
        organization_id: role.organization_id,
        name: props.body.name,
        id: { not: props.roleId },
        deleted_at: null,
      },
    });
    if (existingRole) {
      throw new HttpException("Role name already exists in organization", 409);
    }
  }
  if (props.body.permissionIds !== undefined) {
    for (const permissionId of props.body.permissionIds) {
      const permission =
        await MyGlobal.prisma.hrm_platform_permissions.findUnique({
          where: { id: permissionId },
        });
      if (!permission) {
        throw new HttpException(`Permission ${permissionId} not found`, 404);
      }
    }
    await MyGlobal.prisma.hrm_platform_role_permissions.deleteMany({
      where: { hrm_platform_role_id: props.roleId },
    });
    if (props.body.permissionIds.length > 0) {
      await MyGlobal.prisma.hrm_platform_role_permissions.createMany({
        data: props.body.permissionIds.map((permissionId) => ({
          id: v4(),
          hrm_platform_role_id: props.roleId,
          hrm_platform_permission_id: permissionId,
          created_at: new Date(),
          updated_at: new Date(),
        })),
      });
    }
  }
  await MyGlobal.prisma.hrm_platform_roles.update({
    where: { id: props.roleId },
    data: {
      ...(props.body.name !== undefined && { name: props.body.name }),
      ...(props.body.description !== undefined && {
        description: props.body.description,
      }),
      updated_at: new Date(),
    },
  });
  const updated = await MyGlobal.prisma.hrm_platform_roles.findUniqueOrThrow({
    where: { id: props.roleId },
    ...HrmPlatformRoleTransformer.select(),
  });
  return await HrmPlatformRoleTransformer.transform(updated);
}
