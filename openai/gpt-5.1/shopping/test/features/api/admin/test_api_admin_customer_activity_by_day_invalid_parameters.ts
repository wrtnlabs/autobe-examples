import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdmin";
import type { IShoppingMallAdminJoin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdminJoin";
import type { IShoppingMallCustomerActivityDailyStatistics } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomerActivityDailyStatistics";

/**
 * Validate admin customer-activity-by-day statistics endpoint under
 * authentication and basic business invariants, focusing on the (reinterpreted)
 * idea of parameter validity.
 *
 * Business context:
 *
 * - The statistics endpoint GET
 *   /shoppingMall/admin/statistics/customerActivityByDay returns an
 *   `IShoppingMallCustomerActivityDailyStatistics` object that summarizes daily
 *   customer activity over some effective date window.
 * - The original scenario talked about invalid query parameters, but the
 *   generated SDK exposes no request parameters, so we cannot send malformed
 *   dates. Instead we validate that, once authenticated as an admin, the
 *   endpoint always returns structurally valid data with sensible date-range
 *   invariants and that repeated calls are idempotent.
 *
 * Steps:
 *
 * 1. Create an admin using POST /auth/admin/join via
 *    `api.functional.auth.admin.join`, using a valid
 *    IShoppingMallAdminJoin.ICreate payload. Ensure the returned
 *    IShoppingMallAdmin.IAuthorized and nested token structure are valid by
 *    `typia.assert`.
 *
 *    - This call also sets `connection.headers.Authorization` internally.
 * 2. Call GET /shoppingMall/admin/statistics/customerActivityByDay using
 *    `api.functional.shoppingMall.admin.statistics.customerActivityByDay.index`.
 *
 *    - Assert the response satisfies IShoppingMallCustomerActivityDailyStatistics
 *         using `typia.assert`.
 *    - Validate key invariants using TestValidator: a. `startDate` and `endDate` are
 *         non-empty strings and lexicographically ordered (startDate <=
 *         endDate) because they are ISO date strings. b. `rows` dates are
 *         within [startDate, endDate]. c. `rows` array is sorted ascending by
 *         date.
 * 3. When `rows` is non-empty, compute aggregate metrics from rows and compare
 *    them to `summary` when present:
 *
 *    - TotalDays should equal rows.length.
 *    - TotalNewRegisteredCustomers should equal sum of row.newRegisteredCustomers.
 *    - TotalActiveCustomers should equal sum of row.activeCustomers.
 *    - TotalOrderingCustomers should equal sum of row.orderingCustomers.
 *    - TotalOrders should equal sum of row.totalOrders.
 *    - TotalOrderItems should equal sum of row.totalOrderItems.
 *    - TotalGrossMerchandiseValue should equal sum of row.grossMerchandiseValue. We
 *         only perform these checks when `summary` exists, and guard against
 *         floating point rounding issues for GMV by using exact arithmetic on
 *         the raw numbers (since they are already JS numbers) and comparing via
 *         TestValidator.equals.
 * 4. Call the statistics endpoint a second time under the same admin connection
 *    and verify that:
 *
 *    - The second result is structurally valid.
 *    - Basic invariants from step 2 are still satisfied.
 *    - The core date-window fields (startDate, endDate, timezone) and rows/summary
 *         values are equal between first and second calls (for a short test
 *         run) to confirm idempotent, stateless behavior under repeated valid
 *         invocations.
 * 5. Create an unauthenticated connection by cloning the original connection but
 *    clearing its headers, then verify that calling the statistics endpoint
 *    with this unauthenticated connection results in an error using `await
 *    TestValidator.error`.
 *
 * Note: The original scenario referenced invalid query parameters and
 * date-range normalization. Since the SDK does not expose those parameters,
 * this test focuses on structural correctness, invariants, and
 * authentication-related error behavior instead of testing raw query parameter
 * validation.
 */
export async function test_api_admin_customer_activity_by_day_invalid_parameters(
  connection: api.IConnection,
) {
  // 1. Admin join (authentication setup)
  const adminJoinBody = {
    email: typia.random<string & tags.Format<"email">>(),
    password: typia.random<string & tags.Format<"password">>(),
    href: typia.random<string & tags.Format<"uri">>(),
    referrer: typia.random<string & tags.Format<"uri">>(),
  } satisfies IShoppingMallAdminJoin.ICreate;

  const authorizedAdmin: IShoppingMallAdmin.IAuthorized =
    await api.functional.auth.admin.join(connection, {
      body: adminJoinBody,
    });
  typia.assert<IShoppingMallAdmin.IAuthorized>(authorizedAdmin);
  typia.assert<IAuthorizationToken>(authorizedAdmin.token);

  // Helper to validate a single statistics payload
  const validateStatistics = (
    titlePrefix: string,
    stats: IShoppingMallCustomerActivityDailyStatistics,
  ) => {
    typia.assert<IShoppingMallCustomerActivityDailyStatistics>(stats);

    const { startDate, endDate, rows, summary } = stats;

    // a. startDate <= endDate (lexicographic compare for YYYY-MM-DD)
    TestValidator.predicate(
      `${titlePrefix} - startDate should be <= endDate`,
      startDate <= endDate,
    );

    // b. rows dates within [startDate, endDate]
    for (const row of rows) {
      TestValidator.predicate(
        `${titlePrefix} - row.date within [startDate, endDate]`,
        row.date >= startDate && row.date <= endDate,
      );
    }

    // c. rows sorted ascending by date
    for (let i = 1; i < rows.length; i++) {
      TestValidator.predicate(
        `${titlePrefix} - rows sorted ascending by date`,
        rows[i - 1].date <= rows[i].date,
      );
    }

    // d. If summary is present and rows exist, verify aggregate consistency
    if (rows.length > 0 && summary !== undefined) {
      const totalDays = rows.length;
      const totalNewRegisteredCustomers = rows.reduce(
        (acc, r) => acc + r.newRegisteredCustomers,
        0,
      );
      const totalActiveCustomers = rows.reduce(
        (acc, r) => acc + r.activeCustomers,
        0,
      );
      const totalOrderingCustomers = rows.reduce(
        (acc, r) => acc + r.orderingCustomers,
        0,
      );
      const totalOrders = rows.reduce((acc, r) => acc + r.totalOrders, 0);
      const totalOrderItems = rows.reduce(
        (acc, r) => acc + r.totalOrderItems,
        0,
      );
      const totalGrossMerchandiseValue = rows.reduce(
        (acc, r) => acc + r.grossMerchandiseValue,
        0,
      );

      TestValidator.equals(
        `${titlePrefix} - summary.totalDays matches rows.length`,
        summary.totalDays,
        totalDays,
      );
      TestValidator.equals(
        `${titlePrefix} - summary.totalNewRegisteredCustomers matches row sum`,
        summary.totalNewRegisteredCustomers,
        totalNewRegisteredCustomers,
      );
      TestValidator.equals(
        `${titlePrefix} - summary.totalActiveCustomers matches row sum`,
        summary.totalActiveCustomers,
        totalActiveCustomers,
      );
      TestValidator.equals(
        `${titlePrefix} - summary.totalOrderingCustomers matches row sum`,
        summary.totalOrderingCustomers,
        totalOrderingCustomers,
      );
      TestValidator.equals(
        `${titlePrefix} - summary.totalOrders matches row sum`,
        summary.totalOrders,
        totalOrders,
      );
      TestValidator.equals(
        `${titlePrefix} - summary.totalOrderItems matches row sum`,
        summary.totalOrderItems,
        totalOrderItems,
      );
      TestValidator.equals(
        `${titlePrefix} - summary.totalGrossMerchandiseValue matches row sum`,
        summary.totalGrossMerchandiseValue,
        totalGrossMerchandiseValue,
      );
    }
  };

  // 2. First statistics call under authenticated admin
  const stats1: IShoppingMallCustomerActivityDailyStatistics =
    await api.functional.shoppingMall.admin.statistics.customerActivityByDay.index(
      connection,
    );
  validateStatistics("first call", stats1);

  // 3. Second statistics call to verify idempotency/consistency
  const stats2: IShoppingMallCustomerActivityDailyStatistics =
    await api.functional.shoppingMall.admin.statistics.customerActivityByDay.index(
      connection,
    );
  validateStatistics("second call", stats2);

  // Compare key fields between stats1 and stats2 for basic consistency
  TestValidator.equals(
    "idempotent - startDate should match between calls",
    stats2.startDate,
    stats1.startDate,
  );
  TestValidator.equals(
    "idempotent - endDate should match between calls",
    stats2.endDate,
    stats1.endDate,
  );
  TestValidator.equals(
    "idempotent - timezone should match between calls",
    stats2.timezone,
    stats1.timezone,
  );
  TestValidator.equals(
    "idempotent - rows should match between calls",
    stats2.rows,
    stats1.rows,
  );
  TestValidator.equals(
    "idempotent - summary should match between calls",
    stats2.summary ?? null,
    stats1.summary ?? null,
  );

  // 4. Unauthenticated connection error scenario: clone connection without headers
  const unauthConnection: api.IConnection = {
    ...connection,
    headers: {},
  };

  await TestValidator.error(
    "unauthenticated call to statistics endpoint should fail",
    async () => {
      await api.functional.shoppingMall.admin.statistics.customerActivityByDay.index(
        unauthConnection,
      );
    },
  );
}
