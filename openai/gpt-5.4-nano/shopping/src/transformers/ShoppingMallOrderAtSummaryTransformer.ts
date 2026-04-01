import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IShoppingMallOrder } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrder";
import { ArrayUtil } from "@nestia/e2e";
import { Prisma } from "@prisma/sdk";
import { VariadicSingleton } from "tstl";
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
            seller_price_at_purchase: true,
            quantity: true,
            line_item_status: true,
          },
        } satisfies Prisma.shopping_mall_order_itemsFindManyArgs,
        shipments: {
          select: {
            status: true,
          },
        } satisfies Prisma.shopping_mall_shipmentsFindManyArgs,
      },
    } satisfies Prisma.shopping_mall_ordersFindManyArgs;
  }
  export async function transform(
    input: Payload,
  ): Promise<IShoppingMallOrder.ISummary> {
    const totalPrice = input.orderItems.reduce(
      (sum, item) =>
        sum + Number(item.seller_price_at_purchase) * item.quantity,
      0,
    );
    let overallStatus = "empty";
    if (input.orderItems.length > 0) {
      const itemStatuses = input.orderItems.map((i) => i.line_item_status);
      const shipmentStatuses = input.shipments.map((s) => s.status);
      if (itemStatuses.includes("refunded")) overallStatus = "refunded";
      else if (itemStatuses.includes("refund_requested"))
        overallStatus = "refund_requested";
      else if (itemStatuses.includes("cancelled")) overallStatus = "cancelled";
      else if (itemStatuses.includes("cancellation_requested"))
        overallStatus = "cancellation_requested";
      else {
        const shipmentDelivered = shipmentStatuses.includes("delivered");
        const shipmentShipped = shipmentStatuses.includes("shipped");
        if (shipmentDelivered || itemStatuses.includes("delivered"))
          overallStatus = "delivered";
        else if (shipmentShipped || itemStatuses.includes("shipped"))
          overallStatus = "shipped";
        else if (itemStatuses.includes("created")) overallStatus = "created";
        else overallStatus = itemStatuses[0] ?? "created";
      }
    }
    return {
      id: input.id,
      orderCode: input.order_code,
      placedAt: input.placed_at.toISOString(),
      totalPrice,
      overallStatus,
      deletedAt: input.deleted_at?.toISOString() ?? null,
    };
  }
}
