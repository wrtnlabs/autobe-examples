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

export async function deleteHrmMemberEmployeesEmployeeIdContractsContractId(props: {
  member: MemberPayload;
  employeeId: string & tags.Format<"uuid">;
  contractId: string & tags.Format<"uuid">;
}): Promise<void> {
  const contract = await MyGlobal.prisma.hrm_contracts.findUnique({
    where: { id: props.contractId },
    select: {
      id: true,
      hrm_employee_id: true,
      end_date: true,
      deleted_at: true,
    },
  });
  if (contract === null) {
    throw new HttpException("Contract not found", 404);
  }
  if (contract.deleted_at !== null) {
    throw new HttpException("Contract already deleted", 404);
  }
  if (contract.hrm_employee_id !== props.employeeId) {
    throw new HttpException(
      "Contract does not belong to specified employee",
      404,
    );
  }
  if (contract.end_date === null) {
    throw new HttpException(
      "Cannot delete an active contract. End the contract first by setting an end_date.",
      409,
    );
  }
  const now = toISOStringSafe(new Date());
  await MyGlobal.prisma.hrm_contracts.update({
    where: { id: props.contractId },
    data: { deleted_at: now },
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
// export async function deleteHrmMemberEmployeesEmployeeIdContractsContractId(props: {
//   member: MemberPayload;
//   employeeId: string & tags.Format<"uuid">;
//   contractId: string & tags.Format<"uuid">;
// }): Promise<void> {
//   await MyGlobal.prisma.....delete({
//     where: { ... },
//   });
// }
// ```
//--------------------------------------------------------------