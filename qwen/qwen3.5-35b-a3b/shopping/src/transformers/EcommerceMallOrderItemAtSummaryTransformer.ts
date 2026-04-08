import { IEcommerceMallOrderItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallOrderItem";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { Prisma } from "@prisma/sdk";
import { VariadicSingleton } from "tstl";
import typia, { tags } from "typia";

import { MyGlobal } from "../MyGlobal";
import { toISOStringSafe } from "../utils/toISOStringSafe";

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
        subtotal: true,
        status: true,
        created_at: true,
        updated_at: true,
        deleted_at: true,
        order: {
          select: {
            order_number: true,
          },
        },
        productVariant: {
          select: {
            sku_code: true,
            price: true,
          },
        },
        seller: {
          select: {
            display_name: true,
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
      order_number: input.order.order_number,
      seller_display_name: input.seller.display_name,
      product_variant_name: input.productVariant.sku_code,
      product_variant_sku_code: input.productVariant.sku_code,
      product_variant_price: Number(input.productVariant.price),
      quantity: input.quantity,
      unit_price: Number(input.unit_price),
      subtotal: Number(input.subtotal),
      status:
        input.status as any satisfies IEcommerceMallOrderItem.ISummary["status"],
      created_at: toISOStringSafe(input.created_at),
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
//             order_number: true,
//             seller_display_name: true,
//             product_variant_name: true,
//             product_variant_sku_code: true,
//             product_variant_price: true,
//             quantity: true,
//             unit_price: true,
//             subtotal: true,
//             status: true,
//             created_at: true,
//           },
//         } satisfies Prisma.ecommerce_mall_order_itemsFindManyArgs;
//       }
// 
//       export async function transform(input: Payload): Promise<IEcommerceMallOrderItem.ISummary> {
//         return {
//   id: {string},
//   order_number: {string},
//   seller_display_name: {string},
//   product_variant_name: {string},
//   product_variant_sku_code: {string},
//   product_variant_price: {number},
//   quantity: {integer},
//   unit_price: {number},
//   subtotal: {number},
//   status: {"paid" | "shipped" | "delivered" | "cancelled" | "refunded"},
//   created_at: {string},
//         };
//       }
//     }
//--------------------------------------------------------------