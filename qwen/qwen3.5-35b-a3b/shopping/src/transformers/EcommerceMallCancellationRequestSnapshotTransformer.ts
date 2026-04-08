import { IEcommerceMallCancellationRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCancellationRequest";
import { IEcommerceMallCancellationRequestSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCancellationRequestSnapshot";
import { IEcommerceMallCustomerAddress } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCustomerAddress";
import { IEcommerceMallMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallMember";
import { IEcommerceMallOrder } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallOrder";
import { IEcommerceMallOrderItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallOrderItem";
import { IEcommerceMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSeller";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { Prisma } from "@prisma/sdk";
import { VariadicSingleton } from "tstl";
import typia, { tags } from "typia";

import { MyGlobal } from "../MyGlobal";
import { toISOStringSafe } from "../utils/toISOStringSafe";
import { EcommerceMallCancellationRequestAtSummaryTransformer } from "./EcommerceMallCancellationRequestAtSummaryTransformer";

export namespace EcommerceMallCancellationRequestSnapshotTransformer {
  export type Payload =
    Prisma.ecommerce_mall_cancellation_request_snapshotsGetPayload<
      ReturnType<typeof select>
    >;
  export function select() {
    return {
      select: {
        id: true,
        title: true,
        body: true,
        actor_type: true,
        created_at: true,
        approved_at: true,
        rejected_at: true,
        seller_rejection_reason: true,
        created_by: true,
        deleted_at: true,
        cancellationRequest:
          EcommerceMallCancellationRequestAtSummaryTransformer.select(),
      },
    } satisfies Prisma.ecommerce_mall_cancellation_request_snapshotsFindManyArgs;
  }
  export async function transform(
    input: Payload,
  ): Promise<IEcommerceMallCancellationRequestSnapshot> {
    return {
      id: input.id,
      cancellationRequest:
        await EcommerceMallCancellationRequestAtSummaryTransformer.transform(
          input.cancellationRequest,
        ),
      title: input.title,
      body: input.body,
      actorType: input.actor_type,
      createdAt: input.created_at.toISOString(),
      approvedAt: input.approved_at?.toISOString() ?? null,
      rejectedAt: input.rejected_at?.toISOString() ?? null,
      sellerRejectionReason: input.seller_rejection_reason ?? null,
      createdBy: input.created_by,
      deletedAt: input.deleted_at?.toISOString() ?? null,
    } satisfies IEcommerceMallCancellationRequestSnapshot;
  }
}


//--------------------------------------------------------------
// TEMPLATE CODE
//--------------------------------------------------------------
//     export namespace EcommerceMallCancellationRequestSnapshotTransformer {
//       export type Payload = Prisma.ecommerce_mall_cancellation_request_snapshotsGetPayload<ReturnType<typeof select>>;
// 
//       export function select() {
//         // implicit return type for better type inference
//         return {
//           select: {
//             id: true,
//             title: true,
//             body: true,
//             actor_type: true,
//             created_at: true,
//             approved_at: true,
//             rejected_at: true,
//             seller_rejection_reason: true,
//             created_by: true,
//             deleted_at: true,
//             cancellationRequest: EcommerceMallCancellationRequestAtSummaryTransformer.select(),
//           },
//         } satisfies Prisma.ecommerce_mall_cancellation_request_snapshotsFindManyArgs;
//       }
// 
//       export async function transform(input: Payload): Promise<IEcommerceMallCancellationRequestSnapshot> {
//         return {
//   id: {string},
//   cancellationRequest: await EcommerceMallCancellationRequestAtSummaryTransformer.transform(input.cancellationRequest),
//   title: {string},
//   body: {string},
//   actorType: {string},
//   createdAt: {string},
//   approvedAt: {string | null},
//   rejectedAt: {string | null},
//   sellerRejectionReason: {string | null},
//   createdBy: {string},
//   deletedAt: {string | null},
//         };
//       }
//     }
//--------------------------------------------------------------