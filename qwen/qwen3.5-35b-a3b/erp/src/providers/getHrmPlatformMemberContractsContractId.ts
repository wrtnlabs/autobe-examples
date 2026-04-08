import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IHrmPlatformContract } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformContract";
import { IHrmPlatformDepartment } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformDepartment";
import { IHrmPlatformEmployee } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformEmployee";
import { IHrmPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformMember";
import { IHrmPlatformOrganization } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformOrganization";
import { IHrmPlatformRole } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformRole";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { MemberPayload } from "../decorators/payload/MemberPayload";
import { HrmPlatformContractTransformer } from "../transformers/HrmPlatformContractTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function getHrmPlatformMemberContractsContractId(props: {
  member: MemberPayload;
  contractId: string & tags.Format<"uuid">;
}): Promise<IHrmPlatformContract> {
  const contract =
    await MyGlobal.prisma.hrm_platform_contracts.findUniqueOrThrow({
      ...HrmPlatformContractTransformer.select(),
      where: {
        id: props.contractId,
        deleted_at: null,
      },
    });
  const employee = contract.employee;
  const isOwnContract = employee.member.id === props.member.id;
  if (isOwnContract) {
    return await HrmPlatformContractTransformer.transform(contract);
  }
  // User is accessing another employee's contract
  // Need to verify they have employee:view permission for this organization
  // Find the user's employee record in this organization
  const userEmployee = await MyGlobal.prisma.hrm_platform_employees.findFirst({
    where: {
      member: {
        id: props.member.id,
      },
      hrm_platform_organization_id: contract.organization.id,
    },
    include: {
      role: {
        include: {
          permissions: {
            where: {
              deleted_at: null,
              organization_id: contract.organization.id,
            },
            select: {
              id: true,
              code: true,
            },
          },
        },
      },
    },
  });
  if (!userEmployee) {
    throw new HttpException("Forbidden", 403);
  }
  // Check if any of the user's roles has employee:view permission
  const hasPermission = userEmployee.role.permissions.some(
    (permission) => permission.code === "employee:view",
  );
  if (!hasPermission) {
    throw new HttpException("Forbidden", 403);
  }
  return await HrmPlatformContractTransformer.transform(contract);
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
// import { IHrmPlatformContract } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformContract";
// import { IHrmPlatformEmployee } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformEmployee";
// import { IHrmPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformMember";
// import { IHrmPlatformRole } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformRole";
// import { IHrmPlatformOrganization } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformOrganization";
// import { IHrmPlatformDepartment } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformDepartment";
// 
// // DON'T CHANGE FUNCTION NAME AND PARAMETERS,
// // ONLY YOU HAVE TO WRITE THIS FUNCTION BODY, AND USE IMPORTED.
// export async function getHrmPlatformMemberContractsContractId(props: {
//   member: MemberPayload;
//   contractId: string & tags.Format<"uuid">;
// }): Promise<IHrmPlatformContract> {
//   const record = await MyGlobal.prisma.hrm_platform_contracts.findFirstOrThrow({
//     ...HrmPlatformContractTransformer.select(),
//     where: { ... },
//   });
//   return await HrmPlatformContractTransformer.transform(record);
// }
// ```
//--------------------------------------------------------------