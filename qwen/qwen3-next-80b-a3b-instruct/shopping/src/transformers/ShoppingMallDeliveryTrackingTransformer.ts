import { Prisma } from "@prisma/sdk";
import { ArrayUtil } from "@nestia/e2e";
import typia, { tags } from "typia";

import { IShoppingMallDeliveryTracking } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallDeliveryTracking";
import { IShoppingMallOrder } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrder";
import { IShoppingMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomer";
import { IShoppingMallPaymentMethod } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallPaymentMethod";
import { IShoppingMallOrderAddress } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrderAddress";
import { IShoppingMallCarrier } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCarrier";
import { IShoppingMallDeliveryStatus } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallDeliveryStatus";

import { toISOStringSafe } from "../utils/toISOStringSafe";

import { ShoppingMallOrderAtSummaryTransformer } from "./ShoppingMallOrderAtSummaryTransformer";

export namespace ShoppingMallDeliveryTrackingTransformer {
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
        location: true,
        created_at: true,
        updated_at: true,
        order: ShoppingMallOrderAtSummaryTransformer.select(),
      },
    } satisfies Prisma.shopping_mall_delivery_trackingsFindManyArgs;
  }
  export async function transform(
    input: Payload,
  ): Promise<IShoppingMallDeliveryTracking> {
    // Map string status to IShoppingMallDeliveryStatus enum
    const statusMap: Record<string, IShoppingMallDeliveryStatus> = {
      pending: "pending",
      in_transit: "in_transit",
      out_for_delivery: "out_for_delivery",
      delivered: "delivered",
      failed: "failed",
      cancelled: "cancelled",
      returned: "returned",
    };
    const status: IShoppingMallDeliveryStatus =
      statusMap[input.status] || "pending";
    // Construct carrier object inline using available carrier_name
    // No neighbor transformer available - carrier_name is scalar field, not relation
    // Per IShoppingMallCarrier.ISummary: all fields are required
    const carrier: IShoppingMallCarrier.ISummary = {
      name: input.carrier_name,
      service_region: "Unknown",
      active: true,
      status: "active",
      carrier_type: "national",
    };
    return {
      id: input.id,
      trackingCode: input.tracking_number,
      carrier: carrier,
      status: status,
      estimatedDeliveryDate:
        toISOStringSafe(input.estimated_delivery_date) ??
        "2300-01-01T00:00:00Z", // Sentinel date for null
      currentLocation: input.location ?? "Unknown", // Default value for null
      trackingUrl: `https://tracking.carrier.com/?code=${input.tracking_number}`,
      carrierDetails: input.carrier_name,
      lastUpdated: toISOStringSafe(input.updated_at),
      createdAt: toISOStringSafe(input.created_at),
      updatedAt: toISOStringSafe(input.updated_at),
      order: await ShoppingMallOrderAtSummaryTransformer.transform(input.order),
    };
  }
}
