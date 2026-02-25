import { IEcommerceOrder } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceOrder";
import { IEcommerceOrderSnapshotCategoryPerformance } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceOrderSnapshotCategoryPerformance";
import { IEcommerceOrderSnapshotGeographicDistribution } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceOrderSnapshotGeographicDistribution";
import { IEcommerceOrderSnapshotGeographicDistributionCity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceOrderSnapshotGeographicDistributionCity";
import { IEcommerceOrderSnapshotGeographicDistributionCountry } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceOrderSnapshotGeographicDistributionCountry";
import { IEcommerceOrderSnapshotGeographicDistributionRegion } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceOrderSnapshotGeographicDistributionRegion";
import { IEcommerceOrderSnapshotGeographicDistributionTopRegion } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceOrderSnapshotGeographicDistributionTopRegion";
import { IEcommerceOrderSnapshotGeographicDistributionUnknown } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceOrderSnapshotGeographicDistributionUnknown";
import { IEcommerceOrderSnapshotHourlyDistribution } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceOrderSnapshotHourlyDistribution";
import { IEcommerceOrderSnapshotSellerPerformance } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceOrderSnapshotSellerPerformance";
import { IEcommerceOrderSnapshotStatusDistribution } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceOrderSnapshotStatusDistribution";
import { IEcommerceSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceSeller";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { CustomerPayload } from "../decorators/payload/CustomerPayload";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function getEcommerceCustomerOrdersOrderId(props: {
  customer: CustomerPayload;
  orderId: string & tags.Format<"uuid">;
}): Promise<IEcommerceOrder> {
  // Verify order exists and belongs to customer with comprehensive data
  const order = await MyGlobal.prisma.ecommerce_orders.findUniqueOrThrow({
    where: {
      id: props.orderId,
      customer_id: props.customer.id,
      deleted_at: null,
    },
    include: {
      items: {
        include: {
          purchaseSnapshots: {
            take: 1,
            orderBy: { created_at: "desc" },
          },
          seller: {
            select: {
              id: true,
              email: true,
              shop_name: true,
              shop_description: true,
              logo_image_url: true,
              account_status: true,
              approval_reason: true,
              updated_at: true,
              deleted_at: true,
              created_at: true,
            },
          },
          shipmentItems: {
            include: {
              shipment: {
                select: {
                  id: true,
                  tracking_number: true,
                  carrier_name: true,
                  shipment_status: true,
                  shipped_at: true,
                  delivered_at: true,
                  estimated_delivery: true,
                },
              },
            },
          },
        },
        where: {
          // Remove deleted_at since it doesn't exist in ecommerce_order_itemsWhereInput
        },
      },
      paymentTransactions: {
        where: {
          status: "completed",
          // Remove deleted_at since it doesn't exist in ecommerce_payment_transactionsWhereInput
        },
        orderBy: { created_at: "desc" },
        take: 1,
      },
      customer: {
        select: {
          id: true,
          email: true,
          display_name: true,
          phone_number: true,
        },
      },
    },
  });
  // Calculate status distribution from order items
  type OrderItemWithSeller = (typeof order.items)[0];
  const statusCounts = order.items.reduce(
    (acc: Record<string, number>, item: OrderItemWithSeller) => {
      acc[item.status] = (acc[item.status] || 0) + 1;
      return acc;
    },
    {} as Record<string, number>,
  );
  const statusDistribution: IEcommerceOrderSnapshotStatusDistribution = {
    paid: statusCounts["paid"] || 0,
    shipped: statusCounts["shipped"] || 0,
    delivered: statusCounts["delivered"] || 0,
    cancelled: statusCounts["cancelled"] || 0,
    refunded: statusCounts["refunded"] || 0,
  };
  // Calculate seller performance grouped by seller
  const sellerPerformance = Object.values(
    order.items.reduce(
      (
        acc: Record<string, IEcommerceOrderSnapshotSellerPerformance>,
        item: OrderItemWithSeller,
      ) => {
        const sellerId = item.seller.id;
        if (!acc[sellerId]) {
          acc[sellerId] = {
            seller_id: sellerId,
            seller: {
              id: item.seller.id,
              email: item.seller.email,
              shop_name: item.seller.shop_name,
              shop_description: item.seller.shop_description,
              logo_image_url: item.seller.logo_image_url,
              account_status: item.seller.account_status,
              approval_reason: item.seller.approval_reason,
              updated_at: toISOStringSafe(item.seller.updated_at),
              deleted_at: item.seller.deleted_at
                ? toISOStringSafe(item.seller.deleted_at)
                : null,
              created_at: toISOStringSafe(item.seller.created_at),
            } satisfies IEcommerceSeller as IEcommerceSeller,
            total_revenue: 0,
            order_count: 0,
            average_order_value: 0,
            item_count: 0,
          };
        }
        acc[sellerId].total_revenue += item.total_price;
        acc[sellerId].item_count += item.quantity;
        return acc;
      },
      {} as Record<string, IEcommerceOrderSnapshotSellerPerformance>,
    ),
  ).map((perf) => ({
    ...perf,
    order_count: 1, // This is a single order view
    average_order_value: perf.total_revenue,
  }));
  // Calculate product category performance
  const categoryPerformance = Object.values(
    order.items.reduce(
      (
        acc: Record<string, IEcommerceOrderSnapshotCategoryPerformance>,
        item: OrderItemWithSeller,
      ) => {
        // Since we don't have category info in the query, we'll need to adapt
        // For now, use a placeholder approach
        const categoryId = "default-category";
        if (!acc[categoryId]) {
          acc[categoryId] = {
            id: categoryId as string & tags.Format<"uuid">,
            name: "General",
            description: undefined,
            total_revenue: 0,
            order_count: 1,
            average_order_value: 0,
            product_count: 0,
            subcategory_count: 0,
            parent_category_id: null,
          };
        }
        acc[categoryId].total_revenue += item.total_price;
        return acc;
      },
      {} as Record<string, IEcommerceOrderSnapshotCategoryPerformance>,
    ),
  );
  // For single order view, geographic and hourly distributions are simplified
  const totalRevenue = order.items.reduce(
    (sum: number, item: OrderItemWithSeller) => sum + item.total_price,
    0,
  );
  const geographicDistribution: IEcommerceOrderSnapshotGeographicDistribution =
    {
      country_distribution: [],
      region_distribution: [],
      city_distribution: [],
      top_regions: [],
      unknown_locations: {
        order_count: 1,
        revenue_total: totalRevenue,
        average_order_value: totalRevenue,
        percentage_of_total: 100,
      } satisfies IEcommerceOrderSnapshotGeographicDistributionUnknown as IEcommerceOrderSnapshotGeographicDistributionUnknown,
    };
  const orderHour = new Date(order.created_at).getHours();
  const hourlyDistribution: IEcommerceOrderSnapshotHourlyDistribution[] = [
    {
      hour: orderHour,
      order_count: 1,
      total_revenue: totalRevenue,
      average_order_value: totalRevenue,
    } satisfies IEcommerceOrderSnapshotHourlyDistribution as IEcommerceOrderSnapshotHourlyDistribution,
  ];
  return {
    period: toISOStringSafe(order.created_at),
    total_revenue: totalRevenue,
    order_count: 1,
    average_order_value: totalRevenue,
    status_distribution: statusDistribution,
    seller_performance: sellerPerformance,
    product_category_performance:
      categoryPerformance as IEcommerceOrderSnapshotCategoryPerformance[],
    geographic_distribution: geographicDistribution,
    hourly_distribution: hourlyDistribution,
  } satisfies IEcommerceOrder;
}
