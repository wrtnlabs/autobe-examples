import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IShoppingMallShipment } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallShipment";
import { ArrayUtil } from "@nestia/e2e";
import { Prisma } from "@prisma/sdk";
import typia, { tags } from "typia";

import { toISOStringSafe } from "../utils/toISOStringSafe";

export namespace ShoppingMallShipmentAtSummaryTransformer {
  export type Payload = Prisma.shopping_mall_shipmentsGetPayload<
    ReturnType<typeof select>
  >;
  export function select() {
    return {
      select: {
        id: true,
        carrier_name: true,
        tracking_number: true,
        shipped_at: true,
        created_at: true,
        updated_at: true,
        order: true,
        seller: true,
        shipmentItems: {
          select: {
            orderItem: {
              select: {
                status: true,
                updated_at: true, // Use updated_at as proxy for delivery time
              },
            },
          },
        },
      },
    } satisfies Prisma.shopping_mall_shipmentsFindManyArgs;
  }
  export async function transform(
    input: Payload,
  ): Promise<IShoppingMallShipment.ISummary> {
    const orderItems = input.shipmentItems.map((si) => si.orderItem);
    // Find the earliest updated_at timestamp among items where status is 'delivered'
    const deliveredItems = orderItems.filter(
      (item) => item.status === "delivered",
    );
    const deliveredAts =
      deliveredItems.length > 0
        ? deliveredItems.map((item) => item.updated_at)
        : [];
    const delivered_at =
      deliveredAts.length > 0
        ? toISOStringSafe(
            new Date(Math.min(...deliveredAts.map((d) => d.getTime()))),
          )
        : null;
    // Determine delivery status
    const deliveredCount = orderItems.filter(
      (item) => item.status === "delivered",
    ).length;
    let status: "shipped" | "partially_delivered" | "delivered";
    if (deliveredCount === orderItems.length) status = "delivered";
    else if (deliveredCount > 0) status = "partially_delivered";
    else status = "shipped";
    return {
      id: input.id,
      carrier_name: input.carrier_name,
      tracking_number: input.tracking_number,
      shipped_at: toISOStringSafe(input.shipped_at),
      delivered_at,
      status,
      item_count: input.shipmentItems.length,
    };
  }
}
