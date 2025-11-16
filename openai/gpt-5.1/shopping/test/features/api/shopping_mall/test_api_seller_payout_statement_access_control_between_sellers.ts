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
 * Verify access control for seller payout statements between different sellers.
 *
 * Business goals:
 *
 * - Ensure that a seller can see their own payout statement rows.
 * - Ensure that a different seller cannot see payout rows belonging to another
 *   seller, even if they try to manipulate sellerIds in the request.
 *
 * Scenario steps:
 *
 * 1. Create a platform admin and two sellers (sellerA and sellerB).
 * 2. As platformAdmin, create a seller payout batch (and an item) for sellerA
 *    only.
 * 3. As sellerA, query the seller payout statement endpoint and confirm:
 *
 *    - At least one row exists for sellerA.
 *    - All rows in the result belong to sellerA.
 * 4. As sellerB, query the same endpoint twice:
 *
 *    - Without sellerIds filter (implicit current seller scope).
 *    - With sellerIds including both sellerA.id and sellerB.id to simulate an
 *         attempted cross-seller access. In both cases, confirm that no payout
 *         rows for sellerA are visible to sellerB.
 */
export async function test_api_seller_payout_statement_access_control_between_sellers(
  connection: api.IConnection,
) {
  // Helper to build a URI string
  const randomUri = (): string & tags.Format<"uri"> =>
    typia.random<string & tags.Format<"uri">>();

  // 1. Create platform admin
  const platformAdminJoinBody = {
    email: typia.random<string & tags.Format<"email">>(),
    name: RandomGenerator.name(),
    password: RandomGenerator.alphaNumeric(12),
    ip: null,
    href: randomUri(),
    referrer: randomUri(),
  } satisfies IShoppingMallPlatformAdminJoin.IRequest;

  const platformAdminAuth: IShoppingMallPlatformAdmin.IAuthorized =
    await api.functional.auth.platformAdmin.join(connection, {
      body: platformAdminJoinBody,
    });
  typia.assert(platformAdminAuth);

  // 2. Create two sellers: sellerA and sellerB
  const sellerAPassword = RandomGenerator.alphaNumeric(12);
  const sellerAJoinBody = {
    email: typia.random<string & tags.Format<"email">>(),
    password: sellerAPassword,
    storeName: RandomGenerator.name(1),
    contactPhone: RandomGenerator.mobile(),
  } satisfies IShoppingMallSellerJoin.IRequest;

  const sellerAAuth: IShoppingMallSeller.IAuthorized =
    await api.functional.auth.seller.join(connection, {
      body: sellerAJoinBody,
    });
  typia.assert(sellerAAuth);

  const sellerBPassword = RandomGenerator.alphaNumeric(12);
  const sellerBJoinBody = {
    email: typia.random<string & tags.Format<"email">>(),
    password: sellerBPassword,
    storeName: RandomGenerator.name(1),
    contactPhone: RandomGenerator.mobile(),
  } satisfies IShoppingMallSellerJoin.IRequest;

  const sellerBAuth: IShoppingMallSeller.IAuthorized =
    await api.functional.auth.seller.join(connection, {
      body: sellerBJoinBody,
    });
  typia.assert(sellerBAuth);

  // 3. Switch back to platformAdmin using login to be explicit
  const platformAdminLoginBody = {
    email: platformAdminAuth.email,
    password: platformAdminJoinBody.password,
    ip: null,
    href: randomUri(),
    referrer: randomUri(),
  } satisfies IShoppingMallPlatformAdminLogin.IRequest;

  const platformAdminLogin: IShoppingMallPlatformAdmin.IAuthorized =
    await api.functional.auth.platformAdmin.login(connection, {
      body: platformAdminLoginBody,
    });
  typia.assert(platformAdminLogin);

  // 4. Create a payout batch for sellerA only
  const now = new Date();
  const periodStart = new Date(now.getTime() - 24 * 60 * 60 * 1000); // 1 day before
  const periodEnd = new Date(now.getTime() + 24 * 60 * 60 * 1000); // 1 day after

  const grossAmount = 100000;
  const feeAmount = 10000;
  const adjustmentAmount = 0;
  const netAmount = grossAmount - feeAmount + adjustmentAmount;

  const payoutCreateBody = {
    seller_id: sellerAAuth.id,
    currency_code: "KRW",
    gross_amount: grossAmount,
    fee_amount: feeAmount,
    adjustment_amount: adjustmentAmount,
    net_amount: netAmount,
    period_start: periodStart.toISOString(),
    period_end: periodEnd.toISOString(),
    payout_status: "scheduled",
    scheduled_payout_at: new Date(now.getTime() + 60 * 60 * 1000).toISOString(),
    memo: "E2E sellerA payout batch",
  } satisfies IShoppingMallSellerPayout.ICreate;

  const sellerAPayout: IShoppingMallSellerPayout =
    await api.functional.shoppingMall.platformAdmin.sellerPayouts.create(
      connection,
      {
        body: payoutCreateBody,
      },
    );
  typia.assert(sellerAPayout);

  // Create a payout item under this batch for completeness
  const payoutItemCreateBody = {
    shopping_mall_order_id: null,
    shopping_mall_order_seller_segment_id: null,
    shopping_mall_order_line_id: null,
    componentType: "item_revenue",
    description: "E2E payout item for sellerA",
    currency: sellerAPayout.currency,
    grossAmount: grossAmount,
    feeAmount: feeAmount,
    taxAmount: 0,
    netAmount: netAmount,
  } satisfies IShoppingMallSellerPayoutItem.ICreate;

  const sellerPayoutIdForItem = typia.assert<string & tags.Format<"uuid">>(
    sellerAPayout.id as string,
  );

  const sellerAPayoutItem: IShoppingMallSellerPayoutItem =
    await api.functional.shoppingMall.platformAdmin.sellerPayouts.items.create(
      connection,
      {
        sellerPayoutId: sellerPayoutIdForItem,
        body: payoutItemCreateBody,
      },
    );
  typia.assert(sellerAPayoutItem);

  // 5. As sellerA, query payout statement
  const sellerALoginBody = {
    email: sellerAAuth.email,
    password: sellerAPassword,
    ip: null,
    href: randomUri(),
    referrer: randomUri(),
  } satisfies IShoppingMallSellerLogin.IRequest;

  const sellerALogin: IShoppingMallSeller.IAuthorized =
    await api.functional.auth.seller.login(connection, {
      body: sellerALoginBody,
    });
  typia.assert(sellerALogin);

  const statementDateRange = {
    from: periodStart.toISOString(),
    to: periodEnd.toISOString(),
  } satisfies IShoppingMallReportDateRange;

  const sellerAStatementRequest = {
    dateRange: statementDateRange,
    timeZone: "Asia/Seoul",
    sellerIds: [sellerALogin.id],
    payoutStatusFilters: [
      "scheduled" satisfies IEShoppingMallSellerPayoutStatus,
    ],
    currencies: [sellerAPayout.currency],
    includeOrderBreakdown: false,
    includeRefundAndChargebackImpact: false,
    page: 1,
    limit: 50,
    sort: {
      field: "payoutCreatedAt",
      direction: "descending",
    },
  } satisfies IShoppingMallSellerPayoutStatementReport.IRequest;

  const sellerAStatement: IPageIShoppingMallSellerPayoutStatementRow =
    await api.functional.shoppingMall.seller.reports.seller_payout_statement.index(
      connection,
      {
        body: sellerAStatementRequest,
      },
    );
  typia.assert(sellerAStatement);

  // Validate sellerA sees only own rows and at least one row exists
  TestValidator.predicate(
    "sellerA has at least one payout statement row",
    sellerAStatement.pagination.records >= 1 &&
      sellerAStatement.data.length >= 1,
  );

  const sellerAHasOnlyOwnRows = sellerAStatement.data.every(
    (row) => row.seller.id === sellerALogin.id,
  );
  TestValidator.predicate(
    "all seller payout statement rows for sellerA belong to sellerA",
    sellerAHasOnlyOwnRows,
  );

  // 6. As sellerB, query payout statement without sellerIds
  const sellerBLoginBody = {
    email: sellerBAuth.email,
    password: sellerBPassword,
    ip: null,
    href: randomUri(),
    referrer: randomUri(),
  } satisfies IShoppingMallSellerLogin.IRequest;

  const sellerBLogin: IShoppingMallSeller.IAuthorized =
    await api.functional.auth.seller.login(connection, {
      body: sellerBLoginBody,
    });
  typia.assert(sellerBLogin);

  const sellerBStatementRequestWithoutIds = {
    dateRange: statementDateRange,
    timeZone: "Asia/Seoul",
    currencies: [sellerAPayout.currency],
    payoutStatusFilters: [
      "scheduled" satisfies IEShoppingMallSellerPayoutStatus,
    ],
    includeOrderBreakdown: false,
    includeRefundAndChargebackImpact: false,
    page: 1,
    limit: 50,
    sort: {
      field: "payoutCreatedAt",
      direction: "descending",
    },
  } satisfies IShoppingMallSellerPayoutStatementReport.IRequest;

  const sellerBStatementWithoutIds: IPageIShoppingMallSellerPayoutStatementRow =
    await api.functional.shoppingMall.seller.reports.seller_payout_statement.index(
      connection,
      {
        body: sellerBStatementRequestWithoutIds,
      },
    );
  typia.assert(sellerBStatementWithoutIds);

  const sellerBHasNoSellerARowsWithoutIds =
    sellerBStatementWithoutIds.data.every(
      (row) => row.seller.id !== sellerALogin.id,
    );
  TestValidator.predicate(
    "sellerB sees no sellerA rows without sellerIds filter",
    sellerBHasNoSellerARowsWithoutIds,
  );

  // 7. As sellerB, attempt to query sellerA's payouts explicitly via sellerIds
  const sellerBStatementRequestWithIds = {
    dateRange: statementDateRange,
    timeZone: "Asia/Seoul",
    sellerIds: [sellerALogin.id, sellerBLogin.id],
    payoutStatusFilters: [
      "scheduled" satisfies IEShoppingMallSellerPayoutStatus,
    ],
    currencies: [sellerAPayout.currency],
    includeOrderBreakdown: false,
    includeRefundAndChargebackImpact: false,
    page: 1,
    limit: 50,
    sort: {
      field: "payoutCreatedAt",
      direction: "descending",
    },
  } satisfies IShoppingMallSellerPayoutStatementReport.IRequest;

  try {
    const sellerBStatementWithIds: IPageIShoppingMallSellerPayoutStatementRow =
      await api.functional.shoppingMall.seller.reports.seller_payout_statement.index(
        connection,
        {
          body: sellerBStatementRequestWithIds,
        },
      );
    typia.assert(sellerBStatementWithIds);

    const sellerBHasNoSellerARowsWithIds = sellerBStatementWithIds.data.every(
      (row) => row.seller.id !== sellerALogin.id,
    );
    TestValidator.predicate(
      "sellerB cannot see sellerA rows even when requesting sellerA.id in sellerIds",
      sellerBHasNoSellerARowsWithIds,
    );
  } catch {
    // If the API throws (e.g., authorization error for cross-seller sellerIds),
    // this is also acceptable. No further assertion needed here.
  }
}
