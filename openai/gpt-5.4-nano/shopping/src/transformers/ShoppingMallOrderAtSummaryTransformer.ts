import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IShoppingMallOrder } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrder";
import { ArrayUtil } from "@nestia/e2e";
import { Prisma } from "@prisma/sdk";
import typia, { tags } from "typia";

import { toISOStringSafe } from "../utils/toISOStringSafe";

export namespace ShoppingMallOrderAtSummaryTransformer {
  export type Payload = Prisma.shopping_mall_ordersGetPayload<
    ReturnType<typeof select>
  >;
  export function select() {
    return {
      select: {
        id: true,
        order_code: true,
        ship_to_name: true,
        ship_to_phone: true,
        ship_to_postal_code: true,
        ship_to_region: true,
        ship_to_city: true,
        ship_to_street_address: true,
        ship_to_detail_address: true,
        shipping_instructions: true,
        placed_at: true,
        created_at: true,
        updated_at: true,
        deleted_at: true,
        customer: {
          select: {
            id: true,
          },
        },
        payment: {
          select: {
            id: true,
          },
        },
        orderItems: {
          select: {
            quantity: true,
            seller_price_at_purchase: true,
            line_item_status: true,
          },
        },
        shipments: {
          select: {
            status: true,
          },
        },
      },
    } satisfies Prisma.shopping_mall_ordersFindManyArgs;
  }
  export async function transform(
    input: Payload,
  ): Promise<IShoppingMallOrder.ISummary> {
    const orderItems = input.orderItems ?? [];
    const shipments = input.shipments ?? [];
    const totalPrice = orderItems.reduce((sum, item) => {
      const qty = Number(item.quantity);
      const price = Number(item.seller_price_at_purchase);
      return sum + price * qty;
    }, 0);
    const shipmentStatus = shipments[0]?.status;
    const itemStatus = orderItems[0]?.line_item_status;
    return {
      id: input.id,
      orderCode: input.order_code,
      placedAt: input.placed_at.toISOString(),
      totalPrice,
      overallStatus: shipmentStatus
        ? String(shipmentStatus)
        : itemStatus
          ? String(itemStatus)
          : "",
      deletedAt: input.deleted_at ? input.deleted_at.toISOString() : null,
    } satisfies IShoppingMallOrder.ISummary;
  }
}
