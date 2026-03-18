import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IErpHrmMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmMember";
import { IErpHrmOrganization } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmOrganization";
import { IErpHrmRole } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmRole";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { MemberPayload } from "../decorators/payload/MemberPayload";
import { ErpHrmRoleTransformer } from "../transformers/ErpHrmRoleTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function putErpHrmMemberRolesRoleId(props: {
  member: MemberPayload;
  roleId: string;
  body: IErpHrmRole.IUpdate;
}): Promise<IErpHrmRole> {
  // Find the existing role
  const existingRole = await MyGlobal.prisma.erp_hrm_roles.findUniqueOrThrow({
    where: { id: props.roleId },
    select: {
      id: true,
      name: true,
      description: true,
      is_builtin: true,
      organization_id: true,
      rolePermissions: {
        select: { id: true, permission: true },
      },
    },
  });
  // Check if user has permission to manage roles in this organization
  const organizationMember =
    await MyGlobal.prisma.erp_hrm_organization_members.findFirstOrThrow({
      where: {
        user_id: props.member.id,
        organization_id: existingRole.organization_id,
        is_active: true,
        deleted_at: null,
      },
      select: {
        role: {
          select: {
            rolePermissions: {
              select: { permission: true },
            },
          },
        },
      },
    });
  const hasManagePermission = organizationMember.role.rolePermissions.some(
    (rp) => rp.permission === "org:manage" || rp.permission === "role:manage",
  );
  if (!hasManagePermission) {
    throw new HttpException(
      "Forbidden: Insufficient permissions to manage roles",
      403,
    );
  }
  // Built-in roles cannot have permissions modified
  if (existingRole.is_builtin && props.body.permissions !== undefined) {
    throw new HttpException("Cannot modify permissions of built-in roles", 400);
  }
  // Validate name uniqueness if name is being updated
  if (props.body.name !== undefined) {
    const nameExists = await MyGlobal.prisma.erp_hrm_roles.count({
      where: {
        organization_id: existingRole.organization_id,
        name: {
          equals: props.body.name,
          mode: "insensitive",
        },
        id: { not: props.roleId },
        deleted_at: null,
      },
    });
    if (nameExists > 0) {
      throw new HttpException(
        "Role name already exists in this organization",
        409,
      );
    }
  }
  // Update the role record
  await MyGlobal.prisma.erp_hrm_roles.update({
    where: { id: props.roleId },
    data: {
      ...(props.body.name !== undefined && { name: props.body.name }),
      ...(props.body.description !== undefined && {
        description: props.body.description,
      }),
      updated_at: new Date(),
    },
  });
  // Handle permission updates if provided
  if (props.body.permissions !== undefined && !existingRole.is_builtin) {
    // Delete existing permissions
    await MyGlobal.prisma.erp_hrm_role_permissions.deleteMany({
      where: { role_id: props.roleId },
    });
    // Create new permissions
    if (props.body.permissions.length > 0) {
      const now = new Date();
      await MyGlobal.prisma.erp_hrm_role_permissions.createMany({
        data: props.body.permissions.map((permission) => ({
          id: v4(),
          role_id: props.roleId,
          permission,
          created_at: now,
          updated_at: now,
          deleted_at: null,
        })),
      });
    }
  }
  // Fetch and return the updated role with transformer
  const updatedRole = await MyGlobal.prisma.erp_hrm_roles.findUniqueOrThrow({
    where: { id: props.roleId },
    ...ErpHrmRoleTransformer.select(),
  });
  return await ErpHrmRoleTransformer.transform(updatedRole);
}
