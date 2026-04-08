import { IEcommerceMallCancellationRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCancellationRequest";
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
import { EcommerceMallOrderAtSummaryTransformer } from "./EcommerceMallOrderAtSummaryTransformer";
import { EcommerceMallOrderItemAtSummaryTransformer } from "./EcommerceMallOrderItemAtSummaryTransformer";
import { EcommerceMallSellerAtSummaryTransformer } from "./EcommerceMallSellerAtSummaryTransformer";

export namespace EcommerceMallCancellationRequestTransformer {
  export type Payload = Prisma.ecommerce_mall_cancellation_requestsGetPayload<
    ReturnType<typeof select>
  >;
  export function select() {
    return {
      select: {
        id: true,
        reason: true,
        status: true,
        created_at: true,
        updated_at: true,
        deleted_at: true,
        item: EcommerceMallOrderItemAtSummaryTransformer.select(),
        order: EcommerceMallOrderAtSummaryTransformer.select(),
        seller: EcommerceMallSellerAtSummaryTransformer.select(),
        ecommerceMallSnapshotss: {
          select: { id: true },
        } satisfies Prisma.ecommerce_mall_snapshotsFindManyArgs,
        ecommerceMallCancellationRequestSnapshotss: {
          select: { id: true },
        } satisfies Prisma.ecommerce_mall_cancellation_request_snapshotsFindManyArgs,
      },
    } satisfies Prisma.ecommerce_mall_cancellation_requestsFindManyArgs;
  }
  export async function transform(
    input: Payload,
  ): Promise<IEcommerceMallCancellationRequest> {
    return {
      id: input.id,
      reason: input.reason,
      status: typia.assert<"pending" | "approved" | "rejected">(input.status),
      created_at: toISOStringSafe(input.created_at),
      updated_at: toISOStringSafe(input.updated_at),
      deleted_at:
        input.deleted_at === null ? null : toISOStringSafe(input.deleted_at),
      ecommerce_mall_order_id: input.order.id,
      ecommerce_mall_order_item_id: input.item.id,
      ecommerce_mall_seller_id: input.seller.id,
      item: await EcommerceMallOrderItemAtSummaryTransformer.transform(
        input.item,
      ),
      order: await EcommerceMallOrderAtSummaryTransformer.transform(
        input.order,
      ),
      seller: await EcommerceMallSellerAtSummaryTransformer.transform(
        input.seller,
      ),
    } satisfies IEcommerceMallCancellationRequest;
  }
}


//--------------------------------------------------------------
// TEMPLATE CODE
//--------------------------------------------------------------
//     export namespace EcommerceMallCancellationRequestTransformer {
//       export type Payload = Prisma.ecommerce_mall_cancellation_requestsGetPayload<ReturnType<typeof select>>;
// 
//       export function select() {
//         // implicit return type for better type inference
//         return {
//           select: {
//             created_at: true,
//             deleted_at: true,
//             ecommerce_mall_order_id: true,
//             ecommerce_mall_order_item_id: true,
//             ecommerce_mall_seller_id: true,
//             id: true,
//             reason: true,
//             status: true,
//             updated_at: true,
//             ...
//           },
//         } satisfies Prisma.ecommerce_mall_cancellation_requestsFindManyArgs;
//       }
// 
//       export async function transform(input: Payload): Promise<IEcommerceMallCancellationRequest> {
//         return {
//   created_at: {string},
//   deleted_at: {string | null},
//   ecommerce_mall_order_id: {string},
//   ecommerce_mall_order_item_id: {string},
//   ecommerce_mall_seller_id: {string},
//   id: {string},
//   item: {IEcommerceMallOrderItem.ISummary},
//   order: {IEcommerceMallOrder.ISummary},
//   reason: {string},
//   seller: {IEcommerceMallSeller.ISummary},
//   status: {"pending" | "approved" | "rejected"},
//   updated_at: {string},
//         };
//       }
//     }
//--------------------------------------------------------------