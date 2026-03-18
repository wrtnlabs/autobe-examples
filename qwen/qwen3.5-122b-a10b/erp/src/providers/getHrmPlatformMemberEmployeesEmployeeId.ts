import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IHrmPlatformDepartment } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformDepartment";
import { IHrmPlatformEmployee } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformEmployee";
import { IHrmPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformMember";
import { IHrmPlatformRole } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformRole";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { MemberPayload } from "../decorators/payload/MemberPayload";
import { HrmPlatformEmployeeTransformer } from "../transformers/HrmPlatformEmployeeTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function getHrmPlatformMemberEmployeesEmployeeId(props: {
  member: MemberPayload;
  employeeId: string & tags.Format<"uuid">;
}): Promise<IHrmPlatformEmployee> {
  // Step 1: Find the employee record to get organization context
  const employee = await MyGlobal.prisma.hrm_platform_employees.findUnique({
    where: { id: props.employeeId },
    select: {
      id: true,
      hrm_platform_organization_id: true,
      deleted_at: true,
    },
  });
  if (employee === null) {
    throw new HttpException("Employee not found", 404);
  }
  // Step 2: Verify the requesting member belongs to the same organization
  const memberEmployee = await MyGlobal.prisma.hrm_platform_employees.findFirst(
    {
      where: {
        hrm_platform_user_id: props.member.id,
        hrm_platform_organization_id: employee.hrm_platform_organization_id,
        deleted_at: null,
      },
      select: {
        hrm_platform_role_id: true,
      },
    },
  );
  if (memberEmployee === null) {
    throw new HttpException("Forbidden", 403);
  }
  // Step 3: Check if member's role has employee:view permission
  const role = await MyGlobal.prisma.hrm_platform_roles.findUnique({
    where: { id: memberEmployee.hrm_platform_role_id },
    select: {
      permissions: {
        select: {
          id: true,
        },
      },
    },
  });
  if (role === null) {
    throw new HttpException("Role not found", 500);
  }
  const hasPermission = role.permissions.some(
    (permission) => permission.id === "employee:view",
  );
  if (!hasPermission) {
    throw new HttpException("Forbidden", 403);
  }
  // Step 4: Fetch full employee data with transformer select
  const fullEmployee =
    await MyGlobal.prisma.hrm_platform_employees.findUniqueOrThrow({
      where: { id: props.employeeId },
      ...HrmPlatformEmployeeTransformer.select(),
    });
  // Step 5: Transform to DTO
  return await HrmPlatformEmployeeTransformer.transform(fullEmployee);
}
