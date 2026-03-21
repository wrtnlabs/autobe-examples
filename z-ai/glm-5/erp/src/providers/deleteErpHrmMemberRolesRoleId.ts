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

export async function deleteErpHrmMemberRolesRoleId(props: {
  member: MemberPayload;
  roleId: string & tags.Format<"uuid">;
}): Promise<void> {
  // Get session to find organization context
  const session =
    await MyGlobal.prisma.erp_hrm_member_sessions.findUniqueOrThrow({
      where: { id: props.member.session_id },
      select: { erp_hrm_organization_id: true },
    });
  if (session.erp_hrm_organization_id === null) {
    throw new HttpException("No organization context selected", 403);
  }
  // Get employee to check if user is owner
  const employee = await MyGlobal.prisma.erp_hrm_employees.findFirst({
    where: {
      erp_hrm_member_id: props.member.id,
      erp_hrm_organization_id: session.erp_hrm_organization_id,
      deleted_at: null,
    },
    select: {
      erp_hrm_role_id: true,
      role: { select: { name: true } },
    },
  });
  if (employee === null) {
    throw new HttpException(
      "You are not an employee in this organization",
      403,
    );
  }
  // Only Owner can delete roles
  if (employee.role.name !== "Owner") {
    throw new HttpException("Only organization owners can delete roles", 403);
  }
  // Fetch the role to delete
  const role = await MyGlobal.prisma.erp_hrm_roles.findUniqueOrThrow({
    where: { id: props.roleId },
    select: {
      id: true,
      is_builtin: true,
      organization_id: true,
    },
  });
  // Verify role belongs to the same organization
  if (role.organization_id !== session.erp_hrm_organization_id) {
    throw new HttpException("Role not found in your organization", 404);
  }
  // Check if built-in role
  if (role.is_builtin === true) {
    throw new HttpException("Built-in roles cannot be deleted", 403);
  }
  // Count employees assigned to this role
  const employeeCount = await MyGlobal.prisma.erp_hrm_employees.count({
    where: {
      erp_hrm_role_id: props.roleId,
      deleted_at: null,
    },
  });
  if (employeeCount > 0) {
    throw new HttpException(
      `Cannot delete role: ${employeeCount} employee(s) are currently assigned to this role`,
      403,
    );
  }
  // Hard delete the role
  await MyGlobal.prisma.erp_hrm_roles.delete({
    where: { id: props.roleId },
  });
}
