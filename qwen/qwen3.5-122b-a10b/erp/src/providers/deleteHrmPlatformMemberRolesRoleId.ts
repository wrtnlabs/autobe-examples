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

// DON'T CHANGE FUNCTION NAME AND PARAMETERS,
// ONLY YOU HAVE TO WRITE THIS FUNCTION BODY, AND USE IMPORTED.
export async function deleteHrmPlatformMemberRolesRoleId(props: {
  member: MemberPayload;
  roleId: string & tags.Format<"uuid">;
}): Promise<void> {
  // Fetch the employee record to get organization context
  const employee = await MyGlobal.prisma.hrm_platform_employees.findFirst({
    where: {
      hrm_platform_user_id: props.member.id,
      deleted_at: null,
    },
    select: { hrm_platform_organization_id: true },
  });
  // Member has no employee record in any organization
  if (employee === null) {
    throw new HttpException("You are not a member of any organization", 403);
  }
  // Fetch the role by roleId with organization verification
  const role = await MyGlobal.prisma.hrm_platform_roles.findUnique({
    where: { id: props.roleId },
    select: {
      id: true,
      is_builtin: true,
      name: true,
      hrm_platform_organization_id: true,
    },
  });
  // Role not found
  if (role === null) {
    throw new HttpException("Role not found", 404);
  }
  // Verify role belongs to member's organization
  if (
    role.hrm_platform_organization_id !== employee.hrm_platform_organization_id
  ) {
    throw new HttpException("Role not found in your organization", 404);
  }
  // Check if role is built-in
  if (role.is_builtin === true) {
    throw new HttpException("Built-in roles cannot be deleted", 403);
  }
  // Check for assigned employees
  const assignedEmployees =
    await MyGlobal.prisma.hrm_platform_employees.findMany({
      where: {
        hrm_platform_role_id: props.roleId,
        deleted_at: null,
      },
      select: { id: true },
    });
  // Employees are assigned to this role
  if (assignedEmployees.length > 0) {
    throw new HttpException(
      `Cannot delete role: ${assignedEmployees.length} employee(s) are assigned to this role. Reassign them first.`,
      409,
    );
  }
  // Soft delete the role
  await MyGlobal.prisma.hrm_platform_roles.update({
    where: { id: props.roleId },
    data: {
      deleted_at: new Date(),
    },
  });
  // Log activity event for audit trail
  await MyGlobal.prisma.hrm_platform_activity_logs.create({
    data: {
      id: v4() as string & tags.Format<"uuid">,
      organization_id: employee.hrm_platform_organization_id,
      user_id: props.member.id,
      action_type: "role:deleted",
      target_entity: "role",
      target_id: props.roleId,
      details: JSON.stringify({ role_name: role.name, role_id: props.roleId }),
      created_at: new Date(),
    },
  });
}
