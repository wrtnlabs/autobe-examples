import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IHrmContractSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmContractSnapshot";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { MemberPayload } from "../decorators/payload/MemberPayload";
import { HrmContractSnapshotTransformer } from "../transformers/HrmContractSnapshotTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function getHrmMemberEmployeesEmployeeIdContractsContractIdSnapshotsSnapshotId(props: {
  member: MemberPayload;
  employeeId: string & tags.Format<"uuid">;
  contractId: string & tags.Format<"uuid">;
  snapshotId: string & tags.Format<"uuid">;
}): Promise<IHrmContractSnapshot> {
  // Verify employee exists and get organization context
  const employee = await MyGlobal.prisma.hrm_employees.findFirstOrThrow({
    where: {
      id: props.employeeId,
      deleted_at: null,
    },
    select: {
      id: true,
      organization_id: true,
    },
  });
  // Check if member belongs to the same organization
  const memberEmployee = await MyGlobal.prisma.hrm_employees.findFirst({
    where: {
      organization_id: employee.organization_id,
      user: { id: props.member.id },
      deleted_at: null,
    },
  });
  if (memberEmployee === null) {
    throw new HttpException("Forbidden", 403);
  }
  // Verify contract exists and belongs to employee
  await MyGlobal.prisma.hrm_contracts.findFirstOrThrow({
    where: {
      id: props.contractId,
      hrm_employee_id: props.employeeId,
    },
    select: {
      id: true,
    },
  });
  // Query snapshot with transformer select and transform
  const snapshot =
    await MyGlobal.prisma.hrm_contract_snapshots.findFirstOrThrow({
      where: {
        id: props.snapshotId,
        hrm_contract_id: props.contractId,
      },
      ...HrmContractSnapshotTransformer.select(),
    });
  return await HrmContractSnapshotTransformer.transform(snapshot);
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
// import { IHrmContractSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmContractSnapshot";
// 
// // DON'T CHANGE FUNCTION NAME AND PARAMETERS,
// // ONLY YOU HAVE TO WRITE THIS FUNCTION BODY, AND USE IMPORTED.
// export async function getHrmMemberEmployeesEmployeeIdContractsContractIdSnapshotsSnapshotId(props: {
//   member: MemberPayload;
//   employeeId: string & tags.Format<"uuid">;
//   contractId: string & tags.Format<"uuid">;
//   snapshotId: string & tags.Format<"uuid">;
// }): Promise<IHrmContractSnapshot> {
//   const record = await MyGlobal.prisma.hrm_contract_snapshots.findFirstOrThrow({
//     ...HrmContractSnapshotTransformer.select(),
//     where: { ... },
//   });
//   return await HrmContractSnapshotTransformer.transform(record);
// }
// ```
//--------------------------------------------------------------