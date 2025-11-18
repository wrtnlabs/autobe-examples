import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIShoppingMallPaymentMethodStat } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallPaymentMethodStat";
import type { IShoppingMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdmin";
import type { IShoppingMallAdminJoin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdminJoin";
import type { IShoppingMallConfig } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallConfig";
import type { IShoppingMallPaymentMethodStat } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallPaymentMethodStat";

/**
 * Validate admin analytics filtering for payment method statistics.
 *
 * Business goal: Ensure that an authenticated shopping mall administrator can
 * retrieve payment method statistics that are correctly filtered by date range
 * and payment method codes, with a minimum paid GMV threshold, and that
 * pagination metadata is consistent with the returned data.
 *
 * High level workflow:
 *
 * 1. Join an admin via POST /auth/admin/join which also authenticates and sets the
 *    Authorization header on the connection.
 * 2. Create an "analytics" related configuration via POST
 *    /shoppingMall/admin/configs to simulate that analytics querying is
 *    enabled/within allowed ranges.
 * 3. Call PATCH /shoppingMall/admin/analytics/paymentMethodStats
 *    (api.functional.shoppingMall.admin.analytics.paymentMethodStats.index)
 *    with a focused IShoppingMallPaymentMethodStat.IRequest payload:
 *
 *    - FromDate/toDate: narrow window around the current time.
 *    - PaymentMethodCodes: non-empty string array, e.g. ["card", "bank_transfer"].
 *    - PaymentMethodIds: omitted (optional) as we have no concrete IDs.
 *    - MinPaidGmvAmount: small positive value to exclude zero-volume rows.
 *    - OrderBy: "paid_gmv_amount"; orderDirection: "desc".
 *    - Page: 1 and limit: 50.
 * 4. Assert that the response matches IPageIShoppingMallPaymentMethodStat.ISummary
 *    via typia.assert.
 * 5. For each returned IShoppingMallPaymentMethodStat.ISummary row, assert:
 *
 *    - Stats_date is within the requested fromDate/toDate bounds.
 *    - Payment_method_code is one of the requested codes.
 *    - Paid_gmv_amount >= minPaidGmvAmount.
 * 6. Validate pagination metadata:
 *
 *    - Pagination.limit equals the requested limit.
 *    - Pagination.current equals the requested page (1).
 *    - Pagination.records >= data.length.
 *    - Pagination.pages is coherent with records and limit.
 */
export async function test_api_admin_payment_method_stats_filtered_by_date_and_method(
  connection: api.IConnection,
) {
  // 1. Admin join & authentication
  const adminJoinBody = {
    email: typia.random<string & tags.Format<"email">>(),
    password: typia.random<string & tags.Format<"password">>(),
    ip: null,
    href: "https://admin.example.com/join",
    referrer: "https://admin.example.com/login",
  } satisfies IShoppingMallAdminJoin.ICreate;

  const authorizedAdmin: IShoppingMallAdmin.IAuthorized =
    await api.functional.auth.admin.join(connection, {
      body: adminJoinBody,
    });
  typia.assert(authorizedAdmin);

  const token: IAuthorizationToken = authorizedAdmin.token;
  typia.assert(token);

  // 2. Create analytics-related config
  const configBody = {
    namespace: "analytics",
    config_key: "payment_method_stats_filters",
    environment: "production",
    description: "Enable payment method stats querying in production",
    value_json: JSON.stringify({
      allowedDateRangeDays: 30,
      minGmvThreshold: 1,
      allowedPaymentMethodCodes: ["card", "bank_transfer"],
    }),
    is_active: true,
  } satisfies IShoppingMallConfig.ICreate;

  const config: IShoppingMallConfig =
    await api.functional.shoppingMall.admin.configs.create(connection, {
      body: configBody,
    });
  typia.assert(config);

  // 3. Prepare request for payment method stats search
  const now = new Date();
  const fromDate = new Date(now.getTime() - 24 * 60 * 60 * 1000).toISOString();
  const toDate = new Date(now.getTime() + 24 * 60 * 60 * 1000).toISOString();

  const requestedCodes = ["card", "bank_transfer"] as const;
  const minPaidGmvAmount = 1;

  const requestBody = {
    fromDate,
    toDate,
    paymentMethodCodes: [...requestedCodes],
    minPaidGmvAmount,
    orderBy: "paid_gmv_amount",
    orderDirection: "desc",
    page: 1,
    limit: 50,
  } satisfies IShoppingMallPaymentMethodStat.IRequest;

  const pageResult: IPageIShoppingMallPaymentMethodStat.ISummary =
    await api.functional.shoppingMall.admin.analytics.paymentMethodStats.index(
      connection,
      {
        body: requestBody,
      },
    );
  typia.assert(pageResult);

  const pagination: IPage.IPagination = pageResult.pagination;
  typia.assert(pagination);

  const data: IShoppingMallPaymentMethodStat.ISummary[] = pageResult.data;

  // 5. Validate each summary row
  for (const row of data) {
    typia.assert<IShoppingMallPaymentMethodStat.ISummary>(row);

    const statsDateMs = new Date(row.stats_date).getTime();
    const fromMs = new Date(fromDate).getTime();
    const toMs = new Date(toDate).getTime();

    TestValidator.predicate(
      "stats_date should be within requested range",
      statsDateMs >= fromMs && statsDateMs <= toMs,
    );

    TestValidator.predicate(
      "payment_method_code should be one of requested codes",
      requestedCodes.includes(
        row.payment_method_code as (typeof requestedCodes)[number],
      ),
    );

    TestValidator.predicate(
      "paid_gmv_amount should be >= minPaidGmvAmount",
      row.paid_gmv_amount >= minPaidGmvAmount,
    );
  }

  // 6. Validate pagination metadata consistency
  TestValidator.equals(
    "pagination.current should equal requested page",
    pagination.current,
    1,
  );

  TestValidator.equals(
    "pagination.limit should equal requested limit",
    pagination.limit,
    50,
  );

  TestValidator.predicate(
    "pagination.records should be >= returned data length",
    pagination.records >= data.length,
  );

  TestValidator.predicate(
    "pagination.pages should be coherent with records and limit",
    pagination.pages === 0 ||
      (pagination.limit > 0 &&
        pagination.pages >=
          Math.ceil(pagination.records / Math.max(1, pagination.limit))),
  );
}
