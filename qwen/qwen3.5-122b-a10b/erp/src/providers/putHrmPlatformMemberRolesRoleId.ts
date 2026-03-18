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

export async function putHrmPlatformMemberRolesRoleId(props: {
  member: MemberPayload;
  roleId: string & tags.Format<"uuid">;
  body: IHrmPlatformRole.IUpdate;
}): Promise<IHrmPlatformRole> {
  // 1. Verify organization context and owner authorization
  const employee = await MyGlobal.prisma.hrm_platform_employees.findFirst({
    where: {
      hrm_platform_user_id: props.member.id,
      deleted_at: null,
    },
    select: {
      hrm_platform_organization_id: true,
      hrm_platform_role_id: true,
    },
  });
  if (!employee) {
    throw new HttpException("Forbidden", 403);
  }
  // Check if user has owner role
  const userRole = await MyGlobal.prisma.hrm_platform_roles.findUnique({
    where: { id: employee.hrm_platform_role_id },
    select: { code: true },
  });
  if (userRole?.code !== "owner") {
    throw new HttpException("Forbidden", 403);
  }
  // 2. Retrieve the role
  const role = await MyGlobal.prisma.hrm_platform_roles.findUniqueOrThrow({
    where: { id: props.roleId },
    select: { id: true, is_builtin: true, hrm_platform_organization_id: true },
  });
  // 3. Check if built-in role
  if (role.is_builtin) {
    throw new HttpException("Built-in roles cannot be modified", 400);
  }
  // 4. Validate permission codes if provided
  if (props.body.permissions !== undefined) {
    const permissionCodes = props.body.permissions;
    if (permissionCodes.length > 0) {
      const permissions =
        await MyGlobal.prisma.hrm_platform_permissions.findMany({
          where: {
            code: { in: permissionCodes },
            deleted_at: null,
          },
          select: { code: true },
        });
      const foundCodes = new Set(permissions.map((p) => p.code));
      const invalidCodes = permissionCodes.filter(
        (code) => !foundCodes.has(code),
      );
      if (invalidCodes.length > 0) {
        throw new HttpException(
          `Invalid permission codes: ${invalidCodes.join(", ")}`,
          400,
        );
      }
    }
  }
  // 5. Check name uniqueness if name is being changed
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
        "Role name must be unique within the organization",
        409,
      );
    }
  }
  // 6. Update role and permissions in transaction
  await MyGlobal.prisma.$transaction(async (tx) => {
    // Update role
    await tx.hrm_platform_roles.update({
      where: { id: props.roleId },
      data: {
        ...(props.body.name !== undefined && { name: props.body.name }),
        ...(props.body.description !== undefined && {
          description: props.body.description,
        }),
        updated_at: new Date(),
      },
    });
    // Delete existing role_permissions
    await tx.hrm_platform_role_permissions.deleteMany({
      where: {
        hrm_platform_role_id: props.roleId,
        deleted_at: null,
      },
    });
    // Insert new role_permissions if permissions provided
    if (
      props.body.permissions !== undefined &&
      props.body.permissions.length > 0
    ) {
      const permissions = await tx.hrm_platform_permissions.findMany({
        where: {
          code: { in: props.body.permissions },
          deleted_at: null,
        },
        select: { id: true },
      });
      await tx.hrm_platform_role_permissions.createMany({
        data: permissions.map((permission) => ({
          id: v4(),
          hrm_platform_role_id: props.roleId,
          hrm_platform_permission_id: permission.id,
          created_at: new Date(),
          updated_at: new Date(),
          deleted_at: null,
        })),
      });
    }
  });
  // 7. Fetch and return updated role
  const updated = await MyGlobal.prisma.hrm_platform_roles.findUniqueOrThrow({
    where: { id: props.roleId },
    ...HrmPlatformRoleTransformer.select(),
  });
  return await HrmPlatformRoleTransformer.transform(updated);
}
