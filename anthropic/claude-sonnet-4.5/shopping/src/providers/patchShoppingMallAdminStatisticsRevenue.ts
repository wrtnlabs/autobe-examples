import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { IShoppingMallRevenueStatistics } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallRevenueStatistics";
import { AdminPayload } from "../decorators/payload/AdminPayload";

export async function patchShoppingMallAdminStatisticsRevenue(props: {
  admin: AdminPayload;
  body: IShoppingMallRevenueStatistics.IRequest;
}): Promise<IShoppingMallRevenueStatistics> {
  const startDateTimeString = `${props.body.start_date}T00:00:00.000Z`;
  const endDateTimeString = `${props.body.end_date}T23:59:59.999Z`;

  let categoryOrderIds: string[] | undefined;
  if (props.body.category_id) {
    const salesInCategory = await MyGlobal.prisma.shopping_mall_sales.findMany({
      where: {
        shopping_mall_category_id: props.body.category_id,
      },
      select: { id: true },
    });
    const saleIds = salesInCategory.map((sale) => sale.id);
    const saleSkusInCategory =
      await MyGlobal.prisma.shopping_mall_sale_skus.findMany({
        where: {
          shopping_mall_sale_id: { in: saleIds },
        },
        select: { id: true },
      });
    const skuIds = saleSkusInCategory.map((sku) => sku.id);
    const orderItemsInCategory =
      await MyGlobal.prisma.shopping_mall_order_items.findMany({
        where: {
          shopping_mall_sale_sku_id: { in: skuIds },
        },
        select: { shopping_mall_order_id: true },
      });
    categoryOrderIds = [
      ...new Set(
        orderItemsInCategory.map((item) => item.shopping_mall_order_id),
      ),
    ];
  }

  const orders = await MyGlobal.prisma.shopping_mall_orders.findMany({
    where: {
      created_at: {
        gte: startDateTimeString,
        lte: endDateTimeString,
      },
      deleted_at: null,
      ...(props.body.seller_id && {
        shopping_mall_order_sellers: {
          some: {
            shopping_mall_seller_id: props.body.seller_id,
          },
        },
      }),
      ...(categoryOrderIds && {
        id: { in: categoryOrderIds },
      }),
    },
    select: {
      id: true,
      total_amount: true,
      created_at: true,
    },
  });

  const orderIds = orders.map((order) => order.id);

  const [paymentTransactions, commissions, payouts, refunds] =
    await Promise.all([
      MyGlobal.prisma.shopping_mall_payment_transactions.findMany({
        where: {
          shopping_mall_order_id: { in: orderIds },
        },
        select: {
          id: true,
        },
      }),
      MyGlobal.prisma.shopping_mall_platform_commissions.findMany({
        where: {
          shopping_mall_order_id: { in: orderIds },
        },
        select: {
          commission_amount: true,
        },
      }),
      MyGlobal.prisma.shopping_mall_seller_payouts.findMany({
        where: {
          created_at: {
            gte: startDateTimeString,
            lte: endDateTimeString,
          },
        },
        select: {
          net_payout_amount: true,
        },
      }),
      MyGlobal.prisma.shopping_mall_refund_transactions.findMany({
        where: {
          shopping_mall_order_id: { in: orderIds },
        },
        select: {
          refund_amount: true,
        },
      }),
    ]);

  const totalGrossRevenue = orders.reduce(
    (sum, order) => sum + Number(order.total_amount),
    0,
  );
  const totalRefundAmount = refunds.reduce(
    (sum, refund) => sum + Number(refund.refund_amount),
    0,
  );
  const totalNetRevenue = Math.max(0, totalGrossRevenue - totalRefundAmount);
  const totalPlatformCommission = commissions.reduce(
    (sum, commission) => sum + Number(commission.commission_amount),
    0,
  );
  const totalSellerPayouts = payouts.reduce(
    (sum, payout) => sum + Number(payout.net_payout_amount),
    0,
  );
  const totalOrderCount = orders.length;
  const totalTransactionCount = paymentTransactions.length;
  const averageOrderValue =
    totalOrderCount > 0 ? totalGrossRevenue / totalOrderCount : 0;

  const startDateMs = new Date(props.body.start_date).getTime();
  const endDateMs = new Date(props.body.end_date).getTime();
  const periodDurationMs = endDateMs - startDateMs;
  const previousPeriodStartMs = startDateMs - periodDurationMs - 86400000;
  const previousPeriodEndMs = startDateMs - 86400000;

  const previousPeriodStartString = new Date(previousPeriodStartMs)
    .toISOString()
    .split("T")[0];
  const previousPeriodEndString = new Date(previousPeriodEndMs)
    .toISOString()
    .split("T")[0];

  const previousPeriodStartDateTime = `${previousPeriodStartString}T00:00:00.000Z`;
  const previousPeriodEndDateTime = `${previousPeriodEndString}T23:59:59.999Z`;

  const previousOrders = await MyGlobal.prisma.shopping_mall_orders.findMany({
    where: {
      created_at: {
        gte: previousPeriodStartDateTime,
        lte: previousPeriodEndDateTime,
      },
      deleted_at: null,
    },
    select: {
      total_amount: true,
    },
  });

  const previousGrossRevenue = previousOrders.reduce(
    (sum, order) => sum + Number(order.total_amount),
    0,
  );
  const growthRatePercentage =
    previousGrossRevenue > 0
      ? ((totalGrossRevenue - previousGrossRevenue) / previousGrossRevenue) *
        100
      : null;

  return {
    total_gross_revenue: totalGrossRevenue,
    total_net_revenue: totalNetRevenue,
    total_platform_commission: totalPlatformCommission,
    total_seller_payouts: totalSellerPayouts,
    total_refund_amount: totalRefundAmount,
    total_order_count: totalOrderCount,
    total_transaction_count: totalTransactionCount,
    average_order_value: averageOrderValue,
    growth_rate_percentage: growthRatePercentage,
    period_start_date: startDateTimeString,
    period_end_date: endDateTimeString,
  };
}
