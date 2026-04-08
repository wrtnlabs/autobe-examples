import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IShoppingMallCustomerAddress } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomerAddress";
import { IShoppingMallOrder } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrder";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import { VariadicSingleton } from "tstl";
import typia, { tags } from "typia";

import { MyGlobal } from "../MyGlobal";
import { toISOStringSafe } from "../utils/toISOStringSafe";
import { ShoppingMallCustomerAddressAtSummaryTransformer } from "./ShoppingMallCustomerAddressAtSummaryTransformer";

export namespace ShoppingMallOrderAtSummaryTransformer {
  export type Payload = Prisma.shopping_mall_ordersGetPayload<
    ReturnType<typeof select>
  >;
  export function select() {
    return {
      select: {
        id: true,
        order_number: true,
        created_at: true,
        updated_at: true,
        shippingAddress:
          ShoppingMallCustomerAddressAtSummaryTransformer.select(),
        items: {
          select: {
            status: true,
            quantity: true,
            price: true,
          },
        } satisfies Prisma.shopping_mall_order_itemsFindManyArgs,
      },
    } satisfies Prisma.shopping_mall_ordersFindManyArgs;
  }
  export async function transform(
    input: Payload,
  ): Promise<IShoppingMallOrder.ISummary> {
    // Compute status from items
    const statuses = input.items.map((item) => item.status);
    let status: string;
    if (statuses.every((s) => s === "delivered")) {
      status = "delivered";
    } else if (statuses.every((s) => s === "cancelled")) {
      status = "cancelled";
    } else if (statuses.every((s) => s === "refunded")) {
      status = "refunded";
    } else if (statuses.some((s) => s === "shipped")) {
      status = "shipped";
    } else if (statuses.every((s) => s === "paid")) {
      status = "paid";
    } else {
      status = "partially_completed";
    }
    // Compute total_price
    const total_price = input.items.reduce(
      (sum, item) => sum + item.quantity * Number(item.price),
      0,
    );
    // Compute item_count
    const item_count = input.items.length;
    return {
      id: input.id,
      order_number: input.order_number,
      status,
      total_price,
      item_count,
      shipping_address:
        await ShoppingMallCustomerAddressAtSummaryTransformer.transform(
          input.shippingAddress,
        ),
      created_at: input.created_at.toISOString(),
      updated_at: input.updated_at.toISOString(),
    };
  }
}


//--------------------------------------------------------------
// TEMPLATE CODE
//--------------------------------------------------------------
//     export namespace ShoppingMallOrderAtSummaryTransformer {
//       export type Payload = Prisma.shopping_mall_ordersGetPayload<ReturnType<typeof select>>;
// 
//       export function select() {
//         // implicit return type for better type inference
//         return {
//           select: {
//             id: true,
//             order_number: true,
//             created_at: true,
//             updated_at: true,
//             deleted_at: true,
//             shopping_mall_customer_id: true,
//             shippingAddress: ShoppingMallCustomerAddressAtSummaryTransformer.select(),
//           },
//         } satisfies Prisma.shopping_mall_ordersFindManyArgs;
//       }
// 
//       export async function transform(input: Payload): Promise<IShoppingMallOrder.ISummary> {
//         return {
//   id: {string},
//   order_number: {string},
//   status: {string},
//   total_price: {number},
//   item_count: {integer},
//   shipping_address: await ShoppingMallCustomerAddressAtSummaryTransformer.transform(input.shippingAddress),
//   created_at: {string},
//   updated_at: {string},
//         };
//       }
//     }
//--------------------------------------------------------------