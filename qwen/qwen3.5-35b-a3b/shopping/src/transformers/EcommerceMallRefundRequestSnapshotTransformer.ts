import { IEcommerceMallOrderItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallOrderItem";
import { IEcommerceMallRefundRequestSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallRefundRequestSnapshot";
import { IEcommerceMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSeller";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { Prisma } from "@prisma/sdk";
import { VariadicSingleton } from "tstl";
import typia, { tags } from "typia";

import { MyGlobal } from "../MyGlobal";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export namespace EcommerceMallRefundRequestSnapshotTransformer {
  export type Payload =
    Prisma.ecommerce_mall_refund_request_snapshotsGetPayload<
      ReturnType<typeof select>
    >;
  export function select() {
    return {
      select: {
        id: true,
        order_item_id: true,
        status: true,
        reason: true,
        created_at: true,
        responded_at: true,
        approved_by_seller_id: true,
        rejection_reason: true,
        snapshot_at: true,
        deleted_at: true,
        refundRequest: { select: { id: true } },
      },
    } satisfies Prisma.ecommerce_mall_refund_request_snapshotsFindManyArgs;
  }
  export async function transform(
    input: Payload,
  ): Promise<IEcommerceMallRefundRequestSnapshot> {
    return {
      id: input.id,
      refund_request_id: input.refundRequest.id ?? null,
      order_item_id: input.order_item_id,
      status: input.status,
      reason: input.reason,
      created_at: toISOStringSafe(input.created_at),
      responded_at:
        input.responded_at !== null
          ? toISOStringSafe(input.responded_at)
          : null,
      approved_by_seller_id: input.approved_by_seller_id ?? null,
      rejection_reason: input.rejection_reason ?? null,
      snapshot_at: toISOStringSafe(input.snapshot_at),
      deleted_at:
        input.deleted_at !== null ? toISOStringSafe(input.deleted_at) : null,
      order_item: null,
      approved_by_seller: null,
      rejected_by_seller: null,
    } satisfies IEcommerceMallRefundRequestSnapshot;
  }
}


//--------------------------------------------------------------
// TEMPLATE CODE
//--------------------------------------------------------------
//     export namespace EcommerceMallRefundRequestSnapshotTransformer {
//       export type Payload = Prisma.ecommerce_mall_refund_request_snapshotsGetPayload<ReturnType<typeof select>>;
// 
//       export function select() {
//         // implicit return type for better type inference
//         return {
//           select: {
//             id: true,
//             order_item_id: true,
//             status: true,
//             reason: true,
//             created_at: true,
//             responded_at: true,
//             approved_by_seller_id: true,
//             rejection_reason: true,
//             snapshot_at: true,
//             deleted_at: true,
//             refund_request_id: true,
//             ...
//           },
//         } satisfies Prisma.ecommerce_mall_refund_request_snapshotsFindManyArgs;
//       }
// 
//       export async function transform(input: Payload): Promise<IEcommerceMallRefundRequestSnapshot> {
//         return {
//   id: {string},
//   refund_request_id: {string | null},
//   order_item_id: {string},
//   status: {string},
//   reason: {string},
//   created_at: {string},
//   responded_at: {string | null},
//   approved_by_seller_id: {string | null},
//   rejection_reason: {string | null},
//   snapshot_at: {string},
//   deleted_at: {string | null},
//   order_item: {IEcommerceMallOrderItem.ISummary | null},
//   approved_by_seller: {IEcommerceMallSeller.ISummary | null},
//   rejected_by_seller: {IEcommerceMallSeller.ISummary | null},
//         };
//       }
//     }
//--------------------------------------------------------------