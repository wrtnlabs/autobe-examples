import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { IShoppingMallSellerEarningsStatistics } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSellerEarningsStatistics";
import { IShoppingMallSellerEarningsTimeSeriesDataPoint } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSellerEarningsTimeSeriesDataPoint";
import { IShoppingMallSellerEarningsSummary } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSellerEarningsSummary";
import { AdminPayload } from "../decorators/payload/AdminPayload";

export async function patchShoppingMallAdminStatisticsSellerEarnings(props: {
  admin: AdminPayload;
  body: IShoppingMallSellerEarningsStatistics.IRequest;
}): Promise<IShoppingMallSellerEarningsStatistics> {
  const {
    start_date,
    end_date,
    seller_ids,
    payout_status,
    aggregation_level = "monthly",
    include_top_sellers = false,
    top_sellers_limit = 10,
    minimum_transaction_count,
  } = props.body;

  const buildDateFilter = () => {
    if (!start_date && !end_date) return undefined;
    return {
      ...(start_date && { gte: start_date }),
      ...(end_date && { lt: end_date }),
    };
  };

  const dateFilter = buildDateFilter();

  const [commissions, allPayouts] = await Promise.all([
    MyGlobal.prisma.shopping_mall_platform_commissions.findMany({
      where: {
        ...(dateFilter && { created_at: dateFilter }),
        ...(seller_ids &&
          seller_ids.length > 0 && {
            shopping_mall_seller_id: { in: seller_ids },
          }),
      },
    }),
    MyGlobal.prisma.shopping_mall_seller_payouts.findMany({
      where: {
        ...(dateFilter && { created_at: dateFilter }),
        ...(seller_ids &&
          seller_ids.length > 0 && {
            shopping_mall_seller_id: { in: seller_ids },
          }),
        ...(payout_status && { status: payout_status }),
      },
    }),
  ]);

  const totalPlatformCommissions = commissions.reduce(
    (sum, c) => sum + Number(c.commission_amount),
    0,
  );

  const totalGrossRevenue = commissions.reduce(
    (sum, c) => sum + Number(c.order_subtotal),
    0,
  );

  const totalNetRevenue = totalGrossRevenue - totalPlatformCommissions;

  const completedPayouts = allPayouts.filter((p) => p.status === "completed");
  const pendingPayouts = allPayouts.filter(
    (p) => p.status === "pending" || p.status === "processing",
  );

  const totalPayoutsCompleted = completedPayouts.reduce(
    (sum, p) => sum + Number(p.net_payout_amount),
    0,
  );
  const totalPayoutsPending = pendingPayouts.reduce(
    (sum, p) => sum + Number(p.net_payout_amount),
    0,
  );

  const payoutCountCompleted = completedPayouts.length;
  const payoutCountPending = pendingPayouts.length;

  const averagePayoutAmount =
    payoutCountCompleted > 0 ? totalPayoutsCompleted / payoutCountCompleted : 0;

  const averageCommissionRate =
    totalGrossRevenue > 0
      ? (totalPlatformCommissions / totalGrossRevenue) * 100
      : 0;

  const uniqueSellerIds = new Set<string>();
  commissions.forEach((c) => {
    uniqueSellerIds.add(c.shopping_mall_seller_id);
  });
  const sellerCount = uniqueSellerIds.size;

  const buildTimePeriods = (): Array<{
    period_start: string & tags.Format<"date-time">;
    period_end: string & tags.Format<"date-time">;
  }> => {
    const periods: Array<{
      period_start: string & tags.Format<"date-time">;
      period_end: string & tags.Format<"date-time">;
    }> = [];

    if (commissions.length === 0) return periods;

    const now = new Date();
    const defaultStart = new Date(now.getFullYear(), now.getMonth() - 6, 1);
    const startTimestamp = start_date
      ? new Date(start_date).getTime()
      : defaultStart.getTime();
    const endTimestamp = end_date
      ? new Date(end_date).getTime()
      : now.getTime();

    let currentStart = new Date(startTimestamp);

    while (currentStart.getTime() < endTimestamp) {
      let currentEnd: Date;

      if (aggregation_level === "daily") {
        currentEnd = new Date(currentStart);
        currentEnd.setDate(currentEnd.getDate() + 1);
      } else if (aggregation_level === "weekly") {
        currentEnd = new Date(currentStart);
        currentEnd.setDate(currentEnd.getDate() + 7);
      } else if (aggregation_level === "monthly") {
        currentEnd = new Date(currentStart);
        currentEnd.setMonth(currentEnd.getMonth() + 1);
      } else {
        currentEnd = new Date(currentStart);
        currentEnd.setFullYear(currentEnd.getFullYear() + 1);
      }

      if (currentEnd.getTime() > endTimestamp) {
        currentEnd = new Date(endTimestamp);
      }

      periods.push({
        period_start: currentStart.toISOString() as string &
          tags.Format<"date-time">,
        period_end: currentEnd.toISOString() as string &
          tags.Format<"date-time">,
      });

      currentStart = currentEnd;
    }

    return periods;
  };

  const timePeriods = buildTimePeriods();

  const timeSeriesData: IShoppingMallSellerEarningsTimeSeriesDataPoint[] =
    timePeriods.map((period) => {
      const periodStartTime = new Date(period.period_start).getTime();
      const periodEndTime = new Date(period.period_end).getTime();

      const periodCommissions = commissions.filter((c) => {
        const cTime = new Date(c.created_at).getTime();
        return cTime >= periodStartTime && cTime < periodEndTime;
      });

      const periodPayouts = allPayouts.filter((p) => {
        const pTime = new Date(p.created_at).getTime();
        return (
          pTime >= periodStartTime &&
          pTime < periodEndTime &&
          p.status === "completed"
        );
      });

      const grossEarnings = periodCommissions.reduce(
        (sum, c) => sum + Number(c.order_subtotal),
        0,
      );

      const platformCommission = periodCommissions.reduce(
        (sum, c) => sum + Number(c.commission_amount),
        0,
      );

      const netEarnings = grossEarnings - platformCommission;

      const payoutAmount = periodPayouts.reduce(
        (sum, p) => sum + Number(p.net_payout_amount),
        0,
      );

      const transactionCount = periodCommissions.length;

      const periodSellerIds = new Set<string>();
      periodCommissions.forEach((c) => {
        periodSellerIds.add(c.shopping_mall_seller_id);
      });
      const activeSellerCount = periodSellerIds.size;

      return {
        period_start: period.period_start,
        period_end: period.period_end,
        gross_earnings: grossEarnings,
        net_earnings: netEarnings,
        platform_commission: platformCommission,
        payout_amount: payoutAmount,
        transaction_count: transactionCount,
        active_seller_count: activeSellerCount,
      };
    });

  let topEarningSellers: IShoppingMallSellerEarningsSummary[] | undefined =
    undefined;

  if (include_top_sellers) {
    const sellerEarningsMap = new Map<
      string,
      {
        seller_id: string;
        gross_revenue: number;
        platform_commissions: number;
        transaction_count: number;
      }
    >();

    for (const comm of commissions) {
      const sellerId = comm.shopping_mall_seller_id;
      const existing = sellerEarningsMap.get(sellerId) || {
        seller_id: sellerId,
        gross_revenue: 0,
        platform_commissions: 0,
        transaction_count: 0,
      };
      existing.gross_revenue += Number(comm.order_subtotal);
      existing.platform_commissions += Number(comm.commission_amount);
      existing.transaction_count += 1;
      sellerEarningsMap.set(sellerId, existing);
    }

    const sellerEarningsArray = Array.from(sellerEarningsMap.values())
      .filter((s) =>
        minimum_transaction_count
          ? s.transaction_count >= minimum_transaction_count
          : true,
      )
      .sort((a, b) => b.gross_revenue - a.gross_revenue)
      .slice(0, top_sellers_limit);

    const sellerDetailsMap = new Map<string, { name: string }>();
    const sellerIdsToFetch = sellerEarningsArray.map((s) => s.seller_id);
    if (sellerIdsToFetch.length > 0) {
      const sellers = await MyGlobal.prisma.shopping_mall_sellers.findMany({
        where: { id: { in: sellerIdsToFetch } },
        select: { id: true, store_name: true },
      });
      sellers.forEach((seller) => {
        sellerDetailsMap.set(seller.id, { name: seller.store_name });
      });
    }

    topEarningSellers = sellerEarningsArray.map((s) => {
      const sellerDetails = sellerDetailsMap.get(s.seller_id);
      const netRevenue = s.gross_revenue - s.platform_commissions;
      const avgTransactionValue =
        s.transaction_count > 0 ? s.gross_revenue / s.transaction_count : 0;

      return {
        seller_id: s.seller_id as string & tags.Format<"uuid">,
        seller_name: sellerDetails?.name || "Unknown Seller",
        gross_revenue: s.gross_revenue,
        net_revenue: netRevenue,
        platform_commissions: s.platform_commissions,
        transaction_count: s.transaction_count,
        average_transaction_value: avgTransactionValue,
      };
    });
  }

  return {
    total_gross_revenue: totalGrossRevenue,
    total_net_revenue: totalNetRevenue,
    total_platform_commissions: totalPlatformCommissions,
    total_payouts_completed: totalPayoutsCompleted,
    total_payouts_pending: totalPayoutsPending,
    average_payout_amount: averagePayoutAmount,
    payout_count_completed: payoutCountCompleted,
    payout_count_pending: payoutCountPending,
    average_commission_rate: averageCommissionRate,
    seller_count: sellerCount,
    time_series_data: timeSeriesData,
    top_earning_sellers: topEarningSellers,
  };
}
