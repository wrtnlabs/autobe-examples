import { Prisma } from "@prisma/sdk";
import { ArrayUtil } from "@nestia/e2e";
import typia, { tags } from "typia";

import { IShoppingMallOrderItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrderItem";

import { toISOStringSafe } from "../utils/toISOStringSafe";

export namespace ShoppingMallOrderItemTransformer {
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
        notes: true, // Added to select
        order: {
          select: {
            order_number: true, // Fixed: 'code' → 'order_number'
            status: true,
          },
        },
        variant: {
          select: {
            id: true,
            product_id: true, // Fixed: 'product_code' → 'product_id'
          },
        },
        seller: {
          select: {
            id: true,
          },
        },
      },
    } satisfies Prisma.shopping_mall_order_itemsFindManyArgs;
  }
  export async function transform(
    input: Payload,
  ): Promise<IShoppingMallOrderItem> {
    return {
      id: input.id,
      itemCode:
        "ITEM-" +
        toISOStringSafe(input.created_at).split("T")[0] +
        "-" +
        input.id.slice(-4),
      orderCode: input.order.order_number, // Fixed: 'code' → 'order_number'
      productVariantId: input.variant.id,
      productCode: input.variant.product_id, // Fixed: 'product_code' → 'product_id'
      quantity: input.quantity,
      unitPrice: Number(input.price),
      totalPrice: Number(input.total_amount),
      currencyCode: "KRW",
      notes: input.notes ?? undefined,
      status: typia.assert<
        | "pending"
        | "completed"
        | "confirmed"
        | "processing"
        | "shipped"
        | "delivered"
        | "cancelled"
        | "refunded"
      >(input.order.status),
      created_at: toISOStringSafe(input.created_at),
      updated_at: toISOStringSafe(input.updated_at),
      sentinel: input.deleted_at ? "deleted" : "active",
      orderStatus: typia.assert<
        | "pending"
        | "completed"
        | "confirmed"
        | "processing"
        | "shipped"
        | "delivered"
        | "cancelled"
        | "refunded"
      >(input.order.status), // Now this should work correctly
      itemId: input.id,
    };
  }
}
