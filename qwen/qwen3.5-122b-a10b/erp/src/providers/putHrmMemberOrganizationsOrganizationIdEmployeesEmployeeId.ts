import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IHrmEmployee } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmEmployee";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { MemberPayload } from "../decorators/payload/MemberPayload";
import { HrmEmployeeTransformer } from "../transformers/HrmEmployeeTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function putHrmMemberOrganizationsOrganizationIdEmployeesEmployeeId(props: {
  member: MemberPayload;
  organizationId: string & tags.Format<"uuid">;
  employeeId: string & tags.Format<"uuid">;
  body: IHrmEmployee.IUpdate;
}): Promise<IHrmEmployee> {
  // 1. Validate organization exists and is not deleted
  const organization = await MyGlobal.prisma.hrm_organizations.findUnique({
    where: { id: props.organizationId },
    select: { id: true, deleted_at: true },
  });
  if (organization === null) {
    throw new HttpException("Organization not found", 404);
  }
  if (organization.deleted_at !== null) {
    throw new HttpException("Organization has been deleted", 410);
  }
  // 2. Validate employee record exists with matching organization_id and employeeId, not soft-deleted
  const employee = await MyGlobal.prisma.hrm_employees.findFirst({
    where: {
      id: props.employeeId,
      organization_id: props.organizationId,
      deleted_at: null,
    },
    select: {
      id: true,
      user_id: true,
      organization_id: true,
      deleted_at: true,
    },
  });
  if (employee === null) {
    throw new HttpException("Employee not found in organization", 404);
  }
  if (employee.deleted_at !== null) {
    throw new HttpException("Employee record has been deleted", 410);
  }
  // 3. Verify user has employee:manage permission for the organization
  // Check if member's role in this organization has employee:manage permission
  const memberEmployee = await MyGlobal.prisma.hrm_employees.findFirst({
    where: {
      user_id: props.member.id,
      organization_id: props.organizationId,
      deleted_at: null,
    },
    select: { role_id: true },
  });
  if (memberEmployee === null) {
    throw new HttpException("You are not a member of this organization", 403);
  }
  // Check if role has employee:manage permission by joining with hrm_permissions
  const hasPermission = await MyGlobal.prisma.hrm_role_permissions.findFirst({
    where: {
      hrm_role_id: memberEmployee.role_id,
      hrmPermission: {
        permission_name: "employee:manage",
      },
    },
  });
  if (hasPermission === null) {
    throw new HttpException("Forbidden", 403);
  }
  // 4. IHrmEmployee.IUpdate is empty, no fields to update on member record
  // The operation validates the employee exists and user has permission
  // Update the updated_at timestamp on the employee record
  await MyGlobal.prisma.hrm_employees.update({
    where: { id: props.employeeId },
    data: {
      updated_at: new Date(),
    },
  });
  // 5. Return the complete updated employee entity (member data)
  const member = await MyGlobal.prisma.hrm_members.findUniqueOrThrow({
    where: { id: employee.user_id },
    ...HrmEmployeeTransformer.select(),
  });
  return await HrmEmployeeTransformer.transform(member);
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
// import { IHrmEmployee } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmEmployee";
// 
// // DON'T CHANGE FUNCTION NAME AND PARAMETERS,
// // ONLY YOU HAVE TO WRITE THIS FUNCTION BODY, AND USE IMPORTED.
// export async function putHrmMemberOrganizationsOrganizationIdEmployeesEmployeeId(props: {
//   member: MemberPayload;
//   organizationId: string & tags.Format<"uuid">;
//   employeeId: string & tags.Format<"uuid">;
//   body: IHrmEmployee.IUpdate;
// }): Promise<IHrmEmployee> {
//   await MyGlobal.prisma.hrm_members.update({
//     where: { ... },
//     data: { ... },
//   });
//   const updated = await MyGlobal.prisma.hrm_members.findUniqueOrThrow({
//     where: { ... },
//     ...HrmEmployeeTransformer.select(),
//   });
//   return await HrmEmployeeTransformer.transform(updated);
// }
// ```
//--------------------------------------------------------------