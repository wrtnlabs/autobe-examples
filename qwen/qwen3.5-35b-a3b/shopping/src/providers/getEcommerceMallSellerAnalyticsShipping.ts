import { IEcommerceMallShippingAnalytic } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallShippingAnalytic";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { SellerPayload } from "../decorators/payload/SellerPayload";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function getEcommerceMallSellerAnalyticsShipping(props: {
  seller: SellerPayload;
}): Promise<IEcommerceMallShippingAnalytic> {
  const sellerId = props.seller.id;
  // Get total shipments count
  const totalShipments = await MyGlobal.prisma.ecommerce_mall_shipments.count({
    where: { seller_id: sellerId, deleted_at: null },
  });
  // Status breakdown not supported by Prisma schema - return zeros
  const created = 0;
  const inTransit = 0;
  const delivered = 0;
  const cancelled = 0;
  // Average delivery time not supported - field confirmed_delivery_at doesn't exist
  let averageDeliveryTimeDays: number | null = null;
  // Get carrier distribution
  const carrierDistributionRaw =
    await MyGlobal.prisma.ecommerce_mall_shipments.groupBy({
      by: ["carrier_name"],
      where: { seller_id: sellerId, deleted_at: null },
      _count: { id: true },
      orderBy: { _count: { id: "desc" } },
    });
  const carrierDistribution: IEcommerceMallShippingAnalytic.ICarrierDistribution[] =
    carrierDistributionRaw.map((row) => ({
      carrier: row.carrier_name,
      count: row._count.id as number & tags.Type<"int32"> & tags.Minimum<1>,
    }));
  // Calculate delivery success rate
  let deliverySuccessRate:
    | (number & tags.Minimum<0> & tags.Maximum<100>)
    | null = null;
  if (totalShipments > 0) {
    deliverySuccessRate = ((delivered / totalShipments) * 100) as
      | (number & tags.Minimum<0> & tags.Maximum<100>)
      | null;
  }
  // Total items shipped not supported - return 0
  const totalItemsShipped: number & tags.Type<"int32"> = 0;
  return {
    total_shipments: totalShipments as number & tags.Type<"int32">,
    status_breakdown: {
      created: created as number & tags.Type<"int32">,
      inTransit: inTransit as number & tags.Type<"int32">,
      delivered: delivered as number & tags.Type<"int32">,
      cancelled: cancelled as number & tags.Type<"int32">,
    } satisfies IEcommerceMallShippingAnalytic.IStatusBreakdown,
    carrier_distribution: carrierDistribution,
    average_delivery_time_days: averageDeliveryTimeDays,
    delivery_success_rate: deliverySuccessRate,
    total_items_shipped: totalItemsShipped,
  } satisfies IEcommerceMallShippingAnalytic;
}
