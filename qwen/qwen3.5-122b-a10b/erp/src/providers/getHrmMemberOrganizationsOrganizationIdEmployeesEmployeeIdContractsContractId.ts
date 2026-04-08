import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IHrmContract } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmContract";
import { IHrmDepartment } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmDepartment";
import { IHrmEmployee } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmEmployee";
import { IHrmMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmMember";
import { IHrmOrganization } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmOrganization";
import { IHrmRole } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmRole";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { MemberPayload } from "../decorators/payload/MemberPayload";
import { HrmContractTransformer } from "../transformers/HrmContractTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function getHrmMemberOrganizationsOrganizationIdEmployeesEmployeeIdContractsContractId(props: {
  member: MemberPayload;
  organizationId: string & tags.Format<"uuid">;
  employeeId: string & tags.Format<"uuid">;
  contractId: string & tags.Format<"uuid">;
}): Promise<IHrmContract> {
  // Verify contract exists and belongs to the specified employee
  const contract = await MyGlobal.prisma.hrm_contracts.findFirst({
    where: {
      id: props.contractId,
      hrm_employee_id: props.employeeId,
      deleted_at: null,
    },
    select: {
      id: true,
      hrm_employee_id: true,
      deleted_at: true,
      employee: {
        select: {
          id: true,
          organization_id: true,
          user_id: true,
          deleted_at: true,
        },
      },
    },
  });
  if (contract === null) {
    throw new HttpException("Contract not found", 404);
  }
  // Verify employee belongs to the specified organization
  if (contract.employee.organization_id !== props.organizationId) {
    throw new HttpException("Contract not found in this organization", 404);
  }
  // Verify employee record is active (not soft-deleted)
  if (contract.employee.deleted_at !== null) {
    throw new HttpException("Employee record not found", 404);
  }
  // Authorization check: member can view their own contracts
  // or has employee:view permission in the organization
  const isOwnContract = contract.employee.user_id === props.member.id;
  if (!isOwnContract) {
    // Get member's employee record in this organization
    const memberEmployee = await MyGlobal.prisma.hrm_employees.findFirst({
      where: {
        organization_id: props.organizationId,
        user_id: props.member.id,
        deleted_at: null,
      },
      select: {
        role_id: true,
      },
    });
    if (memberEmployee === null) {
      throw new HttpException("Forbidden", 403);
    }
    // Check if member's role has employee:view permission
    const hasPermission = await MyGlobal.prisma.hrm_role_permissions.findFirst({
      where: {
        hrm_role_id: memberEmployee.role_id,
        hrmPermission: {
          permission_name: "employee:view",
        },
      },
    });
    if (hasPermission === null) {
      throw new HttpException("Forbidden", 403);
    }
  }
  // Fetch full contract with transformer select
  const fullContract = await MyGlobal.prisma.hrm_contracts.findUniqueOrThrow({
    where: { id: props.contractId },
    ...HrmContractTransformer.select(),
  } satisfies Prisma.hrm_contractsFindUniqueArgs);
  return await HrmContractTransformer.transform(fullContract);
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
// import { IHrmContract } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmContract";
// import { IHrmEmployee } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmEmployee";
// import { IHrmMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmMember";
// import { IHrmOrganization } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmOrganization";
// import { IHrmRole } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmRole";
// import { IHrmDepartment } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmDepartment";
// 
// // DON'T CHANGE FUNCTION NAME AND PARAMETERS,
// // ONLY YOU HAVE TO WRITE THIS FUNCTION BODY, AND USE IMPORTED.
// export async function getHrmMemberOrganizationsOrganizationIdEmployeesEmployeeIdContractsContractId(props: {
//   member: MemberPayload;
//   organizationId: string & tags.Format<"uuid">;
//   employeeId: string & tags.Format<"uuid">;
//   contractId: string & tags.Format<"uuid">;
// }): Promise<IHrmContract> {
//   const record = await MyGlobal.prisma.hrm_contracts.findFirstOrThrow({
//     ...HrmContractTransformer.select(),
//     where: { ... },
//   });
//   return await HrmContractTransformer.transform(record);
// }
// ```
//--------------------------------------------------------------