import { Prisma } from "@prisma/sdk";
import { ArrayUtil } from "@nestia/e2e";
import typia, { tags } from "typia";

import { IShoppingMallShippingPerformance } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallShippingPerformance";

import { toISOStringSafe } from "../utils/toISOStringSafe";

export namespace ShoppingMallShippingPerformanceAtSummaryTransformer {
  export type Payload = {
    id: string;
    tracking_number: string;
    carrier_name: string;
    status: string;
    estimated_delivery_date: Date | null;
    actual_delivery_date: Date | null;
    location: string | null;
    package_weight: number | null;
    package_dimensions: string | null;
    created_at: Date;
    updated_at: Date;
    order: {
      id: string;
      status: string;
      total_amount: number;
    };
  };
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
            id: true,
            status: true,
            total_amount: true,
          },
        },
      },
    } satisfies Prisma.shopping_mall_delivery_trackingsFindManyArgs;
  }
  export async function transform(
    input: Payload[],
  ): Promise<IShoppingMallShippingPerformance.ISummary> {
    // Filter deliveries with both dates defined for deliveryTime and onTimeRate calculations
    const validDeliveries = input.filter(
      (item) => item.estimated_delivery_date && item.actual_delivery_date,
    );
    // Calculate deliveryTime: average hours between estimated and actual delivery
    const totalDeliveryTime = validDeliveries.reduce((sum, item) => {
      const estimatedTime = item.estimated_delivery_date!.getTime();
      const actualTime = item.actual_delivery_date!.getTime();
      const hoursDifference = (actualTime - estimatedTime) / (1000 * 60 * 60);
      return sum + hoursDifference;
    }, 0);
    const deliveryTime =
      validDeliveries.length > 0
        ? totalDeliveryTime / validDeliveries.length
        : 0;
    // Calculate onTimeRate: percentage of deliveries that arrived on time
    const onTimeDeliveries = validDeliveries.filter(
      (item) => item.actual_delivery_date! <= item.estimated_delivery_date!,
    ).length;
    const onTimeRate =
      validDeliveries.length > 0
        ? (onTimeDeliveries / validDeliveries.length) * 100
        : 0;
    // Calculate failureRate: percentage of failed/cancelled deliveries
    const failedDeliveries = input.filter(
      (item) => item.status === "failed" || item.status === "cancelled",
    ).length;
    const failureRate =
      input.length > 0 ? (failedDeliveries / input.length) * 100 : 0;
    // Calculate carrierPerformance: placeholder value (would use carrier performance data)
    const carrierPerformance = 75;
    // Calculate totalShipments: total number of deliveries in this region
    const totalShipments = input.length;
    // Calculate averageCostPerShipment: based on package weight and dimensions
    const totalCost = input.reduce((sum, item) => {
      // Simplified cost calculation
      const weightCost = item.package_weight ? item.package_weight * 0.5 : 0;
      const dimCost = item.package_dimensions ? 2.0 : 0;
      return sum + weightCost + dimCost;
    }, 0);
    const averageCostPerShipment =
      input.length > 0 ? totalCost / input.length : 0;
    // For DTO.regionCode, use location from first item (assuming all have same region)
    const regionCode = input.length > 0 ? input[0].location || "" : "";
    return {
      regionCode,
      deliveryTime,
      onTimeRate,
      failureRate,
      carrierPerformance,
      totalShipments,
      averageCostPerShipment,
    };
  }
}
