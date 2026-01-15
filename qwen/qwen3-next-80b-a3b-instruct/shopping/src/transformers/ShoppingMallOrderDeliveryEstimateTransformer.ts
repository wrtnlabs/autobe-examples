import { Prisma } from "@prisma/sdk";
import { ArrayUtil } from "@nestia/e2e";
import typia, { tags } from "typia";

import { IShoppingMallOrderDeliveryEstimate } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrderDeliveryEstimate";
import { IShoppingMallCarrier } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCarrier";

import { toISOStringSafe } from "../utils/toISOStringSafe";

import { ShoppingMallCarrierAtSummaryTransformer } from "./ShoppingMallCarrierAtSummaryTransformer";

export namespace ShoppingMallOrderDeliveryEstimateTransformer {
  export type Payload = Prisma.shopping_mall_order_shipmentsGetPayload<
    ReturnType<typeof select>
  >;
  export function select() {
    return {
      select: {
        id: true,
        tracking_number: true,
        estimated_delivery_date: true,
        actual_delivery_date: true,
        package_weight: true,
        package_dimensions: true,
        created_at: true,
        updated_at: true,
        deleted_at: true,
        order: {
          select: {
            shipping_method: { select: { scheduled_delivery_enabled: true } },
            address: { select: { delivery_instructions: true } },
          },
        },
        carrier: ShoppingMallCarrierAtSummaryTransformer.select(),
        shopping_mall_shipping_trackings: {
          select: { tracking_url: true, tracking_source: true },
          orderBy: { created_at: "desc" },
          take: 1,
        },
        shopping_mall_delivery_events: {
          select: { event_type: true, reason_code: true, message: true },
          orderBy: { created_at: "desc" },
        },
      },
    } satisfies Prisma.shopping_mall_order_shipmentsFindManyArgs;
  }
  export async function transform(
    input: Payload,
  ): Promise<IShoppingMallOrderDeliveryEstimate> {
    let status: IShoppingMallOrderDeliveryEstimate["status"] = "processing";
    if (input.deleted_at) {
      status = "delivered";
    } else if (input.shopping_mall_delivery_events.length > 0) {
      const deliveryEventTypes = input.shopping_mall_delivery_events.map(
        (e) => e.event_type,
      );
      if (deliveryEventTypes.includes("delayed")) {
        status = "delayed";
      } else if (deliveryEventTypes.includes("out_for_delivery")) {
        status = "out_for_delivery";
      } else if (deliveryEventTypes.includes("delivered")) {
        status = "delivered";
      } else if (deliveryEventTypes.includes("in_transit")) {
        status = "in_transit";
      } else {
        status = "shipped";
      }
    } else if (input.shopping_mall_shipping_trackings.length > 0) {
      status = "shipped";
    }
    let estimated_delivery_window = "pending";
    let serviceJson = {};
    try {
      serviceJson = JSON.parse(input.carrier.service_details);
    } catch (e) {
      // If invalid JSON, use default empty object
    }
    const carrierType = (serviceJson.carrier_type as string) || "national";
    if (carrierType === "express") {
      estimated_delivery_window = "1-2 business days";
    } else if (carrierType === "economy") {
      estimated_delivery_window = "3-7 business days";
    } else if (carrierType === "national") {
      estimated_delivery_window = "2-4 business days";
    } else {
      estimated_delivery_window = "5-10 business days";
    }
    const latestTracking = input.shopping_mall_shipping_trackings[0];
    const trackingUrl = latestTracking ? latestTracking.tracking_url : null;
    const externalTrackingSource = latestTracking
      ? latestTracking.tracking_source
      : "";
    let estimated_delivery_confidence = 0;
    if (input.shopping_mall_shipping_trackings.length === 0) {
      estimated_delivery_confidence = 0;
    } else if (input.shopping_mall_delivery_events.length === 0) {
      estimated_delivery_confidence = 40;
    } else if (input.shopping_mall_delivery_events.length < 3) {
      estimated_delivery_confidence = 70;
    } else {
      estimated_delivery_confidence = 95;
    }
    let reason_for_delay: string | null = null;
    if (
      status === "delayed" &&
      input.shopping_mall_delivery_events.length > 0
    ) {
      const latestEvent = input.shopping_mall_delivery_events[0];
      reason_for_delay = latestEvent.reason_code || latestEvent.message || null;
    }
    let total_business_days_estimate = 5;
    if (carrierType === "express") {
      total_business_days_estimate = 2;
    } else if (carrierType === "economy") {
      total_business_days_estimate = 6;
    } else if (carrierType === "national") {
      total_business_days_estimate = 4;
    }
    const has_scheduled_delivery =
      ((input.order?.shipping_method as any)
        ?.scheduled_delivery_enabled as boolean) ?? false;
    const delivery_instructions =
      ((input.order?.address as any)?.delivery_instructions as string) ?? null;
    return {
      status,
      estimated_delivery_window,
      carrier: await ShoppingMallCarrierAtSummaryTransformer.transform(
        input.carrier,
      ),
      tracking_url: trackingUrl
        ? (trackingUrl satisfies string as string & tags.Format<"uri">)
        : null,
      tracking_number: input.tracking_number,
      estimated_delivery_confidence,
      reason_for_delay,
      has_scheduled_delivery,
      delivery_instructions,
      total_business_days_estimate,
      external_tracking_source:
        externalTrackingSource satisfies string as string,
    };
  }
}
