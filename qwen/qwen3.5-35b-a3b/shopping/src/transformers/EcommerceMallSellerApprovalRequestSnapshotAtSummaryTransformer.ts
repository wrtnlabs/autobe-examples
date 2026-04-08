import { IEcommerceMallAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallAdministrator";
import { IEcommerceMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSeller";
import { IEcommerceMallSellerApprovalRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSellerApprovalRequest";
import { IEcommerceMallSellerApprovalRequestSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSellerApprovalRequestSnapshot";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { Prisma } from "@prisma/sdk";
import { VariadicSingleton } from "tstl";
import typia, { tags } from "typia";

import { MyGlobal } from "../MyGlobal";
import { toISOStringSafe } from "../utils/toISOStringSafe";
import { EcommerceMallAdministratorAtSummaryTransformer } from "./EcommerceMallAdministratorAtSummaryTransformer";
import { EcommerceMallSellerApprovalRequestAtSummaryTransformer } from "./EcommerceMallSellerApprovalRequestAtSummaryTransformer";

export namespace EcommerceMallSellerApprovalRequestSnapshotAtSummaryTransformer {
  export type Payload =
    Prisma.ecommerce_mall_seller_approval_request_snapshotsGetPayload<
      ReturnType<typeof select>
    >;
  export function select() {
    return {
      select: {
        id: true,
        status: true,
        rejection_reason: true,
        approved_at: true,
        rejected_at: true,
        snapshot_time: true,
        created_at: true,
        updated_at: true,
        approvalRequest:
          EcommerceMallSellerApprovalRequestAtSummaryTransformer.select(),
        approverAdministrator:
          EcommerceMallAdministratorAtSummaryTransformer.select(),
      },
    } satisfies Prisma.ecommerce_mall_seller_approval_request_snapshotsFindManyArgs;
  }
  export async function transform(
    input: Payload,
  ): Promise<IEcommerceMallSellerApprovalRequestSnapshot.ISummary> {
    return {
      id: input.id,
      status: input.status,
      snapshotTime: input.snapshot_time.toISOString(),
      approvalRequest:
        await EcommerceMallSellerApprovalRequestAtSummaryTransformer.transform(
          input.approvalRequest,
        ),
      approvedByAdministrator: input.approverAdministrator
        ? await EcommerceMallAdministratorAtSummaryTransformer.transform(
            input.approverAdministrator,
          )
        : null,
    } satisfies IEcommerceMallSellerApprovalRequestSnapshot.ISummary;
  }
}


//--------------------------------------------------------------
// TEMPLATE CODE
//--------------------------------------------------------------
//     export namespace EcommerceMallSellerApprovalRequestSnapshotAtSummaryTransformer {
//       export type Payload = Prisma.ecommerce_mall_seller_approval_request_snapshotsGetPayload<ReturnType<typeof select>>;
// 
//       export function select() {
//         // implicit return type for better type inference
//         return {
//           select: {
//             id: true,
//             status: true,
//             rejection_reason: true,
//             approved_at: true,
//             rejected_at: true,
//             snapshot_time: true,
//             created_at: true,
//             updated_at: true,
//             approvalRequest: EcommerceMallSellerApprovalRequestAtSummaryTransformer.select(),
//             approverAdministrator: EcommerceMallAdministratorAtSummaryTransformer.select(),
//           },
//         } satisfies Prisma.ecommerce_mall_seller_approval_request_snapshotsFindManyArgs;
//       }
// 
//       export async function transform(input: Payload): Promise<IEcommerceMallSellerApprovalRequestSnapshot.ISummary> {
//         return {
//   id: {string},
//   status: {string},
//   snapshotTime: {string},
//   approvalRequest: await EcommerceMallSellerApprovalRequestAtSummaryTransformer.transform(input.approvalRequest),
//   approvedByAdministrator: input.approverAdministrator ? await EcommerceMallAdministratorAtSummaryTransformer.transform(input.approverAdministrator) : null,
//         };
//       }
//     }
//--------------------------------------------------------------