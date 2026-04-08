import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IMallPlatformAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformAdministrator";
import { IMallPlatformAdministratorApprovalRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformAdministratorApprovalRequest";
import { IMallPlatformAdministratorApprovalRequestSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformAdministratorApprovalRequestSnapshot";
import { ArrayUtil } from "@nestia/e2e";
import { Prisma } from "@prisma/sdk";
import { VariadicSingleton } from "tstl";
import typia, { tags } from "typia";

import { MyGlobal } from "../MyGlobal";
import { toISOStringSafe } from "../utils/toISOStringSafe";
import { MallPlatformAdministratorApprovalRequestAtSummaryTransformer } from "./MallPlatformAdministratorApprovalRequestAtSummaryTransformer";

export namespace MallPlatformAdministratorApprovalRequestSnapshotTransformer {
  export type Payload =
    Prisma.mall_platform_administrator_approval_request_snapshotsGetPayload<
      ReturnType<typeof select>
    >;
  export function select() {
    return {
      select: {
        id: true,
        snapshot_reason: true,
        created_at: true,
        administratorApprovalRequest:
          MallPlatformAdministratorApprovalRequestAtSummaryTransformer.select(),
      },
    } satisfies Prisma.mall_platform_administrator_approval_request_snapshotsFindManyArgs;
  }
  export async function transform(
    input: Payload,
  ): Promise<IMallPlatformAdministratorApprovalRequestSnapshot> {
    return {
      id: input.id,
      administratorApprovalRequest:
        await MallPlatformAdministratorApprovalRequestAtSummaryTransformer.transform(
          input.administratorApprovalRequest,
        ),
      snapshotReason: input.snapshot_reason,
      createdAt: input.created_at.toISOString(),
    } satisfies IMallPlatformAdministratorApprovalRequestSnapshot;
  }
}


//--------------------------------------------------------------
// TEMPLATE CODE
//--------------------------------------------------------------
//     export namespace MallPlatformAdministratorApprovalRequestSnapshotTransformer {
//       export type Payload = Prisma.mall_platform_administrator_approval_request_snapshotsGetPayload<ReturnType<typeof select>>;
// 
//       export function select() {
//         // implicit return type for better type inference
//         return {
//           select: {
//             id: true,
//             snapshot_reason: true,
//             created_at: true,
//             administratorApprovalRequest: MallPlatformAdministratorApprovalRequestAtSummaryTransformer.select(),
//           },
//         } satisfies Prisma.mall_platform_administrator_approval_request_snapshotsFindManyArgs;
//       }
// 
//       export async function transform(input: Payload): Promise<IMallPlatformAdministratorApprovalRequestSnapshot> {
//         return {
//   id: {string},
//   administratorApprovalRequest: await MallPlatformAdministratorApprovalRequestAtSummaryTransformer.transform(input.administratorApprovalRequest),
//   snapshotReason: {string},
//   createdAt: {string},
//         };
//       }
//     }
//--------------------------------------------------------------