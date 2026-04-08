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

export async function deleteHrmMemberOrganizationsOrganizationIdEmployeesEmployeeId(props: {
  member: MemberPayload;
  organizationId: string & tags.Format<"uuid">;
  employeeId: string & tags.Format<"uuid">;
}): Promise<void> {
  // 1. Verify organization exists and is not deleted
  const organization = await MyGlobal.prisma.hrm_organizations.findUnique({
    where: { id: props.organizationId },
    select: { id: true, deleted_at: true },
  });
  if (organization === null || organization.deleted_at !== null) {
    throw new HttpException("Organization not found", 404);
  }
  // 2. Find employee by id and organization_id
  const employee = await MyGlobal.prisma.hrm_employees.findFirst({
    where: {
      id: props.employeeId,
      organization_id: props.organizationId,
    },
    select: {
      id: true,
      deleted_at: true,
      user_id: true,
      role_id: true,
    },
  });
  if (employee === null) {
    throw new HttpException("Employee not found", 404);
  }
  // 3. Check employee is not already deleted
  if (employee.deleted_at !== null) {
    throw new HttpException("Employee not found", 404);
  }
  // 4. Verify member has org:manage permission
  // Get the employee record for this member in this organization
  const memberEmployee = await MyGlobal.prisma.hrm_employees.findFirst({
    where: {
      organization_id: props.organizationId,
      user_id: props.member.id,
      deleted_at: null,
    },
    select: {
      id: true,
      role_id: true,
    },
  });
  if (memberEmployee === null || memberEmployee.role_id === null) {
    throw new HttpException("Forbidden", 403);
  }
  // Get role permissions
  const rolePermissions = await MyGlobal.prisma.hrm_role_permissions.findMany({
    where: {
      hrm_role_id: memberEmployee.role_id,
    },
    select: {
      hrm_permission_id: true,
    },
  });
  const permissionIds = rolePermissions.map((rp) => rp.hrm_permission_id);
  const permissions = await MyGlobal.prisma.hrm_permissions.findMany({
    where: {
      id: { in: permissionIds },
    },
    select: {
      id: true,
      permission_name: true,
    },
  });
  const hasPermission = permissions.some(
    (p) => p.permission_name === "org:manage",
  );
  if (!hasPermission) {
    throw new HttpException("Forbidden", 403);
  }
  // 5. Check for active contracts
  const activeContracts = await MyGlobal.prisma.hrm_contracts.findMany({
    where: {
      hrm_employee_id: props.employeeId,
      end_date: null,
      deleted_at: null,
    },
    select: { id: true },
  });
  if (activeContracts.length > 0) {
    throw new HttpException("Cannot delete employee with active contract", 409);
  }
  // 6. Perform soft delete
  await MyGlobal.prisma.hrm_employees.update({
    where: { id: props.employeeId },
    data: {
      deleted_at: new Date(),
    },
  });
  // 7. Create activity log entry
  const now = new Date();
  await MyGlobal.prisma.hrm_activity_logs.create({
    data: {
      id: v4(),
      hrm_members_id: props.member.id,
      timestamp: now,
      action_type: "employee_deactivated",
      target_entity_type: "Employee",
      target_entity_id: props.employeeId,
      details: JSON.stringify({
        organization_id: props.organizationId,
        employee_id: props.employeeId,
      }),
      created_at: now,
      updated_at: now,
      deleted_at: null,
    },
  });
}


//--------------------------------------------------------------
// TEMPLATE CODE
//--------------------------------------------------------------
// Complete the code below, disregard the import part and return only the function part.
// 
// ```typescript
// import { ArrayUtil } from "@nestia/e2e";
// import { HttpException } from "@nestjs/common";
// import { Prisma } from "@prisma/sdk";
// import jwt from "jsonwebtoken";
// import typia, { tags } from "typia";
// import { v4 } from "uuid";
// import { MyGlobal } from "../MyGlobal";
// import { PasswordUtil } from "../utils/PasswordUtil";
// import { toISOStringSafe } from "../utils/toISOStringSafe"
// 
// import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
// 
// // DON'T CHANGE FUNCTION NAME AND PARAMETERS,
// // ONLY YOU HAVE TO WRITE THIS FUNCTION BODY, AND USE IMPORTED.
// export async function deleteHrmMemberOrganizationsOrganizationIdEmployeesEmployeeId(props: {
//   member: MemberPayload;
//   organizationId: string & tags.Format<"uuid">;
//   employeeId: string & tags.Format<"uuid">;
// }): Promise<void> {
//   await MyGlobal.prisma.....delete({
//     where: { ... },
//   });
// }
// ```
//--------------------------------------------------------------