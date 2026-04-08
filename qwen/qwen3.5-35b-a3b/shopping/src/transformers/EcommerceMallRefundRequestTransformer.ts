import { IEcommerceMallOrderItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallOrderItem";
import { IEcommerceMallRefundRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallRefundRequest";
import { IEcommerceMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSeller";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { Prisma } from "@prisma/sdk";
import { VariadicSingleton } from "tstl";
import typia, { tags } from "typia";

import { MyGlobal } from "../MyGlobal";
import { toISOStringSafe } from "../utils/toISOStringSafe";
import { EcommerceMallOrderItemAtSummaryTransformer } from "./EcommerceMallOrderItemAtSummaryTransformer";
import { EcommerceMallSellerAtSummaryTransformer } from "./EcommerceMallSellerAtSummaryTransformer";

export namespace EcommerceMallRefundRequestTransformer {
  export type Payload = Prisma.ecommerce_mall_refund_requestsGetPayload<
    ReturnType<typeof select>
  >;
  export function select() {
    return {
      select: {
        id: true,
        order_item_id: true,
        approved_by_seller_id: true,
        rejected_by_seller_id: true,
        reason: true,
        status: true,
        created_at: true,
        updated_at: true,
        deleted_at: true,
        item: EcommerceMallOrderItemAtSummaryTransformer.select(),
        approvedBySeller: EcommerceMallSellerAtSummaryTransformer.select(),
        rejectedBySeller: EcommerceMallSellerAtSummaryTransformer.select(),
        snapshots: true,
        snapshot: true,
      },
    } satisfies Prisma.ecommerce_mall_refund_requestsFindManyArgs;
  }
  export async function transform(
    input: Payload,
  ): Promise<IEcommerceMallRefundRequest> {
    return {
      id: input.id,
      order_item_id: input.order_item_id,
      approved_by_seller_id: input.approved_by_seller_id ?? null,
      rejected_by_seller_id: input.rejected_by_seller_id ?? null,
      reason: input.reason,
      status: typia.assert<"pending" | "approved" | "rejected">(input.status),
      created_at: toISOStringSafe(input.created_at),
      updated_at: toISOStringSafe(input.updated_at),
      deleted_at: input.deleted_at ? toISOStringSafe(input.deleted_at) : null,
      order_item: await EcommerceMallOrderItemAtSummaryTransformer.transform(
        input.item,
      ),
      approvedBySeller: input.approvedBySeller
        ? await EcommerceMallSellerAtSummaryTransformer.transform(
            input.approvedBySeller,
          )
        : null,
      rejectedBySeller: input.rejectedBySeller
        ? await EcommerceMallSellerAtSummaryTransformer.transform(
            input.rejectedBySeller,
          )
        : null,
    } satisfies IEcommerceMallRefundRequest;
  }
}


//--------------------------------------------------------------
// TEMPLATE CODE
//--------------------------------------------------------------
//     export namespace EcommerceMallRefundRequestTransformer {
//       export type Payload = Prisma.ecommerce_mall_refund_requestsGetPayload<ReturnType<typeof select>>;
// 
//       export function select() {
//         // implicit return type for better type inference
//         return {
//           select: {
//             id: true,
//             order_item_id: true,
//             approved_by_seller_id: true,
//             rejected_by_seller_id: true,
//             reason: true,
//             status: true,
//             created_at: true,
//             updated_at: true,
//             deleted_at: true,
//             ...
//           },
//         } satisfies Prisma.ecommerce_mall_refund_requestsFindManyArgs;
//       }
// 
//       export async function transform(input: Payload): Promise<IEcommerceMallRefundRequest> {
//         return {
//   id: {string},
//   order_item_id: {string},
//   approved_by_seller_id: {string | null},
//   rejected_by_seller_id: {string | null},
//   reason: {string},
//   status: {"pending" | "approved" | "rejected"},
//   created_at: {string},
//   updated_at: {string},
//   deleted_at: {string | null},
//   order_item: {IEcommerceMallOrderItem.ISummary},
//   approvedBySeller: {IEcommerceMallSeller.ISummary | null},
//   rejectedBySeller: {IEcommerceMallSeller.ISummary | null},
//         };
//       }
//     }
//--------------------------------------------------------------