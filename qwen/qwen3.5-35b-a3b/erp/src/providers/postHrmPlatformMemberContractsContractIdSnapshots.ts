import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IHrmPlatformContractsSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformContractsSnapshot";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { HrmPlatformContractsSnapshotCollector } from "../collectors/HrmPlatformContractsSnapshotCollector";
import { MemberPayload } from "../decorators/payload/MemberPayload";
import { HrmPlatformContractsSnapshotTransformer } from "../transformers/HrmPlatformContractsSnapshotTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function postHrmPlatformMemberContractsContractIdSnapshots(props: {
  member: MemberPayload;
  contractId: string & tags.Format<"uuid">;
  body: IHrmPlatformContractsSnapshot.ICreate;
}): Promise<IHrmPlatformContractsSnapshot> {
  const contract =
    await MyGlobal.prisma.hrm_platform_contracts.findUniqueOrThrow({
      where: { id: props.contractId },
      select: {
        id: true,
        start_date: true,
        end_date: true,
        compensation_amount: true,
        compensation_currency: true,
        notes: true,
        hrm_platform_employee_id: true,
        created_at: true,
        updated_at: true,
        hrm_platform_organization_id: true,
        employee: {
          select: {
            id: true,
            role: {
              include: {
                permissions: true,
              },
            },
          },
        },
      },
    });
  const hasPermission = contract.employee.role.permissions.some(
    (permission: any) => permission.code === "employee:manage",
  );
  if (!hasPermission) {
    throw new HttpException("Forbidden", 403);
  }
  const snapshot =
    await MyGlobal.prisma.hrm_platform_contracts_snapshots.create({
      data: await HrmPlatformContractsSnapshotCollector.collect({
        body: props.body,
        hrmPlatformContracts: {
          id: contract.id,
        },
      }),
      ...HrmPlatformContractsSnapshotTransformer.select(),
    });
  await MyGlobal.prisma.hrm_platform_activity_logs.create({
    data: {
      id: v4(),
      entity_type: "contract",
      entity_id: contract.id,
      action_type: "snapshot",
      action_name: "contract_snapshot_created",
      member_id: props.member.id,
      organization_id: contract.hrm_platform_organization_id,
      created_at: new Date(),
      updated_at: new Date(),
    },
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
// export async function postHrmPlatformMemberContractsContractIdSnapshots(props: {
//   member: MemberPayload;
//   contractId: string & tags.Format<"uuid">;
//   body: IHrmPlatformContractsSnapshot.ICreate;
// }): Promise<IHrmPlatformContractsSnapshot> {
//   const record = await MyGlobal.prisma.hrm_platform_contracts_snapshots.create({
//     data: await HrmPlatformContractsSnapshotCollector.collect({
//       body: props.body,
//       ...
//     }),
//     ...HrmPlatformContractsSnapshotTransformer.select(),
//   });
//   return await HrmPlatformContractsSnapshotTransformer.transform(record);
// }
// ```
//--------------------------------------------------------------