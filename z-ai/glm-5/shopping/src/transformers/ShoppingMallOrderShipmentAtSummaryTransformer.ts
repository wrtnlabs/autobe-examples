import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IShoppingMallOrderShipment } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrderShipment";
import { IShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSeller";
import { ArrayUtil } from "@nestia/e2e";
import { Prisma } from "@prisma/sdk";
import typia, { tags } from "typia";

import { toISOStringSafe } from "../utils/toISOStringSafe";
import { ShoppingMallSellerAtSummaryTransformer } from "./ShoppingMallSellerAtSummaryTransformer";

export namespace ShoppingMallOrderShipmentAtSummaryTransformer {
  export type Payload = Prisma.shopping_mall_order_shipmentsGetPayload<
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
        delivery_confirmation_method: true,
        seller: ShoppingMallSellerAtSummaryTransformer.select(),
        items: {
          select: {
            id: true,
          },
        } satisfies Prisma.shopping_mall_order_shipment_itemsFindManyArgs,
      },
    } satisfies Prisma.shopping_mall_order_shipmentsFindManyArgs;
  }
  export async function transform(
    input: Payload,
  ): Promise<IShoppingMallOrderShipment.ISummary> {
    return {
      id: input.id,
      carrierName: input.carrier_name,
      trackingNumber: input.tracking_number,
      shippedAt: input.shipped_at.toISOString(),
      deliveredAt: input.delivered_at?.toISOString() ?? null,
      deliveryConfirmationMethod: input.delivery_confirmation_method,
      itemsCount: input.items.length,
      seller: await ShoppingMallSellerAtSummaryTransformer.transform(
        input.seller,
      ),
    };
  }
}
