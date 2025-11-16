import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEShoppingMallSellerPayoutStatus } from "@ORGANIZATION/PROJECT-api/lib/structures/IEShoppingMallSellerPayoutStatus";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIShoppingMallSellerPayoutStatementRow } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallSellerPayoutStatementRow";
import type { IShoppingMallBrand } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallBrand";
import type { IShoppingMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomer";
import type { IShoppingMallOrder } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrder";
import type { IShoppingMallOrderLine } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrderLine";
import type { IShoppingMallOrderLineThumbnail } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrderLineThumbnail";
import type { IShoppingMallOrderSellerSegment } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrderSellerSegment";
import type { IShoppingMallPayoutStatementSort } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallPayoutStatementSort";
import type { IShoppingMallPlatformAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallPlatformAdmin";
import type { IShoppingMallPlatformAdminJoin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallPlatformAdminJoin";
import type { IShoppingMallPlatformAdminLogin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallPlatformAdminLogin";
import type { IShoppingMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProduct";
import type { IShoppingMallProductSku } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductSku";
import type { IShoppingMallReportDateRange } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallReportDateRange";
import type { IShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSeller";
import type { IShoppingMallSellerJoin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSellerJoin";
import type { IShoppingMallSellerLogin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSellerLogin";
import type { IShoppingMallSellerPayout } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSellerPayout";
import type { IShoppingMallSellerPayoutItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSellerPayoutItem";
import type { IShoppingMallSellerPayoutStatementReport } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSellerPayoutStatementReport";
import type { IShoppingMallSellerPayoutStatementRow } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSellerPayoutStatementRow";

/**
 * Validate filtering and pagination of the seller payout statement report.
 *
 * Business scenario:
 *
 * - A platform admin creates payout batches and payout items for a seller across
 *   different dates, currencies, and payout statuses.
 * - The seller then queries the seller payout statement endpoint with various
 *   filters and pagination parameters.
 *
 * Steps:
 *
 * 1. Register and authenticate a platform admin.
 * 2. Register a seller (which also authenticates as that seller by join).
 * 3. Switch to platform admin and create multiple seller payout batches for the
 *    seller with varying statuses, currencies, and settlement periods.
 * 4. For each payout, create at least one payout item so that statement rows
 *    exist.
 * 5. Switch to seller and call the seller payout statement endpoint with:
 *
 *    - A narrow dateRange covering only some settlements.
 *    - A single currency filter.
 *    - Pagination parameters (page/limit). Validate that:
 *
 *         - All rows belong to the authenticated seller.
 *         - All rows use the requested currency.
 *         - All settlement periods fall within the requested dateRange.
 *         - Pagination metadata is consistent with the data length.
 * 6. Call again with payoutStatusFilters limited to ["completed", "failed"] and
 *    validate that only those statuses appear.
 * 7. Perform two paginated calls (page 1 and page 2) and verify that:
 *
 *    - `pagination.current` reflects zero-based indexing.
 *    - There is no overlap between page 1 and page 2 rows.
 *    - Combined ids are unique across pages.
 * 8. Call with an explicit sort configuration using field "payoutCreatedAt" and
 *    direction "desc" and validate that the settlement_period_start values are
 *    in non-increasing order as a proxy for payout creation time ordering.
 */
export async function test_api_seller_payout_statement_filters_and_pagination(
  connection: api.IConnection,
) {
  // 1. Register platform admin (also authenticates as platformAdmin)
  const platformAdminEmail: string = typia.random<
    string & tags.Format<"email">
  >();
  const platformAdminJoinBody = {
    email: platformAdminEmail,
    name: RandomGenerator.name(),
    password: "AdminPass123!",
    ip: null,
    href: "https://admin.example.com/join",
    referrer: "https://admin.example.com/",
  } satisfies IShoppingMallPlatformAdminJoin.IRequest;

  const platformAdminAuthorized: IShoppingMallPlatformAdmin.IAuthorized =
    await api.functional.auth.platformAdmin.join(connection, {
      body: platformAdminJoinBody,
    });
  typia.assert(platformAdminAuthorized);

  // 2. Register seller (this call authenticates as seller and overwrites token)
  const sellerEmail: string = typia.random<string & tags.Format<"email">>();
  const sellerJoinBody = {
    email: sellerEmail,
    password: "SellerPass123!",
    storeName: RandomGenerator.name(2),
    contactPhone: RandomGenerator.mobile(),
  } satisfies IShoppingMallSellerJoin.IRequest;

  const sellerAuthorized: IShoppingMallSeller.IAuthorized =
    await api.functional.auth.seller.join(connection, {
      body: sellerJoinBody,
    });
  typia.assert(sellerAuthorized);

  const sellerId: string & tags.Format<"uuid"> = sellerAuthorized.id;

  // 3. Switch back to platform admin using login
  const platformAdminLoginBody = {
    email: platformAdminEmail,
    password: "AdminPass123!",
    ip: null,
    href: "https://admin.example.com/login",
    referrer: "https://admin.example.com/",
  } satisfies IShoppingMallPlatformAdminLogin.IRequest;

  const platformAdminLoggedIn: IShoppingMallPlatformAdmin.IAuthorized =
    await api.functional.auth.platformAdmin.login(connection, {
      body: platformAdminLoginBody,
    });
  typia.assert(platformAdminLoggedIn);

  // 4. Create multiple seller payouts with various statuses, currencies, and periods
  const statuses: IEShoppingMallSellerPayoutStatus[] = [
    "scheduled",
    "processing",
    "completed",
    "failed",
  ];
  const currencies = ["USD", "KRW"] as const;

  const now = new Date();
  const oneDayMs = 24 * 60 * 60 * 1000;

  const payouts: IShoppingMallSellerPayout[] = [];

  for (let i = 0; i < 12; i++) {
    const currency = currencies[i % currencies.length];
    const status = statuses[i % statuses.length];

    const periodStartDate = new Date(now.getTime() - (10 - i) * oneDayMs);
    const periodEndDate = new Date(periodStartDate.getTime() + oneDayMs);

    const payoutCreateBody = {
      seller_id: sellerId,
      currency_code: currency,
      gross_amount: 1000 + i * 100,
      fee_amount: 50,
      adjustment_amount: 0,
      net_amount: 950 + i * 100,
      period_start: periodStartDate.toISOString(),
      period_end: periodEndDate.toISOString(),
      payout_status: status,
      scheduled_payout_at: new Date(
        periodEndDate.getTime() + oneDayMs,
      ).toISOString(),
      memo: `payout-${i}`,
    } satisfies IShoppingMallSellerPayout.ICreate;

    const payout: IShoppingMallSellerPayout =
      await api.functional.shoppingMall.platformAdmin.sellerPayouts.create(
        connection,
        {
          body: payoutCreateBody,
        },
      );
    typia.assert(payout);
    payouts.push(payout);

    // 4-1. Create at least one payout item per payout
    const itemBody = {
      shopping_mall_order_id: null,
      shopping_mall_order_seller_segment_id: null,
      shopping_mall_order_line_id: null,
      componentType: "item_revenue",
      description: `payout-item-${i}`,
      currency: currency,
      grossAmount: payout.grossAmount,
      feeAmount: payout.feeAmount ?? 0,
      taxAmount: 0,
      netAmount: payout.netAmount,
    } satisfies IShoppingMallSellerPayoutItem.ICreate;

    const payoutItem: IShoppingMallSellerPayoutItem =
      await api.functional.shoppingMall.platformAdmin.sellerPayouts.items.create(
        connection,
        {
          sellerPayoutId: typia.assert<string & tags.Format<"uuid">>(payout.id),
          body: itemBody,
        },
      );
    typia.assert(payoutItem);
  }

  // Narrow date range: choose middle range around `now`
  const dateRangeFrom = new Date(now.getTime() - 5 * oneDayMs).toISOString();
  const dateRangeTo = new Date(now.getTime() + 2 * oneDayMs).toISOString();

  // 5. Switch to seller (login) to query seller payout statement
  const sellerLoginBody = {
    email: sellerEmail,
    password: "SellerPass123!",
    ip: null,
    href: "https://seller.example.com/login",
    referrer: "https://seller.example.com/",
  } satisfies IShoppingMallSellerLogin.IRequest;

  const sellerLoggedIn: IShoppingMallSeller.IAuthorized =
    await api.functional.auth.seller.login(connection, {
      body: sellerLoginBody,
    });
  typia.assert(sellerLoggedIn);

  const statementCurrency = currencies[0]; // e.g., "USD"

  // First request: dateRange + single currency, all statuses
  const requestBodyPage1AllStatuses = {
    dateRange: {
      from: dateRangeFrom,
      to: dateRangeTo,
    },
    timeZone: "Asia/Seoul",
    sellerIds: undefined,
    payoutStatusFilters: undefined,
    currencies: [statementCurrency],
    includeOrderBreakdown: false,
    includeRefundAndChargebackImpact: false,
    page: 1 as number & tags.Type<"int32"> & tags.Minimum<1>,
    limit: 10 as number & tags.Type<"int32"> & tags.Minimum<1>,
    sort: undefined,
  } satisfies IShoppingMallSellerPayoutStatementReport.IRequest;

  const pageAllStatuses: IPageIShoppingMallSellerPayoutStatementRow =
    await api.functional.shoppingMall.seller.reports.seller_payout_statement.index(
      connection,
      {
        body: requestBodyPage1AllStatuses,
      },
    );
  typia.assert(pageAllStatuses);

  const paginationAll = pageAllStatuses.pagination;
  const rowsAll = pageAllStatuses.data;

  // Pagination metadata checks
  TestValidator.equals(
    "page1 current index should be 0",
    paginationAll.current,
    0,
  );
  TestValidator.equals(
    "page1 limit should equal requested limit",
    paginationAll.limit,
    requestBodyPage1AllStatuses.limit,
  );
  TestValidator.predicate(
    "records should be >= number of rows",
    paginationAll.records >= rowsAll.length,
  );

  // Row-level checks: seller, currency, date range
  for (const row of rowsAll) {
    TestValidator.equals(
      "row seller must match authenticated seller",
      row.seller.id,
      sellerLoggedIn.id,
    );
    TestValidator.equals(
      "row currency must match filter",
      row.currency,
      statementCurrency,
    );
    TestValidator.predicate(
      "row settlement start within dateRange",
      row.settlement_period_start >= dateRangeFrom &&
        row.settlement_period_start <= dateRangeTo,
    );
    TestValidator.predicate(
      "row settlement end within dateRange",
      row.settlement_period_end >= dateRangeFrom &&
        row.settlement_period_end <= dateRangeTo,
    );
  }

  // Collect statuses from first call
  const allStatusesSet = new Set<string>();
  for (const row of rowsAll) {
    allStatusesSet.add(row.payout_status);
  }

  // 6. Call again with restricted payoutStatusFilters: completed + failed
  const restrictedStatuses: IEShoppingMallSellerPayoutStatus[] = [
    "completed",
    "failed",
  ];

  const requestBodyStatusFiltered = {
    dateRange: {
      from: dateRangeFrom,
      to: dateRangeTo,
    },
    timeZone: "Asia/Seoul",
    sellerIds: undefined,
    payoutStatusFilters: restrictedStatuses,
    currencies: [statementCurrency],
    includeOrderBreakdown: false,
    includeRefundAndChargebackImpact: false,
    page: 1 as number & tags.Type<"int32"> & tags.Minimum<1>,
    limit: 20 as number & tags.Type<"int32"> & tags.Minimum<1>,
    sort: undefined,
  } satisfies IShoppingMallSellerPayoutStatementReport.IRequest;

  const pageStatusFiltered: IPageIShoppingMallSellerPayoutStatementRow =
    await api.functional.shoppingMall.seller.reports.seller_payout_statement.index(
      connection,
      {
        body: requestBodyStatusFiltered,
      },
    );
  typia.assert(pageStatusFiltered);

  const rowsStatusFiltered = pageStatusFiltered.data;
  for (const row of rowsStatusFiltered) {
    TestValidator.predicate(
      "row payout_status must be in restricted set",
      restrictedStatuses.includes(
        row.payout_status as IEShoppingMallSellerPayoutStatus,
      ),
    );
  }

  // Ensure that restricted statuses are subset of the statuses seen previously when overlapping ids
  const idsAll = new Set(rowsAll.map((r) => r.id));
  for (const row of rowsStatusFiltered) {
    if (idsAll.has(row.id)) {
      TestValidator.predicate(
        "rows with same id from first call must have status in restricted set",
        restrictedStatuses.includes(
          row.payout_status as IEShoppingMallSellerPayoutStatus,
        ),
      );
    }
  }

  // 7. Explicit pagination: page 1 and page 2
  const limitForPaging: number & tags.Type<"int32"> & tags.Minimum<1> = 5;

  const requestBodyPage1 = {
    dateRange: {
      from: dateRangeFrom,
      to: dateRangeTo,
    },
    timeZone: "Asia/Seoul",
    sellerIds: undefined,
    payoutStatusFilters: undefined,
    currencies: [statementCurrency],
    includeOrderBreakdown: false,
    includeRefundAndChargebackImpact: false,
    page: 1 as number & tags.Type<"int32"> & tags.Minimum<1>,
    limit: limitForPaging,
    sort: undefined,
  } satisfies IShoppingMallSellerPayoutStatementReport.IRequest;

  const requestBodyPage2 = {
    ...requestBodyPage1,
    page: 2 as number & tags.Type<"int32"> & tags.Minimum<1>,
  } satisfies IShoppingMallSellerPayoutStatementReport.IRequest;

  const page1: IPageIShoppingMallSellerPayoutStatementRow =
    await api.functional.shoppingMall.seller.reports.seller_payout_statement.index(
      connection,
      {
        body: requestBodyPage1,
      },
    );
  typia.assert(page1);

  const page2: IPageIShoppingMallSellerPayoutStatementRow =
    await api.functional.shoppingMall.seller.reports.seller_payout_statement.index(
      connection,
      {
        body: requestBodyPage2,
      },
    );
  typia.assert(page2);

  TestValidator.equals("page1 current index", page1.pagination.current, 0);
  TestValidator.equals("page2 current index", page2.pagination.current, 1);

  const idsPage1 = new Set(page1.data.map((r) => r.id));
  const idsPage2 = new Set(page2.data.map((r) => r.id));

  for (const id of idsPage1) {
    TestValidator.predicate(
      "no overlapping ids between page1 and page2",
      !idsPage2.has(id),
    );
  }

  const combinedIds = new Set<string & tags.Format<"uuid">>();
  for (const id of idsPage1) combinedIds.add(id);
  for (const id of idsPage2) combinedIds.add(id);

  if (combinedIds.size > 0) {
    TestValidator.predicate(
      "combined ids should equal union of page1 and page2 ids",
      combinedIds.size === idsPage1.size + idsPage2.size,
    );
  }

  // 8. Sorting behavior with explicit sort configuration
  const sortConfig = {
    field: "payoutCreatedAt",
    direction: "desc",
  } satisfies IShoppingMallPayoutStatementSort;

  const requestBodySorted = {
    dateRange: {
      from: dateRangeFrom,
      to: dateRangeTo,
    },
    timeZone: "Asia/Seoul",
    sellerIds: undefined,
    payoutStatusFilters: undefined,
    currencies: [statementCurrency],
    includeOrderBreakdown: false,
    includeRefundAndChargebackImpact: false,
    page: 1 as number & tags.Type<"int32"> & tags.Minimum<1>,
    limit: 20 as number & tags.Type<"int32"> & tags.Minimum<1>,
    sort: sortConfig,
  } satisfies IShoppingMallSellerPayoutStatementReport.IRequest;

  const pageSorted: IPageIShoppingMallSellerPayoutStatementRow =
    await api.functional.shoppingMall.seller.reports.seller_payout_statement.index(
      connection,
      {
        body: requestBodySorted,
      },
    );
  typia.assert(pageSorted);

  const rowsSorted = pageSorted.data;
  for (let i = 1; i < rowsSorted.length; i++) {
    const prev = rowsSorted[i - 1];
    const curr = rowsSorted[i];
    TestValidator.predicate(
      "settlement_period_start should be non-increasing when sorted desc",
      prev.settlement_period_start >= curr.settlement_period_start,
    );
  }
}
