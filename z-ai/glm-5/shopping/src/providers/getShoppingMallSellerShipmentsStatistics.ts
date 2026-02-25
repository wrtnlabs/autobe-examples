import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { IShoppingMallOrderShipment } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrderShipment";
import { IShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSeller";
import { IShoppingMallShipmentStatistic } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallShipmentStatistic";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { SellerPayload } from "../decorators/payload/SellerPayload";
import { ShoppingMallOrderShipmentAtSummaryTransformer } from "../transformers/ShoppingMallOrderShipmentAtSummaryTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function getShoppingMallSellerShipmentsStatistics(props: {
  seller: SellerPayload;
}): Promise<IShoppingMallShipmentStatistic> {
  const sellerId = props.seller.id;
  // Total shipments count
  const totalShipments =
    await MyGlobal.prisma.shopping_mall_order_shipments.count({
      where: {
        shopping_mall_seller_id: sellerId,
        deleted_at: null,
      },
    });
  // Pending deliveries (shipped but not delivered)
  const pendingDeliveries =
    await MyGlobal.prisma.shopping_mall_order_shipments.count({
      where: {
        shopping_mall_seller_id: sellerId,
        delivered_at: null,
        deleted_at: null,
      },
    });
  // Delivered count
  const deliveredCount =
    await MyGlobal.prisma.shopping_mall_order_shipments.count({
      where: {
        shopping_mall_seller_id: sellerId,
        delivered_at: { not: null },
        deleted_at: null,
      },
    });
  // Average delivery time calculation (in hours)
  const deliveredShipments =
    await MyGlobal.prisma.shopping_mall_order_shipments.findMany({
      where: {
        shopping_mall_seller_id: sellerId,
        delivered_at: { not: null },
        deleted_at: null,
      },
      select: {
        shipped_at: true,
        delivered_at: true,
      },
    });
  let averageDeliveryTime: number | null = null;
  if (deliveredShipments.length > 0) {
    const totalHours = deliveredShipments.reduce((sum, shipment) => {
      const diffMs =
        shipment.delivered_at!.getTime() - shipment.shipped_at.getTime();
      const hours = diffMs / (1000 * 60 * 60);
      return sum + hours;
    }, 0);
    averageDeliveryTime = totalHours / deliveredShipments.length;
  }
  // Carrier breakdown using groupBy
  const carrierGroups =
    await MyGlobal.prisma.shopping_mall_order_shipments.groupBy({
      by: ["carrier_name"],
      where: {
        shopping_mall_seller_id: sellerId,
        deleted_at: null,
      },
      _count: {
        carrier_name: true,
      },
    });
  const carrierBreakdownRecord: Record<string, number> = {};
  for (const group of carrierGroups) {
    carrierBreakdownRecord[group.carrier_name] = group._count.carrier_name;
  }
  // Pagination defaults
  const page = 1;
  const limit = 100;
  // Paginated shipment list
  const shipments =
    await MyGlobal.prisma.shopping_mall_order_shipments.findMany({
      where: {
        shopping_mall_seller_id: sellerId,
        deleted_at: null,
      },
      ...ShoppingMallOrderShipmentAtSummaryTransformer.select(),
      skip: (page - 1) * limit,
      take: limit,
      orderBy: { shipped_at: "desc" },
    });
  const data = await ArrayUtil.asyncMap(
    shipments,
    ShoppingMallOrderShipmentAtSummaryTransformer.transform,
  );
  return {
    totalShipments: totalShipments as number &
      tags.Type<"int32"> &
      tags.Minimum<0>,
    pendingDeliveries: pendingDeliveries as number &
      tags.Type<"int32"> &
      tags.Minimum<0>,
    deliveredCount: deliveredCount as number &
      tags.Type<"int32"> &
      tags.Minimum<0>,
    averageDeliveryTime,
    statusBreakdown: {
      shipped: pendingDeliveries as number &
        tags.Type<"int32"> &
        tags.Minimum<0>,
      delivered: deliveredCount as number &
        tags.Type<"int32"> &
        tags.Minimum<0>,
    },
    carrierBreakdown:
      Object.keys(carrierBreakdownRecord).length > 0
        ? JSON.stringify(carrierBreakdownRecord)
        : null,
    pagination: {
      current: page as number & tags.Type<"int32"> & tags.Minimum<0>,
      limit: limit as number & tags.Type<"int32"> & tags.Minimum<0>,
      records: totalShipments as number & tags.Type<"int32"> & tags.Minimum<0>,
      pages: Math.ceil(totalShipments / limit) as number &
        tags.Type<"int32"> &
        tags.Minimum<0>,
    } satisfies IPage.IPagination,
    data,
  };
}
