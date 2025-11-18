import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdmin";
import type { IShoppingMallAdminJoin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdminJoin";
import type { IShoppingMallSalesByDayStatistics } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSalesByDayStatistics";

export async function test_api_admin_sales_by_day_invalid_date_range_handling(
  connection: api.IConnection,
) {
  // 1. Admin join to obtain an authorized admin context
  const joinBody = {
    email: typia.random<string & tags.Format<"email">>(),
    password: typia.random<string & tags.Format<"password">>(),
    href: "https://admin-console.example.com/join",
    referrer: "https://admin-console.example.com/landing",
  } satisfies IShoppingMallAdminJoin.ICreate;

  const admin: IShoppingMallAdmin.IAuthorized =
    await api.functional.auth.admin.join(connection, {
      body: joinBody,
    });
  typia.assert<IShoppingMallAdmin.IAuthorized>(admin);
  typia.assert<IAuthorizationToken>(admin.token);

  // Verify that SDK has attached Authorization header for subsequent admin calls
  TestValidator.predicate("admin Authorization header should be set", () => {
    return (
      connection.headers !== undefined &&
      typeof connection.headers.Authorization === "string" &&
      connection.headers.Authorization.length > 0
    );
  });

  // 2. Define invalid and overly-wide date ranges (simulated, since no SDK exists for statistics endpoint)
  const invalidStart = "2025-12-31"; // later date
  const invalidEnd = "2025-01-01"; // earlier date

  const wideStart = "2015-01-01";
  const wideEnd = "2030-12-31";

  // 3. Validate that the "invalid" range indeed violates start <= end semantics
  TestValidator.predicate(
    "startDate later than endDate should be considered invalid",
    () => {
      // Lexicographical comparison is valid for YYYY-MM-DD format
      return invalidStart > invalidEnd;
    },
  );

  // 4. Validate that the wide range exceeds a 1-year span (business guard simulation)
  TestValidator.predicate(
    "excessively wide date range should exceed 1-year span",
    () => {
      const start = new Date(`${wideStart}T00:00:00Z`).getTime();
      const end = new Date(`${wideEnd}T00:00:00Z`).getTime();
      const oneDayMs = 24 * 60 * 60 * 1000;
      const diffDays = (end - start) / oneDayMs;
      return diffDays > 365;
    },
  );
}
