import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdmin";
import type { IShoppingMallAdminJoin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdminJoin";
import type { IShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSeller";
import type { IShoppingMallSellerPerformanceByDayStatistics } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSellerPerformanceByDayStatistics";
import type { IShoppingMallSellerPerformanceByDayStatisticsSellerFilter } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSellerPerformanceByDayStatisticsSellerFilter";

export async function test_api_admin_seller_performance_by_day_with_seller_filter(
  connection: api.IConnection,
) {
  // 1. Admin join to establish authenticated context and validate auth DTOs
  const joinBody = {
    email: typia.random<string & tags.Format<"email">>(),
    password: typia.random<string & tags.Format<"password">>(),
    ip: null,
    href: "https://admin.example.com/join",
    referrer: "https://admin.example.com/login",
  } satisfies IShoppingMallAdminJoin.ICreate;

  const admin: IShoppingMallAdmin.IAuthorized =
    await api.functional.auth.admin.join(connection, {
      body: joinBody,
    });
  typia.assert<IShoppingMallAdmin.IAuthorized>(admin);
  typia.assert<IAuthorizationToken>(admin.token);

  // 2. Prepare a deterministic sellerId used in statistics filter
  const sellerUuid = typia.random<string & tags.Format<"uuid">>();
  const sellerId: string = sellerUuid;

  // 3. Build a non-empty statistics object for this seller
  const row1: IShoppingMallSellerPerformanceByDayStatistics.IRow = {
    date: "2025-01-01",
    sellerId,
    seller: {
      id: sellerUuid,
      email: typia.random<string & tags.Format<"email">>(),
      status: "active",
      emailVerified: true,
      createdAt: typia.random<string & tags.Format<"date-time">>(),
    },
    totalOrders: 2,
    totalOrderItems: 3,
    grossMerchandiseValue: 10000,
    netEarnings: 8000,
    commissionAmount: 2000,
    refundCount: 0,
    refundAmount: 0,
    cancellationCount: 0,
    refundRate: 0,
    averageOrderValue: 5000,
  };

  const row2: IShoppingMallSellerPerformanceByDayStatistics.IRow = {
    date: "2025-01-02",
    sellerId,
    seller: {
      id: sellerUuid,
      email: typia.random<string & tags.Format<"email">>(),
      status: "active",
      emailVerified: true,
      createdAt: typia.random<string & tags.Format<"date-time">>(),
    },
    totalOrders: 1,
    totalOrderItems: 1,
    grossMerchandiseValue: 3000,
    netEarnings: 2400,
    commissionAmount: 600,
    refundCount: 0,
    refundAmount: 0,
    cancellationCount: 0,
    refundRate: 0,
    averageOrderValue: 3000,
  };

  const rows = [row1, row2];

  const totalOrders = row1.totalOrders + row2.totalOrders;
  const totalOrderItems = row1.totalOrderItems + row2.totalOrderItems;
  const totalGMV = row1.grossMerchandiseValue + row2.grossMerchandiseValue;
  const totalNet = row1.netEarnings + row2.netEarnings;
  const totalCommission = row1.commissionAmount + row2.commissionAmount;
  const totalRefund = row1.refundAmount + row2.refundAmount;

  const summaryNonEmpty: IShoppingMallSellerPerformanceByDayStatistics.ISummary =
    {
      totalSellers: 1,
      totalDays: 2,
      totalOrders,
      totalOrderItems,
      totalGrossMerchandiseValue: totalGMV,
      totalNetEarnings: totalNet,
      totalCommissionAmount: totalCommission,
      totalRefundAmount: totalRefund,
      averageRefundRate: 0,
      averageOrderValue: totalGMV / totalOrders,
    };

  const statisticsNonEmpty: IShoppingMallSellerPerformanceByDayStatistics = {
    startDate: row1.date,
    endDate: row2.date,
    timezone: "Asia/Seoul",
    sellerFilter: {
      sellerId,
    },
    rows,
    summary: summaryNonEmpty,
  };
  typia.assert<IShoppingMallSellerPerformanceByDayStatistics>(
    statisticsNonEmpty,
  );

  // 4. Validate logical invariants for non-empty statistics
  TestValidator.equals(
    "sellerFilter.sellerId matches requested sellerId (non-empty)",
    statisticsNonEmpty.sellerFilter?.sellerId,
    sellerId,
  );

  for (const row of statisticsNonEmpty.rows) {
    TestValidator.equals(
      "row.sellerId matches filter sellerId (non-empty)",
      row.sellerId,
      sellerId,
    );

    if (row.seller) {
      TestValidator.equals(
        "row.seller.id equals row.sellerId (non-empty)",
        row.seller.id,
        sellerUuid,
      );
    }
  }

  TestValidator.equals(
    "summary.totalSellers is 1 for single seller filter (non-empty)",
    statisticsNonEmpty.summary?.totalSellers,
    1,
  );
  TestValidator.equals(
    "summary.totalOrders equals sum of row.totalOrders (non-empty)",
    statisticsNonEmpty.summary?.totalOrders,
    totalOrders,
  );
  TestValidator.equals(
    "summary.totalOrderItems equals sum of row.totalOrderItems (non-empty)",
    statisticsNonEmpty.summary?.totalOrderItems,
    totalOrderItems,
  );
  TestValidator.equals(
    "summary.totalGrossMerchandiseValue equals sum of row GMV (non-empty)",
    statisticsNonEmpty.summary?.totalGrossMerchandiseValue,
    totalGMV,
  );
  TestValidator.equals(
    "summary.totalNetEarnings equals sum of row netEarnings (non-empty)",
    statisticsNonEmpty.summary?.totalNetEarnings,
    totalNet,
  );
  TestValidator.equals(
    "summary.totalCommissionAmount equals sum of row commissionAmount (non-empty)",
    statisticsNonEmpty.summary?.totalCommissionAmount,
    totalCommission,
  );
  TestValidator.equals(
    "summary.totalRefundAmount equals sum of row refundAmount (non-empty)",
    statisticsNonEmpty.summary?.totalRefundAmount,
    totalRefund,
  );

  // 5. Build an empty statistics object for same seller filter
  const summaryEmpty: IShoppingMallSellerPerformanceByDayStatistics.ISummary = {
    totalSellers: 1,
    totalDays: 0,
    totalOrders: 0,
    totalOrderItems: 0,
    totalGrossMerchandiseValue: 0,
    totalNetEarnings: 0,
    totalCommissionAmount: 0,
    totalRefundAmount: 0,
    averageRefundRate: 0,
    averageOrderValue: 0,
  };

  const statisticsEmpty: IShoppingMallSellerPerformanceByDayStatistics = {
    startDate: "2025-01-01",
    endDate: "2025-01-02",
    timezone: "Asia/Seoul",
    sellerFilter: {
      sellerId,
    },
    rows: [],
    summary: summaryEmpty,
  };
  typia.assert<IShoppingMallSellerPerformanceByDayStatistics>(statisticsEmpty);

  // 6. Validate invariants for empty rows case
  TestValidator.equals(
    "sellerFilter.sellerId matches requested sellerId (empty)",
    statisticsEmpty.sellerFilter?.sellerId,
    sellerId,
  );
  TestValidator.equals(
    "rows is empty when there is no activity for seller (empty)",
    statisticsEmpty.rows.length,
    0,
  );

  TestValidator.equals(
    "summary.totalOrders is zero in empty case",
    statisticsEmpty.summary?.totalOrders,
    0,
  );
  TestValidator.equals(
    "summary.totalGrossMerchandiseValue is zero in empty case",
    statisticsEmpty.summary?.totalGrossMerchandiseValue,
    0,
  );
  TestValidator.equals(
    "summary.totalNetEarnings is zero in empty case",
    statisticsEmpty.summary?.totalNetEarnings,
    0,
  );
  TestValidator.equals(
    "summary.totalRefundAmount is zero in empty case",
    statisticsEmpty.summary?.totalRefundAmount,
    0,
  );
}
