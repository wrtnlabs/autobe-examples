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

export namespace EcommerceMallSellerApprovalRequestSnapshotTransformer {
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
  ): Promise<IEcommerceMallSellerApprovalRequestSnapshot> {
    return {
      id: input.id,
      approvalRequest:
        await EcommerceMallSellerApprovalRequestAtSummaryTransformer.transform(
          input.approvalRequest,
        ),
      approverAdministrator: input.approverAdministrator
        ? await EcommerceMallAdministratorAtSummaryTransformer.transform(
            input.approverAdministrator,
          )
        : null,
      status: input.status,
      rejectionReason: input.rejection_reason ?? undefined,
      approvedAt: input.approved_at?.toISOString() ?? null,
      rejectedAt: input.rejected_at?.toISOString() ?? null,
      snapshotTime: input.snapshot_time.toISOString(),
      createdAt: input.created_at.toISOString(),
      updatedAt: input.updated_at.toISOString(),
    } satisfies IEcommerceMallSellerApprovalRequestSnapshot;
  }
}


//--------------------------------------------------------------
// TEMPLATE CODE
//--------------------------------------------------------------
//     export namespace EcommerceMallSellerApprovalRequestSnapshotTransformer {
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
//       export async function transform(input: Payload): Promise<IEcommerceMallSellerApprovalRequestSnapshot> {
//         return {
//   id: {string},
//   approvalRequest: await EcommerceMallSellerApprovalRequestAtSummaryTransformer.transform(input.approvalRequest),
//   approverAdministrator: input.approverAdministrator ? await EcommerceMallAdministratorAtSummaryTransformer.transform(input.approverAdministrator) : null,
//   status: {string},
//   rejectionReason: {string | null},
//   approvedAt: {string | null},
//   rejectedAt: {string | null},
//   snapshotTime: {string},
//   createdAt: {string},
//   updatedAt: {string},
//         };
//       }
//     }
//--------------------------------------------------------------