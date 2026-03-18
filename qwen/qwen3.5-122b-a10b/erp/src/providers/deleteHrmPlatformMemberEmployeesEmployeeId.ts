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
  // Find target employee with necessary relations
  const employee =
    await MyGlobal.prisma.hrm_platform_employees.findUniqueOrThrow({
      where: { id: props.employeeId },
      select: {
        id: true,
        hrm_platform_organization_id: true,
        hrm_platform_role_id: true,
        status: true,
        deleted_at: true,
      },
    });
  // Verify employee is not already deleted
  if (employee.deleted_at !== null) {
    throw new HttpException("Employee already deleted", 409);
  }
  // Find member's employee record in the same organization
  const memberEmployee = await MyGlobal.prisma.hrm_platform_employees.findFirst(
    {
      where: {
        hrm_platform_user_id: props.member.id,
        hrm_platform_organization_id: employee.hrm_platform_organization_id,
        deleted_at: null,
      },
    },
  );
  if (memberEmployee === null) {
    throw new HttpException("You are not a member of this organization", 403);
  }
  // Check member's role permissions
  const rolePermissions =
    await MyGlobal.prisma.hrm_platform_role_permissions.findMany({
      where: {
        hrm_platform_role_id: memberEmployee.hrm_platform_role_id,
        deleted_at: null,
      },
      select: {
        hrm_platform_permission_id: true,
        permission: {
          select: {
            code: true,
          },
        },
      },
    });
  const hasPermission = rolePermissions.some(
    (rp) =>
      rp.permission.code === "employee:manage" ||
      rp.permission.code === "org:manage",
  );
  if (!hasPermission) {
    throw new HttpException("Insufficient permissions", 403);
  }
  // Check if employee is sole organization owner
  const ownerRole = await MyGlobal.prisma.hrm_platform_roles.findFirst({
    where: {
      hrm_platform_organization_id: employee.hrm_platform_organization_id,
      code: "owner",
      deleted_at: null,
    },
  });
  if (ownerRole && employee.hrm_platform_role_id === ownerRole.id) {
    // Count other active owners in the organization
    const ownerCount = await MyGlobal.prisma.hrm_platform_employees.count({
      where: {
        hrm_platform_organization_id: employee.hrm_platform_organization_id,
        hrm_platform_role_id: ownerRole.id,
        deleted_at: null,
        id: { not: props.employeeId },
      },
    });
    if (ownerCount === 0) {
      throw new HttpException(
        "Cannot delete sole organization owner. Transfer ownership first.",
        409,
      );
    }
  }
  // Soft delete: set deleted_at and status to 'deactivated'
  await MyGlobal.prisma.hrm_platform_employees.update({
    where: { id: props.employeeId },
    data: {
      deleted_at: new Date(),
      status: "deactivated",
      updated_at: new Date(),
    },
  });
}
