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
 * Validate admin access to daily shipping performance statistics and pagination
 * invariants.
 *
 * Business purpose:
 *
 * - Ensure that an administrator can register (join) and immediately access the
 *   shipping performance by day statistics endpoint.
 * - Validate that the returned page and its pagination metadata are
 *   self-consistent with the number of data records.
 * - Validate that per-day shipping performance metrics follow basic
 *   non-negativity and rate-range rules.
 * - Validate that the list is ordered by stats_date ascending within the single
 *   visible page, which is the only thing the current SDK allows.
 *
 * Scenario steps:
 *
 * 1. Call POST /auth/admin/join with a realistic IShoppingMallAdminJoin.ICreate
 *    payload.
 *
 *    - Use random but structurally valid email/password/URL fields.
 *    - Typia.assert the IShoppingMallAdmin.IAuthorized response and its token.
 *    - Rely on the SDK to attach the Authorization header to the connection.
 * 2. Call GET /shoppingMall/admin/statistics/shippingPerformanceByDay using the
 *    authenticated connection.
 *
 *    - Typia.assert the IPageIShoppingMallShippingPerformanceByDay response.
 * 3. Validate pagination invariants:
 *
 *    - Current >= 0, limit >= 0, records >= 0, pages >= 0.
 *    - Data.length must not exceed limit when limit > 0.
 *    - Data.length must be 0 if records === 0.
 *    - Pages === 0 when records === 0; pages >= 1 when records > 0.
 *    - Current < pages when pages > 0.
 *    - Records <= pages * limit when limit > 0.
 * 4. Validate stats_date ordering and date-time formats:
 *
 *    - Ensure stats_date is monotonically non-decreasing (ascending order).
 * 5. For each IShoppingMallShippingPerformanceByDay row, validate:
 *
 *    - All shipment_*_count fields are >= 0.
 *    - Median_fulfillment_time_hours, median_transit_time_hours >= 0.
 *    - On_time_delivery_rate is between 0 and 1 inclusive.
 *    - Shipping_method_code is a non-empty string.
 */
export async function test_api_admin_shipping_performance_by_day_pagination_and_range(
  connection: api.IConnection,
) {
  // 1. Admin join - create a realistic registration payload
  const joinBody = {
    email: typia.random<string & tags.Format<"email">>(),
    password: typia.random<string & tags.Format<"password">>(),
    // For simplicity, use the same random URI base for href and referrer,
    // which still respects the uri format.
    href: typia.random<string & tags.Format<"uri">>(),
    referrer: typia.random<string & tags.Format<"uri">>(),
    // ip is optional and can be undefined; to keep it simple and
    // independent of environment, omit it.
  } satisfies IShoppingMallAdminJoin.ICreate;

  const authorized: IShoppingMallAdmin.IAuthorized =
    await api.functional.auth.admin.join(connection, {
      body: joinBody,
    });
  typia.assert<IShoppingMallAdmin.IAuthorized>(authorized);
  typia.assert<IAuthorizationToken>(authorized.token);

  // 2. Call shipping performance statistics endpoint as the authenticated admin
  const page: IPageIShoppingMallShippingPerformanceByDay =
    await api.functional.shoppingMall.admin.statistics.shippingPerformanceByDay.index(
      connection,
    );
  typia.assert<IPageIShoppingMallShippingPerformanceByDay>(page);

  const pagination: IPage.IPagination = page.pagination;
  const data: IShoppingMallShippingPerformanceByDay[] = page.data;

  // 3. Basic pagination invariants
  TestValidator.predicate(
    "pagination.current must be >= 0",
    pagination.current >= 0,
  );
  TestValidator.predicate(
    "pagination.limit must be >= 0",
    pagination.limit >= 0,
  );
  TestValidator.predicate(
    "pagination.records must be >= 0",
    pagination.records >= 0,
  );
  TestValidator.predicate(
    "pagination.pages must be >= 0",
    pagination.pages >= 0,
  );

  // When there are no records, data must be empty and pages should be 0.
  if (pagination.records === 0) {
    TestValidator.equals(
      "data must be empty when records is 0",
      data.length,
      0,
    );
    TestValidator.equals(
      "pages must be 0 when records is 0",
      pagination.pages,
      0,
    );
  } else {
    // When there are records, pages must be at least 1.
    TestValidator.predicate(
      "pages must be >= 1 when records > 0",
      pagination.pages >= 1,
    );
  }

  // data length cannot exceed limit when limit > 0
  if (pagination.limit > 0) {
    TestValidator.predicate(
      "data length must be <= limit when limit > 0",
      data.length <= pagination.limit,
    );

    // records must not exceed pages * limit
    TestValidator.predicate(
      "records must be <= pages * limit when limit > 0",
      pagination.records <= pagination.pages * pagination.limit,
    );
  } else {
    // When limit === 0, we expect there to be no data.
    TestValidator.equals(
      "data length must be 0 when limit is 0",
      data.length,
      0,
    );
  }

  // If there are pages, current must be within range [0, pages)
  if (pagination.pages > 0) {
    TestValidator.predicate(
      "current page index must be within [0, pages)",
      pagination.current >= 0 && pagination.current < pagination.pages,
    );
  }

  // records must be at least as many as data length
  TestValidator.predicate(
    "records must be >= data length",
    pagination.records >= data.length,
  );

  // 4. stats_date ordering within the returned page
  if (data.length > 1) {
    const sortedByDate: IShoppingMallShippingPerformanceByDay[] = [
      ...data,
    ].sort(
      (a, b) =>
        new Date(a.stats_date).getTime() - new Date(b.stats_date).getTime(),
    );

    TestValidator.equals(
      "data must be sorted by stats_date ascending within the page",
      data,
      sortedByDate,
    );
  }

  // 5. Per-row metric sanity checks
  for (const row of data) {
    // Non-negative shipment counts
    TestValidator.predicate(
      "shipment_created_count must be >= 0",
      row.shipment_created_count >= 0,
    );
    TestValidator.predicate(
      "shipment_shipped_count must be >= 0",
      row.shipment_shipped_count >= 0,
    );
    TestValidator.predicate(
      "shipment_delivered_count must be >= 0",
      row.shipment_delivered_count >= 0,
    );
    TestValidator.predicate(
      "shipment_delivery_failed_count must be >= 0",
      row.shipment_delivery_failed_count >= 0,
    );
    TestValidator.predicate(
      "shipment_returned_count must be >= 0",
      row.shipment_returned_count >= 0,
    );

    // Non-negative median times
    TestValidator.predicate(
      "median_fulfillment_time_hours must be >= 0",
      row.median_fulfillment_time_hours >= 0,
    );
    TestValidator.predicate(
      "median_transit_time_hours must be >= 0",
      row.median_transit_time_hours >= 0,
    );

    // on_time_delivery_rate must be between 0 and 1 inclusive
    TestValidator.predicate(
      "on_time_delivery_rate must be between 0 and 1",
      row.on_time_delivery_rate >= 0 && row.on_time_delivery_rate <= 1,
    );

    // shipping_method_code should be non-empty
    TestValidator.predicate(
      "shipping_method_code must be non-empty",
      row.shipping_method_code.length > 0,
    );
  }
}
