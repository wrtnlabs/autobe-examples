import { IEcommerceMallOrderItemSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallOrderItemSnapshot";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { Prisma } from "@prisma/sdk";
import { VariadicSingleton } from "tstl";
import typia, { tags } from "typia";

import { MyGlobal } from "../MyGlobal";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export namespace EcommerceMallOrderItemSnapshotTransformer {
  export type Payload = Prisma.ecommerce_mall_order_item_snapshotsGetPayload<
    ReturnType<typeof select>
  >;
  export function select() {
    return {
      select: {
        id: true,
        order_id: true,
        product_id: true,
        product_name: true,
        product_variant_id: true,
        product_variant_options: true,
        seller_id: true,
        seller_name: true,
        quantity: true,
        unit_price: true,
        total_price: true,
        snapshot_type: true,
        created_at: true,
        orderItem: { select: {} },
      },
    } satisfies Prisma.ecommerce_mall_order_item_snapshotsFindManyArgs;
  }
  export async function transform(
    input: Payload,
  ): Promise<IEcommerceMallOrderItemSnapshot> {
    return {
      id: input.id,
      order_id: input.order_id,
      product_id: input.product_id,
      product_name: input.product_name,
      product_variant_id: input.product_variant_id,
      product_variant_options: input.product_variant_options,
      seller_id: input.seller_id,
      seller_name: input.seller_name,
      quantity: input.quantity,
      unit_price: input.unit_price,
      total_price: input.total_price,
      snapshot_type:
        input.snapshot_type satisfies typeof input.snapshot_type as
          | "checkout"
          | "cancellation"
          | "refund",
      created_at: toISOStringSafe(input.created_at),
    } satisfies IEcommerceMallOrderItemSnapshot;
  }
}


//--------------------------------------------------------------
// TEMPLATE CODE
//--------------------------------------------------------------
//     export namespace EcommerceMallOrderItemSnapshotTransformer {
//       export type Payload = Prisma.ecommerce_mall_order_item_snapshotsGetPayload<ReturnType<typeof select>>;
// 
//       export function select() {
//         // implicit return type for better type inference
//         return {
//           select: {
//             id: true,
//             order_id: true,
//             product_id: true,
//             product_name: true,
//             product_variant_id: true,
//             product_variant_options: true,
//             seller_id: true,
//             seller_name: true,
//             quantity: true,
//             unit_price: true,
//             total_price: true,
//             snapshot_type: true,
//             created_at: true,
//           },
//         } satisfies Prisma.ecommerce_mall_order_item_snapshotsFindManyArgs;
//       }
// 
//       export async function transform(input: Payload): Promise<IEcommerceMallOrderItemSnapshot> {
//         return {
//   id: {string},
//   order_id: {string},
//   product_id: {string},
//   product_name: {string},
//   product_variant_id: {string},
//   product_variant_options: {string},
//   seller_id: {string},
//   seller_name: {string},
//   quantity: {integer},
//   unit_price: {number},
//   total_price: {number},
//   snapshot_type: {"checkout" | "cancellation" | "refund"},
//   created_at: {string},
//         };
//       }
//     }
//--------------------------------------------------------------