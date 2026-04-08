import { IEcommerceMallOrderItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallOrderItem";
import { IEcommerceMallProductSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProductSnapshot";
import { IEcommerceMallProductSnapshotVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProductSnapshotVariant";
import { IEcommerceMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSeller";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { Prisma } from "@prisma/sdk";
import { VariadicSingleton } from "tstl";
import typia, { tags } from "typia";

import { MyGlobal } from "../MyGlobal";
import { toISOStringSafe } from "../utils/toISOStringSafe";
import { EcommerceMallProductSnapshotAtSummaryTransformer } from "./EcommerceMallProductSnapshotAtSummaryTransformer";
import { EcommerceMallProductSnapshotVariantAtSummaryTransformer } from "./EcommerceMallProductSnapshotVariantAtSummaryTransformer";

export namespace EcommerceMallOrderItemAtSummaryTransformer {
  export type Payload = Prisma.ecommerce_mall_order_itemsGetPayload<
    ReturnType<typeof select>
  >;
  export function select() {
    return {
      select: {
        id: true,
        quantity: true,
        unit_price: true,
        status: true,
        created_at: true,
        order: {
          select: {
            id: true,
          },
        },
        productSnapshot:
          EcommerceMallProductSnapshotAtSummaryTransformer.select(),
        productVariant:
          EcommerceMallProductSnapshotVariantAtSummaryTransformer.select(),
        sellerProfileSnapshot: {
          select: {
            shop_name: true,
          },
        },
      },
    } satisfies Prisma.ecommerce_mall_order_itemsFindManyArgs;
  }
  export async function transform(
    input: Payload,
  ): Promise<IEcommerceMallOrderItem.ISummary> {
    return {
      id: input.id,
      orderId: input.order.id ?? undefined,
      quantity: input.quantity,
      unitPrice: input.unit_price,
      status: input.status as IEcommerceMallOrderItem.ISummary["status"],
      createdAt: toISOStringSafe(input.created_at),
      productSnapshot:
        await EcommerceMallProductSnapshotAtSummaryTransformer.transform(
          input.productSnapshot,
        ),
      variantSnapshot:
        await EcommerceMallProductSnapshotVariantAtSummaryTransformer.transform(
          input.productVariant,
        ),
      sellerShopName: input.sellerProfileSnapshot.shop_name,
    } satisfies IEcommerceMallOrderItem.ISummary;
  }
}


//--------------------------------------------------------------
// TEMPLATE CODE
//--------------------------------------------------------------
//     export namespace EcommerceMallOrderItemAtSummaryTransformer {
//       export type Payload = Prisma.ecommerce_mall_order_itemsGetPayload<ReturnType<typeof select>>;
// 
//       export function select() {
//         // implicit return type for better type inference
//         return {
//           select: {
//             id: true,
//             quantity: true,
//             unit_price: true,
//             status: true,
//             created_at: true,
//             updated_at: true,
//             ecommerce_mall_order_id: true,
//             ecommerce_mall_product_id: true,
//             ecommerce_mall_product_variant_id: true,
//             productSnapshot: EcommerceMallProductSnapshotAtSummaryTransformer.select(),
//             ecommerce_mall_seller_profile_snapshot_id: true,
//             ...
//           },
//         } satisfies Prisma.ecommerce_mall_order_itemsFindManyArgs;
//       }
// 
//       export async function transform(input: Payload): Promise<IEcommerceMallOrderItem.ISummary> {
//         return {
//   id: {string},
//   orderId: {string},
//   quantity: {integer},
//   unitPrice: {number},
//   status: {"paid" | "shipped" | "delivered" | "cancelled" | "refunded"},
//   createdAt: {string},
//   productSnapshot: await EcommerceMallProductSnapshotAtSummaryTransformer.transform(input.productSnapshot),
//   variantSnapshot: {IEcommerceMallProductSnapshotVariant.ISummary},
//   sellerShopName: {string},
//         };
//       }
//     }
//--------------------------------------------------------------