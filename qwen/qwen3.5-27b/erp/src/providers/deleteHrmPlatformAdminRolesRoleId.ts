import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { AdminPayload } from "../decorators/payload/AdminPayload";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function deleteHrmPlatformAdminRolesRoleId(props: {
  admin: AdminPayload;
  roleId: string & tags.Format<"uuid">;
}): Promise<void> {
  // Find the role by ID (throws 404 if not found)
  const role = await MyGlobal.prisma.hrm_platform_roles.findUniqueOrThrow({
    where: { id: props.roleId },
    select: {
      id: true,
      hrm_platform_organization_id: true,
      name: true,
      is_builtin: true,
    },
  });
  // Check if role is built-in (cannot delete built-in roles)
  if (role.is_builtin) {
    throw new HttpException("Built-in roles cannot be deleted", 400);
  }
  // Count employees assigned to this role (excluding soft-deleted employees)
  const employeeCount = await MyGlobal.prisma.hrm_platform_employees.count({
    where: {
      role_id: props.roleId,
      deleted_at: null,
    },
  });
  // Cannot delete role if employees are assigned
  if (employeeCount > 0) {
    throw new HttpException(
      "Cannot delete role with assigned employees. Reassign all employees first.",
      400,
    );
  }
  // Soft delete the role
  await MyGlobal.prisma.hrm_platform_roles.update({
    where: { id: props.roleId },
    data: {
      deleted_at: new Date(),
    },
  });
  // Create activity log entry for audit trail
  await MyGlobal.prisma.hrm_platform_activity_logs.create({
    data: {
      id: v4() as string & tags.Format<"uuid">,
      hrm_platform_organization_id: role.hrm_platform_organization_id,
      action_type: "role.deleted",
      target_entity_type: "role",
      target_entity_id: props.roleId as string & tags.Format<"uuid">,
      action_description: `Role "${role.name}" was deleted`,
      created_at: new Date(),
    },
  });
}
