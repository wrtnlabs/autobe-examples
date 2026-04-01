import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { MemberPayload } from "../decorators/payload/MemberPayload";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function deleteHrmPlatformMemberRolesRoleId(props: {
  member: MemberPayload;
  roleId: string & tags.Format<"uuid">;
}): Promise<void> {
  // Step 1: Fetch the role to verify existence and get organization context
  const role = await MyGlobal.prisma.hrm_platform_roles.findUnique({
    where: { id: props.roleId },
    select: {
      id: true,
      hrm_platform_organization_id: true,
      is_builtin: true,
      name: true,
      deleted_at: true,
    },
  });
  if (role === null) {
    throw new HttpException("Role not found", 404);
  }
  if (role.deleted_at !== null) {
    throw new HttpException("Role not found", 404);
  }
  // Step 2: Verify member has organization owner permission (org:manage)
  // Get the member's role in this organization
  const memberEmployee = await MyGlobal.prisma.hrm_platform_employees.findFirst(
    {
      where: {
        hrm_platform_user_id: props.member.id,
        hrm_platform_organization_id: role.hrm_platform_organization_id,
        deleted_at: null,
      },
      select: {
        hrm_platform_role_id: true,
      },
    },
  );
  if (memberEmployee === null) {
    throw new HttpException("You are not a member of this organization", 403);
  }
  // Get the org:manage permission UUID
  const orgManagePermission =
    await MyGlobal.prisma.hrm_platform_permissions.findFirst({
      where: {
        code: "org:manage",
        deleted_at: null,
      },
      select: {
        id: true,
      },
    });
  if (orgManagePermission === null) {
    throw new HttpException(
      "Organization management permission not found",
      500,
    );
  }
  // Get the member's role and check permissions
  const memberRole = await MyGlobal.prisma.hrm_platform_roles.findUnique({
    where: { id: memberEmployee.hrm_platform_role_id },
    select: {
      id: true,
      permissions: {
        where: {
          deleted_at: null,
        },
        select: {
          hrm_platform_permission_id: true,
        },
      },
    },
  });
  if (memberRole === null) {
    throw new HttpException("Role not found", 404);
  }
  // Check if member has org:manage permission
  const hasOrgManagePermission = memberRole.permissions.some(
    (p) => p.hrm_platform_permission_id === orgManagePermission.id,
  );
  if (!hasOrgManagePermission) {
    throw new HttpException("Forbidden", 403);
  }
  // Step 3: Check if role is built-in
  if (role.is_builtin === true) {
    throw new HttpException("Built-in roles cannot be deleted", 403);
  }
  // Step 4: Check if any employees are assigned to this role
  const assignedEmployees = await MyGlobal.prisma.hrm_platform_employees.count({
    where: {
      hrm_platform_role_id: props.roleId,
      deleted_at: null,
    },
  });
  if (assignedEmployees > 0) {
    throw new HttpException(
      `Cannot delete role: ${assignedEmployees} employee(s) are assigned to this role. Reassign them first.`,
      409,
    );
  }
  // Step 5: Soft delete the role within a transaction
  await MyGlobal.prisma.$transaction(async (tx) => {
    await tx.hrm_platform_roles.update({
      where: { id: props.roleId },
      data: {
        deleted_at: new Date(),
      },
    });
  });
}
