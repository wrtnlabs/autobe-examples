import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IShoppingMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomer";
import { IShoppingMallOrder } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrder";
import { IShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSeller";
import { IShoppingMallShipment } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallShipment";
import { ArrayUtil } from "@nestia/e2e";
import { Prisma } from "@prisma/sdk";
import typia, { tags } from "typia";

import { toISOStringSafe } from "../utils/toISOStringSafe";
import { ShoppingMallOrderAtSummaryTransformer } from "./ShoppingMallOrderAtSummaryTransformer";
import { ShoppingMallSellerAtSummaryTransformer } from "./ShoppingMallSellerAtSummaryTransformer";

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
        delivered_at: true,
        created_at: true,
        updated_at: true,
        deleted_at: true,
        seller: ShoppingMallSellerAtSummaryTransformer.select(),
        order: ShoppingMallOrderAtSummaryTransformer.select(),
        _count: {
          select: {
            orderItems: true,
          },
        },
      },
    } satisfies Prisma.shopping_mall_shipmentsFindManyArgs;
  }
  export async function transform(
    input: Payload,
  ): Promise<IShoppingMallShipment.ISummary> {
    return {
      id: input.id,
      carrierName: input.carrier_name,
      trackingNumber: input.tracking_number,
      shippedAt: input.shipped_at.toISOString(),
      deliveredAt: input.delivered_at?.toISOString() ?? null,
      deliveryStatus:
        input.delivered_at === null ? "pending_delivery" : "delivered",
      seller: await ShoppingMallSellerAtSummaryTransformer.transform(
        input.seller,
      ),
      order: await ShoppingMallOrderAtSummaryTransformer.transform(input.order),
      orderItemsCount: input._count.orderItems,
    };
  }
}
