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
  // 1. Get organization context from employee record
  const employee = await MyGlobal.prisma.hrm_platform_employees.findFirst({
    where: {
      hrm_platform_user_id: props.member.id,
      deleted_at: null,
    },
    select: {
      hrm_platform_organization_id: true,
    },
  });
  if (!employee) {
    throw new HttpException("Member not found in any organization", 404);
  }
  // 2. Find the role (404 if not found or wrong organization)
  const role = await MyGlobal.prisma.hrm_platform_roles.findUniqueOrThrow({
    where: {
      id: props.roleId,
      hrm_platform_organization_id: employee.hrm_platform_organization_id,
      deleted_at: null,
    },
  });
  // 3. Check if built-in role (cannot be modified)
  if (role.is_builtin) {
    throw new HttpException("Built-in roles cannot be modified", 400);
  }
  // 4. Validate permission codes exist
  if (props.body.permissions && props.body.permissions.length > 0) {
    const permissions = await MyGlobal.prisma.hrm_platform_permissions.findMany(
      {
        where: {
          code: {
            in: props.body.permissions,
          },
          deleted_at: null,
        },
        select: {
          code: true,
        },
      },
    );
    const validCodes = new Set(permissions.map((p) => p.code));
    const invalidCodes = props.body.permissions.filter(
      (code) => !validCodes.has(code),
    );
    if (invalidCodes.length > 0) {
      throw new HttpException(
        `Invalid permission codes: ${invalidCodes.join(", ")}`,
        400,
      );
    }
  }
  // 5. Check name uniqueness if name is being changed
  if (props.body.name && props.body.name !== role.name) {
    const duplicate = await MyGlobal.prisma.hrm_platform_roles.findFirst({
      where: {
        hrm_platform_organization_id: employee.hrm_platform_organization_id,
        name: props.body.name,
        id: {
          not: props.roleId,
        },
        deleted_at: null,
      },
    });
    if (duplicate) {
      throw new HttpException(
        "Role name must be unique within organization",
        409,
      );
    }
  }
  // 6. Update role and permissions in transaction
  const now = new Date();
  const updated = await MyGlobal.prisma.$transaction(async (tx) => {
    // Update role record
    await tx.hrm_platform_roles.update({
      where: { id: props.roleId },
      data: {
        ...(props.body.name !== undefined && { name: props.body.name }),
        ...(props.body.description !== undefined && {
          description: props.body.description,
        }),
        updated_at: now,
      },
    });
    // Delete existing role permissions
    await tx.hrm_platform_role_permissions.deleteMany({
      where: {
        hrm_platform_role_id: props.roleId,
        deleted_at: null,
      },
    });
    // Insert new role permissions
    if (props.body.permissions && props.body.permissions.length > 0) {
      const permissionRecords = await tx.hrm_platform_permissions.findMany({
        where: {
          code: {
            in: props.body.permissions,
          },
          deleted_at: null,
        },
      });
      await tx.hrm_platform_role_permissions.createMany({
        data: permissionRecords.map((permission) => ({
          id: v4(),
          hrm_platform_role_id: props.roleId,
          hrm_platform_permission_id: permission.id,
          created_at: now,
          updated_at: now,
          deleted_at: null,
        })),
      });
    }
    // Fetch updated role with permissions
    return await tx.hrm_platform_roles.findUniqueOrThrow({
      where: { id: props.roleId },
      ...HrmPlatformRoleTransformer.select(),
    });
  });
  // 7. Transform and return
  return await HrmPlatformRoleTransformer.transform(updated);
}
