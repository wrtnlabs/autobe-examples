import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IHrmPlatformContractsSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformContractsSnapshot";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { MemberPayload } from "../decorators/payload/MemberPayload";
import { HrmPlatformContractsSnapshotTransformer } from "../transformers/HrmPlatformContractsSnapshotTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function getHrmPlatformMemberContractsContractIdSnapshotsSnapshotId(props: {
  member: MemberPayload;
  contractId: string & tags.Format<"uuid">;
  snapshotId: string & tags.Format<"uuid">;
}): Promise<IHrmPlatformContractsSnapshot> {
  const snapshot =
    await MyGlobal.prisma.hrm_platform_contracts_snapshots.findFirstOrThrow({
      ...HrmPlatformContractsSnapshotTransformer.select(),
      where: {
        id: props.snapshotId,
        hrm_platform_contract_id: props.contractId,
      },
    });
  const contract =
    await MyGlobal.prisma.hrm_platform_contracts.findUniqueOrThrow({
      where: { id: props.contractId },
      select: {
        employee: { select: { id: true, hrm_platform_organization_id: true } },
      },
    });
  const memberEmployee = await MyGlobal.prisma.hrm_platform_employees.findFirst(
    {
      where: {
        hrm_platform_member_id: props.member.id,
        hrm_platform_organization_id:
          contract.employee.hrm_platform_organization_id,
        deleted_at: null,
      },
    },
  );
  const hasEmployeePermission = memberEmployee !== null;
  if (!hasEmployeePermission) {
    const memberPermission =
      await MyGlobal.prisma.hrm_platform_member_sessions.findFirst({
        where: {
          hrm_platform_member_id: props.member.id,
          organization: {
            id: contract.employee.hrm_platform_organization_id,
          },
        },
      });
    if (memberPermission === null) {
      throw new HttpException("Forbidden", 403);
    }
  }
  return await HrmPlatformContractsSnapshotTransformer.transform(snapshot);
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
// import { IHrmPlatformContractsSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformContractsSnapshot";
// 
// // DON'T CHANGE FUNCTION NAME AND PARAMETERS,
// // ONLY YOU HAVE TO WRITE THIS FUNCTION BODY, AND USE IMPORTED.
// export async function getHrmPlatformMemberContractsContractIdSnapshotsSnapshotId(props: {
//   member: MemberPayload;
//   contractId: string & tags.Format<"uuid">;
//   snapshotId: string & tags.Format<"uuid">;
// }): Promise<IHrmPlatformContractsSnapshot> {
//   const record = await MyGlobal.prisma.hrm_platform_contracts_snapshots.findFirstOrThrow({
//     ...HrmPlatformContractsSnapshotTransformer.select(),
//     where: { ... },
//   });
//   return await HrmPlatformContractsSnapshotTransformer.transform(record);
// }
// ```
//--------------------------------------------------------------