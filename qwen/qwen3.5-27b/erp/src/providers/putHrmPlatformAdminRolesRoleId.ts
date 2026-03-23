import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IHrmPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformMember";
import { IHrmPlatformOrganization } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformOrganization";
import { IHrmPlatformOrganizationLogo } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformOrganizationLogo";
import { IHrmPlatformOrganizationSetting } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformOrganizationSetting";
import { IHrmPlatformRole } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformRole";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { AdminPayload } from "../decorators/payload/AdminPayload";
import { HrmPlatformRoleTransformer } from "../transformers/HrmPlatformRoleTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function putHrmPlatformAdminRolesRoleId(props: {
  admin: AdminPayload;
  roleId: string & tags.Format<"uuid">;
  body: IHrmPlatformRole.IUpdate;
}): Promise<IHrmPlatformRole> {
  // Find the role and verify it exists
  const role = await MyGlobal.prisma.hrm_platform_roles.findUniqueOrThrow({
    where: {
      id: props.roleId,
      deleted_at: null,
    },
    select: {
      id: true,
      hrm_platform_organization_id: true,
      is_builtin: true,
    },
  });
  // Check if built-in role - cannot be modified
  if (role.is_builtin) {
    throw new HttpException("Built-in roles cannot be modified", 403);
  }
  // Check name uniqueness if name is being updated
  if (props.body.name !== undefined) {
    const existingRole = await MyGlobal.prisma.hrm_platform_roles.findFirst({
      where: {
        hrm_platform_organization_id: role.hrm_platform_organization_id,
        name: props.body.name,
        id: { not: props.roleId },
        deleted_at: null,
      },
      select: { id: true },
    });
    if (existingRole) {
      throw new HttpException(
        "Role name already exists in this organization",
        409,
      );
    }
  }
  // Update role fields
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
  // Update permissions if provided
  if (props.body.permissions !== undefined) {
    // Delete existing permissions
    await MyGlobal.prisma.hrm_platform_role_permissions.deleteMany({
      where: {
        hrm_platform_role_id: props.roleId,
        deleted_at: null,
      },
    });
    // Insert new permissions
    if (props.body.permissions.length > 0) {
      await MyGlobal.prisma.hrm_platform_role_permissions.createMany({
        data: props.body.permissions.map((permissionCode) => ({
          id: v4() as string & tags.Format<"uuid">,
          hrm_platform_role_id: props.roleId,
          permission_code: permissionCode,
          created_at: new Date(),
          updated_at: new Date(),
          deleted_at: null,
        })),
      });
    }
  }
  // Fetch updated role with full data
  const updatedRole =
    await MyGlobal.prisma.hrm_platform_roles.findUniqueOrThrow({
      where: { id: props.roleId },
      ...HrmPlatformRoleTransformer.select(),
    });
  // Transform and return
  return await HrmPlatformRoleTransformer.transform(updatedRole);
}
