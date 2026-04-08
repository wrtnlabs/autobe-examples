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

export async function deleteHrmPlatformMemberContractsContractId(props: {
  member: MemberPayload;
  contractId: string & tags.Format<"uuid">;
}): Promise<void> {
  const contract =
    await MyGlobal.prisma.hrm_platform_contracts.findUniqueOrThrow({
      where: { id: props.contractId },
      select: {
        id: true,
        deleted_at: true,
        status: true,
        hrm_platform_employee_id: true,
        employee: {
          select: {
            hrm_platform_organization_id: true,
            hrm_platform_member_id: true,
            contracts: {
              select: {
                id: true,
                status: true,
              },
            },
          },
        },
        hrm_platform_organization_id: true,
      },
    });
  if (contract.deleted_at !== null) {
    throw new HttpException("Contract is already deleted", 400);
  }
  const session = await MyGlobal.prisma.hrm_platform_member_sessions.findFirst({
    where: {
      id: props.member.session_id,
      expired_at: { gt: new Date() },
      hrm_platform_member_id: props.member.id,
      member: {
        id: props.member.id,
        is_active: true,
        deleted_at: null,
      },
    } satisfies Prisma.hrm_platform_member_sessionsWhereInput,
  });
  if (session === null) {
    throw new HttpException("Forbidden", 403);
  }
  if (contract.status === "active") {
    const otherActiveContracts = contract.employee.contracts.filter(
      (c) => c.id !== props.contractId && c.status === "active",
    );
    if (otherActiveContracts.length === 0) {
      throw new HttpException(
        "Cannot delete the last active contract for this employee",
        400,
      );
    }
  }
  await MyGlobal.prisma.hrm_platform_contracts.update({
    where: { id: props.contractId },
    data: {
      deleted_at: new Date(),
    } satisfies Prisma.hrm_platform_contractsUpdateInput,
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
// export async function deleteHrmPlatformMemberContractsContractId(props: {
//   member: MemberPayload;
//   contractId: string & tags.Format<"uuid">;
// }): Promise<void> {
//   await MyGlobal.prisma.....delete({
//     where: { ... },
//   });
// }
// ```
//--------------------------------------------------------------