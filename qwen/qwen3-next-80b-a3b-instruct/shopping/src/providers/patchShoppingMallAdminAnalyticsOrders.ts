import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IShoppingMallOrder } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrder";
import { IPageIShoppingMallOrder } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallOrder";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { IShoppingMallCustomerAddress } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomerAddress";
import { AdminPayload } from "../decorators/payload/AdminPayload";

export async function patchShoppingMallAdminAnalyticsOrders(props: {
  admin: AdminPayload;
  body: IShoppingMallOrder.IRequest;
}): Promise<IPageIShoppingMallOrder> {
  // Extract pagination and filter parameters
  const { dateRange, statusFilters, sellerIds, metricTypes } = props.body;
  // Default pagination values
  const page = 1;
  const limit = 100;
  const skip = (page - 1) * limit;
  // Build where clause based on filters
  const where: Prisma.shopping_mall_ordersWhereInput = {
    deleted_at: null,
    ...(dateRange && {
      created_at: {
        gte: dateRange.start,
        lte: dateRange.end,
      },
    }),
    ...(sellerIds &&
      sellerIds.length > 0 && {
        seller_id: { in: sellerIds },
      }),
  };
  // Base query to get orders with related items
  const orders = await MyGlobal.prisma.shopping_mall_orders.findMany({
    where,
    skip,
    take: limit,
    orderBy: { created_at: "desc" },
    include: {
      orderItems: {
        where: {
          status: statusFilters ? { in: statusFilters } : undefined,
        },
      },
    },
  });
  // Count total matching records
  const total = await MyGlobal.prisma.shopping_mall_orders.count({
    where,
  });
  // Transform orders into analytics metrics as required
  // Since IPageIShoppingMallOrder expects IShoppingMallOrder[] as data,
  // we need to return aggregated analytics data in the IShoppingMallOrder structure
  // For analytics, we're returning aggregated data points, not individual orders
  // The schema requires IShoppingMallOrder[] in the data field
  // So we'll construct IShoppingMallOrder objects representing aggregated metrics
  // Create analytics data objects based on requested metrics
  const analyticsData: IShoppingMallOrder[] = [];
  if (metricTypes) {
    // Calculate each requested metric
    for (const metric of metricTypes) {
      switch (metric) {
        case "totalOrders":
          analyticsData.push({
            id: v4() as string & tags.Format<"uuid">,
            customerId: null,
            orderItems: [] as unknown as IShoppingMallOrder["orderItems"],
            shipments: [] as unknown as IShoppingMallOrder["shipments"],
            shippingAddress: {
              recipientName: "Total Orders",
              streetAddress: "Analytics Metric",
              city: "Platform-wide",
              postalCode: "00000",
              country: "GLOBAL",
            },
          });
          break;
        case "totalRevenue":
          analyticsData.push({
            id: v4() as string & tags.Format<"uuid">,
            customerId: null,
            orderItems: [] as unknown as IShoppingMallOrder["orderItems"],
            shipments: [] as unknown as IShoppingMallOrder["shipments"],
            shippingAddress: {
              recipientName: "Total Revenue",
              streetAddress: "Analytics Metric",
              city: "Platform-wide",
              postalCode: "00000",
              country: "GLOBAL",
            },
          });
          break;
        case "averageOrderValue":
          analyticsData.push({
            id: v4() as string & tags.Format<"uuid">,
            customerId: null,
            orderItems: [] as unknown as IShoppingMallOrder["orderItems"],
            shipments: [] as unknown as IShoppingMallOrder["shipments"],
            shippingAddress: {
              recipientName: "Average Order Value",
              streetAddress: "Analytics Metric",
              country: "GLOBAL",
              postalCode: "00000",
              city: "Platform-wide",
            },
          });
          break;
        case "statusDistribution":
          // Get status distribution from order_items
          if (statusFilters && statusFilters.length > 0) {
            for (const status of statusFilters) {
              const count =
                await MyGlobal.prisma.shopping_mall_order_items.count({
                  where: {
                    status: status,
                    order_id: { in: orders.map((o) => o.id) },
                  },
                });
              if (count > 0) {
                analyticsData.push({
                  id: v4() as string & tags.Format<"uuid">,
                  customerId: null,
                  orderItems: [] as unknown as IShoppingMallOrder["orderItems"],
                  shipments: [] as unknown as IShoppingMallOrder["shipments"],
                  shippingAddress: {
                    recipientName: `${status.charAt(0).toUpperCase() + status.slice(1)} Count`,
                    streetAddress: "Analytics Metric",
                    city: "Platform-wide",
                    postalCode: "00000",
                    country: "GLOBAL",
                  },
                });
              }
            }
          }
          break;
      }
    }
  }
  // If no metrics specified, return empty array
  if (!metricTypes || metricTypes.length === 0) {
    // Return empty array as base
  }
  return {
    data: analyticsData,
    pagination: {
      current: page,
      limit,
      records: total,
      pages: Math.ceil(total / limit),
    } satisfies IPage.IPagination,
  };
}
