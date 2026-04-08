import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { AdminPayload } from "../decorators/payload/AdminPayload";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function deleteErpHrmAdminEmployeesEmployeeIdContractsContractId(props: {
  admin: {
    id: string & tags.Format<"uuid">;
    session_id: string & tags.Format<"uuid">;
    type: "admin";
  };
  employeeId: string & tags.Format<"uuid">;
  contractId: string & tags.Format<"uuid">;
}): Promise<void> {
  // Validate employee exists and is not deleted
  await MyGlobal.prisma.erp_hrm_employees.findFirstOrThrow({
    where: {
      id: props.employeeId,
      deleted_at: null,
    },
    select: {
      id: true,
      status: true,
    },
  });
  // Validate contract exists and belongs to the employee
  const contract = await MyGlobal.prisma.erp_hrm_contracts.findFirstOrThrow({
    where: {
      id: props.contractId,
      erp_hrm_employee_id: props.employeeId,
    },
    select: {
      id: true,
      end_date: true,
    },
  });
  // Historical contracts (end_date in the past) are immutable - cannot be deleted
  if (contract.end_date !== null) {
    const now = new Date();
    if (contract.end_date < now) {
      throw new HttpException(
        "Cannot delete historical contract. Contracts with end_date in the past are immutable.",
        400,
      );
    }
  }
  // Delete the contract (cascade handles related records if any)
  await MyGlobal.prisma.erp_hrm_contracts.delete({
    where: {
      id: props.contractId,
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
// export async function deleteErpHrmAdminEmployeesEmployeeIdContractsContractId(props: {
//   admin: AdminPayload;
//   employeeId: string & tags.Format<"uuid">;
//   contractId: string & tags.Format<"uuid">;
// }): Promise<void> {
//   await MyGlobal.prisma.....delete({
//     where: { ... },
//   });
// }
// ```
//--------------------------------------------------------------