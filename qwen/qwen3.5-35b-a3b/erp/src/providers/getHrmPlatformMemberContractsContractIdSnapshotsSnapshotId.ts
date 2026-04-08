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
  const session =
    await MyGlobal.prisma.hrm_platform_member_sessions.findFirstOrThrow({
      where: {
        id: props.member.session_id,
        expired_at: { gt: new Date() },
        hrm_platform_member_id: props.member.id,
        member: {
          id: props.member.id,
          is_active: true,
          deleted_at: null,
        },
      },
      select: {
        id: true,
        organization_id: true,
        hrm_platform_member_id: true,
      },
    });
  const contract =
    await MyGlobal.prisma.hrm_platform_contracts.findUniqueOrThrow({
      where: { id: props.contractId },
      select: {
        id: true,
        hrm_platform_employee_id: true,
        hrm_platform_organization_id: true,
        employee: { select: { hrm_platform_member_id: true } },
      },
    });
  if (contract.hrm_platform_organization_id !== session.organization_id) {
    throw new HttpException("Forbidden", 403);
  }
  const employeeMemberId = contract.employee.hrm_platform_member_id;
  const isOwner = employeeMemberId === props.member.id;
  if (!isOwner) {
    throw new HttpException("Forbidden", 403);
  }
  const snapshot =
    await MyGlobal.prisma.hrm_platform_contracts_snapshots.findUniqueOrThrow({
      where: {
        id: props.snapshotId,
        hrm_platform_contract_id: props.contractId,
      },
      ...HrmPlatformContractsSnapshotTransformer.select(),
    });
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