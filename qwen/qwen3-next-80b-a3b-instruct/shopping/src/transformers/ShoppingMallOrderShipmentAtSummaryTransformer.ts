import { Prisma } from "@prisma/sdk";
import { ArrayUtil } from "@nestia/e2e";
import typia, { tags } from "typia";

import { IShoppingMallOrderShipment } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrderShipment";
import { IShoppingMallCarrier } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCarrier";
import { IShoppingMallOrder } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrder";
import { IShoppingMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomer";
import { IShoppingMallPaymentMethod } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallPaymentMethod";
import { IShoppingMallOrderAddress } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrderAddress";

import { toISOStringSafe } from "../utils/toISOStringSafe";

import { ShoppingMallOrderAtSummaryTransformer } from "./ShoppingMallOrderAtSummaryTransformer";
import { ShoppingMallCarrierAtSummaryTransformer } from "./ShoppingMallCarrierAtSummaryTransformer";

export namespace ShoppingMallOrderShipmentAtSummaryTransformer {
  export type Payload = Prisma.shopping_mall_order_shipmentsGetPayload<
    ReturnType<typeof select>
  >;
  export function select() {
    return {
      select: {
        id: true,
        tracking_number: true,
        package_weight: true,
        package_dimensions: true,
        estimated_delivery_date: true,
        actual_delivery_date: true,
        created_at: true,
        updated_at: true,
        deleted_at: true,
        shopping_mall_shipping_trackings: true,
        shopping_mall_delivery_events: true,
        order: ShoppingMallOrderAtSummaryTransformer.select(),
        carrier: ShoppingMallCarrierAtSummaryTransformer.select(),
      },
    } satisfies Prisma.shopping_mall_order_shipmentsFindManyArgs;
  }
  export async function transform(
    input: Payload,
  ): Promise<IShoppingMallOrderShipment.ISummary> {
    return {
      id: input.id,
      order_id: input.order.id,
      carrier_id: input.carrier.id,
      tracking_number: input.tracking_number,
      status: input.shopping_mall_delivery_events[0]?.status ?? "pending",
      estimated_delivery_date: toISOStringSafe(input.estimated_delivery_date),
      actual_delivery_date: toISOStringSafe(input.actual_delivery_date),
      shipment_details:
        input.shopping_mall_delivery_events[0]?.notes ?? undefined,
      created_at: toISOStringSafe(input.created_at),
      updated_at: toISOStringSafe(input.updated_at),
      carrier: await ShoppingMallCarrierAtSummaryTransformer.transform(
        input.carrier,
      ),
      order: await ShoppingMallOrderAtSummaryTransformer.transform(input.order),
    };
  }
}
