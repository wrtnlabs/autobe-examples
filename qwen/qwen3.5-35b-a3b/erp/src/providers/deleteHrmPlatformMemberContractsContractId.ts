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
      where: {
        id: props.contractId,
        deleted_at: null,
      },
      select: {
        id: true,
        hrm_platform_employee_id: true,
        hrm_platform_organization_id: true,
        status: true,
      },
    });
  // Verify member's session organization matches the contract's organization
  const session = await MyGlobal.prisma.hrm_platform_member_sessions.findFirst({
    where: {
      id: props.member.session_id,
    },
    select: {
      organization_id: true,
    },
  });
  if (
    !session ||
    session.organization_id !== contract.hrm_platform_organization_id
  ) {
    throw new HttpException("Forbidden", 403);
  }
  if (contract.status === "active") {
    const remainingContracts =
      await MyGlobal.prisma.hrm_platform_contracts.count({
        where: {
          hrm_platform_employee_id: contract.hrm_platform_employee_id,
          id: { not: props.contractId },
        },
      });
    if (remainingContracts === 0) {
      throw new HttpException(
        "Cannot delete active contract: employee would have no contracts",
        400,
      );
    }
  }
  await MyGlobal.prisma.hrm_platform_contracts.update({
    where: { id: props.contractId },
    data: {
      deleted_at: new Date(),
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