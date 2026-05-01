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

export async function deleteErpHrmMemberContractsContractId(props: {
  member: MemberPayload;
  contractId: string & tags.Format<"uuid">;
}): Promise<void> {
  const session = await MyGlobal.prisma.erp_hrm_member_sessions.findFirst({
    where: {
      id: props.member.session_id,
      erp_hrm_member_id: props.member.id,
    },
    select: {
      id: true,
      erp_hrm_organization_id: true,
    },
  });
  if (session === null || session.erp_hrm_organization_id === null) {
    throw new HttpException("Not Found", 404);
  }
  const organizationId: string = session.erp_hrm_organization_id;
  const contract = await MyGlobal.prisma.erp_hrm_contracts.findFirst({
    where: {
      id: props.contractId,
      deleted_at: null,
    },
    select: {
      id: true,
      erp_hrm_employee_id: true,
      start_date: true,
      end_date: true,
      employee: {
        select: {
          id: true,
          erp_hrm_member_id: true,
          erp_hrm_organization_id: true,
        },
      },
    },
  });
  if (contract === null) {
    throw new HttpException("Not Found", 404);
  }
  if (contract.employee.erp_hrm_organization_id !== organizationId) {
    throw new HttpException("Not Found", 404);
  }
  const supersedingContract = await MyGlobal.prisma.erp_hrm_contracts.findFirst(
    {
      where: {
        erp_hrm_employee_id: contract.erp_hrm_employee_id,
        start_date: { gt: contract.start_date },
        deleted_at: null,
      },
      select: { id: true },
    },
  );
  if (supersedingContract !== null) {
    throw new HttpException(
      "This contract has been superseded by a newer agreement and cannot be deleted.",
      409,
    );
  }
  const nowIso: string = new Date().toISOString();
  if (contract.end_date !== null && contract.end_date.toISOString() < nowIso) {
    throw new HttpException(
      "This contract has expired and cannot be deleted.",
      409,
    );
  }
  await MyGlobal.prisma.erp_hrm_contracts.update({
    where: { id: props.contractId },
    data: {
      deleted_at: nowIso,
      updated_at: nowIso,
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
// export async function deleteErpHrmMemberContractsContractId(props: {
//   member: MemberPayload;
//   contractId: string & tags.Format<"uuid">;
// }): Promise<void> {
//   await MyGlobal.prisma.....delete({
//     where: { ... },
//   });
// }
// ```
//--------------------------------------------------------------