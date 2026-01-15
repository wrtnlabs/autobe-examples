import { Prisma } from "@prisma/sdk";
import { ArrayUtil } from "@nestia/e2e";
import typia, { tags } from "typia";

import { IShoppingMallOrderItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrderItem";
import { IShoppingMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProduct";

import { toISOStringSafe } from "../utils/toISOStringSafe";

import { ShoppingMallProductAtSummaryTransformer } from "./ShoppingMallProductAtSummaryTransformer";

export namespace ShoppingMallOrderItemAtSummaryTransformer {
  export type Payload = Prisma.shopping_mall_order_itemsGetPayload<
    ReturnType<typeof select>
  >;
  export function select() {
    return {
      select: {
        id: true,
        quantity: true,
        price: true,
        total_amount: true,
        created_at: true,
        updated_at: true,
        deleted_at: true,
        order: {
          select: {
            status: true,
          },
        },
        variant: ShoppingMallProductAtSummaryTransformer.select(),
        seller: true,
      },
    } satisfies Prisma.shopping_mall_order_itemsFindManyArgs;
  }
  export async function transform(
    input: Payload,
  ): Promise<IShoppingMallOrderItem.ISummary> {
    return {
      id: input.id,
      quantity: input.quantity,
      unitPrice: Number(input.price),
      totalPrice: Number(input.quantity) * Number(input.price),
      orderItemStatus: input.order.status satisfies string as
        | "pending"
        | "confirmed"
        | "shipped"
        | "delivered"
        | "cancelled"
        | "refunded",
      product: await ShoppingMallProductAtSummaryTransformer.transform(
        input.variant,
      ),
    };
  }
}
