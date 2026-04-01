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

export async function deleteHrmPlatformMemberEmployeesEmployeeId(props: {
  member: MemberPayload;
  employeeId: string & tags.Format<"uuid">;
}): Promise<void> {
  // Get the employee record to verify existence and get organization context
  const employee =
    await MyGlobal.prisma.hrm_platform_employees.findUniqueOrThrow({
      where: { id: props.employeeId },
      select: {
        id: true,
        organization_id: true,
        user_id: true,
        role_id: true,
        status: true,
        deleted_at: true,
      },
    });
  // Get the authenticated member's role in this organization
  const memberEmployee =
    await MyGlobal.prisma.hrm_platform_employees.findFirstOrThrow({
      where: {
        organization_id: employee.organization_id,
        user_id: props.member.id,
        deleted_at: null,
      },
      select: {
        role_id: true,
      },
    });
  // Check if member has 'employee:manage' permission
  const hasPermission =
    await MyGlobal.prisma.hrm_platform_role_permissions.findFirst({
      where: {
        hrm_platform_role_id: memberEmployee.role_id,
        permission: "employee:manage",
        deleted_at: null,
      },
    });
  if (!hasPermission) {
    throw new HttpException("Forbidden", 403);
  }
  // Check if employee is already deactivated
  if (employee.deleted_at !== null || employee.status === "deactivated") {
    return;
  }
  // Check if this employee is the sole owner of the organization
  const role = await MyGlobal.prisma.hrm_platform_roles.findUniqueOrThrow({
    where: { id: employee.role_id },
    select: { name: true, is_builtin: true },
  });
  if (role.name === "Owner" && role.is_builtin) {
    // Count how many owners exist in this organization
    const ownerCount = await MyGlobal.prisma.hrm_platform_employees.count({
      where: {
        organization_id: employee.organization_id,
        role: {
          name: "Owner",
          is_builtin: true,
        },
        deleted_at: null,
      },
    });
    // If this is the only owner, prevent deactivation
    if (ownerCount === 1) {
      throw new HttpException(
        "Cannot deactivate the sole owner of an organization. Transfer ownership first.",
        400,
      );
    }
  }
  // Perform soft delete: update deleted_at and status
  await MyGlobal.prisma.hrm_platform_employees.update({
    where: { id: props.employeeId },
    data: {
      deleted_at: new Date(),
      status: "deactivated",
      updated_at: new Date(),
    },
  });
  // Record activity log
  await MyGlobal.prisma.hrm_platform_activity_logs.create({
    data: {
      id: v4(),
      organization_id: employee.organization_id,
      member_id: props.member.id,
      action_type: "employee.deactivated",
      target_entity_type: "employee",
      target_entity_id: props.employeeId,
      details: JSON.stringify({
        employee_id: props.employeeId,
        user_id: employee.user_id,
        previous_status: employee.status,
      }),
      created_at: new Date(),
      updated_at: new Date(),
      deleted_at: null,
    },
  });
}
