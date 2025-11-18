import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIShoppingMallShippingPerformanceByDay } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallShippingPerformanceByDay";
import type { IShoppingMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdmin";
import type { IShoppingMallAdminJoin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdminJoin";
import type { IShoppingMallShippingPerformanceByDay } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallShippingPerformanceByDay";

/**
 * Basic retrieval of daily shipping performance statistics by an authenticated
 * admin.
 *
 * Business flow:
 *
 * 1. Register a new admin account through POST /auth/admin/join.
 *
 *    - This returns IShoppingMallAdmin.IAuthorized and configures the SDK connection
 *         with an Authorization header via the access token.
 * 2. Call GET /shoppingMall/admin/statistics/shippingPerformanceByDay without
 *    query parameters, relying on the backend's default date range behavior.
 * 3. Assert that the response matches IPageIShoppingMallShippingPerformanceByDay
 *    using typia.assert.
 * 4. Validate that pagination fields are non-negative integers.
 * 5. If there is at least one data row, validate that:
 *
 *    - Stats_date and created/updated timestamps are non-empty strings.
 *    - Shipment_*_count fields are non-negative integers.
 *    - Median_fulfillment_time_hours and median_transit_time_hours are numbers.
 *    - On_time_delivery_rate is a number between 0 and 1 (inclusive).
 */
export async function test_api_admin_shipping_performance_by_day_basic_retrieval(
  connection: api.IConnection,
) {
  // 1. Register a new admin (authentication prerequisite)
  const adminJoinBody = {
    email: typia.random<string & tags.Format<"email">>(),
    password: typia.random<string & tags.Format<"password">>(),
    ip: null,
    href: "https://admin.example.com/join",
    referrer: "https://admin.example.com/landing",
  } satisfies IShoppingMallAdminJoin.ICreate;

  const authorizedAdmin: IShoppingMallAdmin.IAuthorized =
    await api.functional.auth.admin.join(connection, {
      body: adminJoinBody,
    });
  typia.assert<IShoppingMallAdmin.IAuthorized>(authorizedAdmin);

  // 2. Retrieve shipping performance by day statistics
  const page: IPageIShoppingMallShippingPerformanceByDay =
    await api.functional.shoppingMall.admin.statistics.shippingPerformanceByDay.index(
      connection,
    );
  typia.assert<IPageIShoppingMallShippingPerformanceByDay>(page);

  // 3. Validate pagination object
  const pagination: IPage.IPagination = page.pagination;
  typia.assert<IPage.IPagination>(pagination);

  TestValidator.predicate(
    "pagination.current is non-negative int32",
    pagination.current >= 0,
  );
  TestValidator.predicate(
    "pagination.limit is non-negative int32",
    pagination.limit >= 0,
  );
  TestValidator.predicate(
    "pagination.records is non-negative int32",
    pagination.records >= 0,
  );
  TestValidator.predicate(
    "pagination.pages is non-negative int32",
    pagination.pages >= 0,
  );

  // 4. Validate data array and at least basic correctness
  const rows: IShoppingMallShippingPerformanceByDay[] = page.data;

  TestValidator.predicate(
    "data array is not null",
    rows !== null && rows !== undefined,
  );

  if (rows.length === 0) return; // nothing more to validate when no stats exist

  const first: IShoppingMallShippingPerformanceByDay = rows[0];
  typia.assert<IShoppingMallShippingPerformanceByDay>(first);

  // Basic presence checks for key identifiers
  TestValidator.predicate(
    "stats_date is a non-empty string",
    typeof first.stats_date === "string" && first.stats_date.length > 0,
  );
  TestValidator.predicate(
    "shipping_method_code is a non-empty string",
    typeof first.shipping_method_code === "string" &&
      first.shipping_method_code.length > 0,
  );

  // Count fields must be non-negative integers
  const countFields: Array<[string, number]> = [
    ["shipment_created_count", first.shipment_created_count],
    ["shipment_shipped_count", first.shipment_shipped_count],
    ["shipment_delivered_count", first.shipment_delivered_count],
    ["shipment_delivery_failed_count", first.shipment_delivery_failed_count],
    ["shipment_returned_count", first.shipment_returned_count],
  ];

  for (const [name, value] of countFields) {
    TestValidator.predicate(
      `${name} is non-negative integer`,
      Number.isInteger(value) && value >= 0,
    );
  }

  // Median times should be numbers (they may be zero or positive; scenario
  // does not enforce stricter bounds)
  TestValidator.predicate(
    "median_fulfillment_time_hours is a finite number",
    Number.isFinite(first.median_fulfillment_time_hours),
  );
  TestValidator.predicate(
    "median_transit_time_hours is a finite number",
    Number.isFinite(first.median_transit_time_hours),
  );

  // on_time_delivery_rate must be between 0 and 1 inclusive
  TestValidator.predicate(
    "on_time_delivery_rate is between 0 and 1",
    first.on_time_delivery_rate >= 0 && first.on_time_delivery_rate <= 1,
  );

  // created_at and updated_at should be non-empty ISO strings
  TestValidator.predicate(
    "created_at is non-empty ISO string",
    typeof first.created_at === "string" && first.created_at.length > 0,
  );
  TestValidator.predicate(
    "updated_at is non-empty ISO string",
    typeof first.updated_at === "string" && first.updated_at.length > 0,
  );
}
