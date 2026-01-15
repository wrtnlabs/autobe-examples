import { Prisma } from "@prisma/sdk";
import { ArrayUtil } from "@nestia/e2e";
import typia, { tags } from "typia";

import { IShoppingMallDeliveryTracking } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallDeliveryTracking";
import { IShoppingMallDeliveryEvent } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallDeliveryEvent";

import { toISOStringSafe } from "../utils/toISOStringSafe";

import { ShoppingMallDeliveryEventAtInvertTransformer } from "./ShoppingMallDeliveryEventAtInvertTransformer";

export namespace ShoppingMallDeliveryTrackingAtInvertTransformer {
  export type Payload = Prisma.shopping_mall_delivery_trackingsGetPayload<
    ReturnType<typeof select>
  >;
  export function select() {
    return {
      select: {
        id: true,
        tracking_number: true,
        carrier_name: true,
        status: true,
        estimated_delivery_date: true,
        actual_delivery_date: true,
        location: true,
        package_weight: true,
        package_dimensions: true,
        created_at: true,
        updated_at: true,
        order: {
          select: {
            order_code: true, // Fixed: Use correct field name 'order_code'
            delivery_events:
              ShoppingMallDeliveryEventAtInvertTransformer.select(),
          },
        },
      },
    } satisfies Prisma.shopping_mall_delivery_trackingsFindManyArgs;
  }
  export async function transform(
    input: Payload,
  ): Promise<IShoppingMallDeliveryTracking.IInvert> {
    return {
      id: input.id,
      order_code: input.order.order_code, // Fixed: Use correct field name 'order_code'
      shipping_tracking_number: input.tracking_number,
      carrier_name: input.carrier_name,
      carrier_logo_url: undefined, // This field is not in Prisma schema
      status: input.status,
      estimated_delivery_date: toISOStringSafe(input.estimated_delivery_date), // Fixed: Use toISOStringSafe()
      tracking_url: null, // Fixed: Must be string | null, not undefined. This aligns with Type 'string & Format<"uri">' which allows null via Prisma schema default
      delivery_events: await ArrayUtil.asyncMap(
        input.order.delivery_events,
        (event) =>
          ShoppingMallDeliveryEventAtInvertTransformer.transform(event),
      ),
      created_at: toISOStringSafe(input.created_at), // Fixed: Use toISOStringSafe()
      updated_at: toISOStringSafe(input.updated_at), // Fixed: Use toISOStringSafe()
    };
  }
}
