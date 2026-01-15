import { Prisma } from "@prisma/sdk";
import { ArrayUtil } from "@nestia/e2e";
import typia, { tags } from "typia";

import { IShoppingMallShippingTracking } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallShippingTracking";

import { toISOStringSafe } from "../utils/toISOStringSafe";

export namespace ShoppingMallShippingTrackingTransformer {
  export type Payload = Prisma.shopping_mall_shipping_trackingsGetPayload<
    ReturnType<typeof select>
  >;
  export function select() {
    return {
      select: {
        id: true,
        tracking_number: true,
        orderShipment: {
          select: {
            carrier: true,
            estimated_delivery_date: true,
            actual_delivery_date: true,
            location: true,
            delivery_attempts: true,
            carrier_notes: true,
            tracking_url: true,
            package_weight: true,
            package_dimensions: true,
            shipping_method: true,
            carrier_tracking_status: true,
            delivery_confirmation_photo_url: true,
            delivery_signature: true,
            recipient_name: true,
            delivery_notes: true,
            delivery_time_window: true,
            return_reason: true,
            carrier_service_level: true,
            last_scanned_location: true,
            scan_frequency: true,
            total_distance: true,
            package_fragile: true,
          },
        },
      },
    } satisfies Prisma.shopping_mall_shipping_trackingsFindManyArgs;
  }
  export async function transform(
    input: Payload,
  ): Promise<IShoppingMallShippingTracking> {
    return {
      id: input.id,
      tracking_number: input.tracking_number,
      carrier: input.orderShipment.carrier.name,
      estimated_delivery_date: input.orderShipment.estimated_delivery_date
        ? toISOStringSafe(input.orderShipment.estimated_delivery_date)
        : undefined,
      actual_delivery_date: input.orderShipment.actual_delivery_date
        ? toISOStringSafe(input.orderShipment.actual_delivery_date)
        : undefined,
      location: input.orderShipment.location,
      delivery_attempts: input.orderShipment.delivery_attempts,
      carrier_notes: input.orderShipment.carrier_notes,
      tracking_url: input.orderShipment.tracking_url,
      package_weight: input.orderShipment.package_weight,
      package_dimensions: input.orderShipment.package_dimensions,
      shipping_method: input.orderShipment.shipping_method,
      carrier_tracking_status: input.orderShipment.carrier_tracking_status,
      delivery_confirmation_photo_url:
        input.orderShipment.delivery_confirmation_photo_url,
      delivery_signature: input.orderShipment.delivery_signature,
      recipient_name: input.orderShipment.recipient_name,
      delivery_notes: input.orderShipment.delivery_notes,
      delivery_time_window: input.orderShipment.delivery_time_window,
      return_reason: input.orderShipment.return_reason,
      carrier_service_level: input.orderShipment.carrier_service_level,
      last_scanned_location: input.orderShipment.last_scanned_location,
      scan_frequency: input.orderShipment.scan_frequency,
      total_distance: input.orderShipment.total_distance,
      package_fragile: input.orderShipment.package_fragile,
    };
  }
}
