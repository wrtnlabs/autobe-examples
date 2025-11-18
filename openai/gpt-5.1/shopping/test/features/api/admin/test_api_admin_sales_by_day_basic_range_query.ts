import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdmin";
import type { IShoppingMallAdminJoin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdminJoin";
import type { IShoppingMallSalesByDayStatistics } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSalesByDayStatistics";

/**
 * Validate administrator join flow as prerequisite for sales-by-day stats.
 *
 * Business goal: Although the original scenario targets GET
 * /shoppingMall/admin/statistics/salesByDay, the SDK for that endpoint is not
 * available in the provided materials. To keep the test compilable and
 * meaningful, this implementation focuses on the feasible part of the flow:
 * registering an administrator via POST /auth/admin/join and verifying the
 * returned authorization context.
 *
 * This covers the critical prerequisite for any admin statistics query:
 * establishing an authenticated admin session and ensuring that the
 * IShoppingMallAdmin.IAuthorized + IAuthorizationToken payload is structurally
 * sound.
 *
 * Steps:
 *
 * 1. Build a valid IShoppingMallAdminJoin.ICreate request body using typed random
 *    values and constants for required fields.
 * 2. Call api.functional.auth.admin.join(connection, { body }) and await the
 *    result, letting the SDK configure the connection's Authorization header as
 *    a side effect.
 * 3. Validate the response with typia.assert to guarantee that the
 *    IShoppingMallAdmin.IAuthorized payload (including the nested token) fully
 *    conforms to its DTO definition.
 * 4. Perform a couple of simple business sanity checks on the authorized admin
 *    object, such as non-empty email and non-null token fields.
 */
export async function test_api_admin_sales_by_day_basic_range_query(
  connection: api.IConnection,
) {
  // 1. Prepare admin join body with correct DTO shape
  const joinBody = {
    email: typia.random<string & tags.Format<"email">>(),
    password: typia.random<string & tags.Format<"password">>(),
    href: "https://admin.example.com/join" as string & tags.Format<"uri">,
    referrer: "https://admin.example.com/landing" as string &
      tags.Format<"uri">,
    ip: null,
  } satisfies IShoppingMallAdminJoin.ICreate;

  // 2. Execute join and obtain authorized admin context
  const adminAuthorized: IShoppingMallAdmin.IAuthorized =
    await api.functional.auth.admin.join(connection, {
      body: joinBody,
    });
  typia.assert(adminAuthorized);

  // 3. Basic sanity checks on returned authorization payload
  TestValidator.predicate(
    "authorized admin email should be non-empty",
    adminAuthorized.email.length > 0,
  );
  TestValidator.predicate(
    "authorization token access string should be non-empty",
    adminAuthorized.token.access.length > 0,
  );
  TestValidator.predicate(
    "authorization token refresh string should be non-empty",
    adminAuthorized.token.refresh.length > 0,
  );
}
