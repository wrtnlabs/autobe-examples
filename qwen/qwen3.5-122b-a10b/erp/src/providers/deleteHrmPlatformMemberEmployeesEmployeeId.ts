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
  // Step 1: Find the employee and verify it exists
  const employee = await MyGlobal.prisma.hrm_platform_employees.findUnique({
    where: { id: props.employeeId },
    select: {
      id: true,
      hrm_platform_organization_id: true,
      hrm_platform_role_id: true,
      deleted_at: true,
      status: true,
    },
  } satisfies Prisma.hrm_platform_employeesFindUniqueArgs);
  if (employee === null) {
    throw new HttpException("Employee not found", 404);
  }
  if (employee.deleted_at !== null) {
    throw new HttpException("Employee already deleted", 404);
  }
  // Step 2: Verify requesting member has an employee record in the same organization
  const userEmployee = await MyGlobal.prisma.hrm_platform_employees.findFirst({
    where: {
      hrm_platform_user_id: props.member.id,
      hrm_platform_organization_id: employee.hrm_platform_organization_id,
      deleted_at: null,
    },
    select: {
      hrm_platform_role_id: true,
    },
  } satisfies Prisma.hrm_platform_employeesFindFirstArgs);
  if (userEmployee === null) {
    throw new HttpException("Forbidden", 403);
  }
  // Step 3: Check if user's role has employee:manage or org:manage permission
  const hasPermission =
    await MyGlobal.prisma.hrm_platform_role_permissions.findFirst({
      where: {
        hrm_platform_role_id: userEmployee.hrm_platform_role_id,
        deleted_at: null,
        permission: {
          code: {
            in: ["employee:manage", "org:manage"],
          },
          deleted_at: null,
        },
      },
      select: {
        id: true,
      },
    } satisfies Prisma.hrm_platform_role_permissionsFindFirstArgs);
  if (hasPermission === null) {
    throw new HttpException("Forbidden", 403);
  }
  // Step 4: Check if employee being deleted is the sole owner
  const employeeRole = await MyGlobal.prisma.hrm_platform_roles.findUnique({
    where: { id: employee.hrm_platform_role_id },
    select: {
      code: true,
    },
  } satisfies Prisma.hrm_platform_rolesFindUniqueArgs);
  if (employeeRole?.code === "owner") {
    const otherOwners = await MyGlobal.prisma.hrm_platform_employees.count({
      where: {
        hrm_platform_organization_id: employee.hrm_platform_organization_id,
        deleted_at: null,
        status: "active",
        role: {
          code: "owner",
        },
        id: {
          not: props.employeeId,
        },
      },
    } satisfies Prisma.hrm_platform_employeesCountArgs);
    if (otherOwners === 0) {
      throw new HttpException("Cannot delete the sole organization owner", 409);
    }
  }
  // Step 5: Perform soft delete
  await MyGlobal.prisma.hrm_platform_employees.update({
    where: { id: props.employeeId },
    data: {
      deleted_at: new Date(),
      status: "deactivated",
    },
  } satisfies Prisma.hrm_platform_employeesUpdateArgs);
}
