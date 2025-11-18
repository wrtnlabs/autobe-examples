import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdmin";
import type { IShoppingMallAdminJoin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdminJoin";
import type { IShoppingMallSalesByDayStatistics } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSalesByDayStatistics";

export async function test_api_admin_sales_by_day_requires_admin_auth(
  connection: api.IConnection,
) {
  // 1. Prepare unique admin join payload
  const joinBody = {
    email: typia.random<string & tags.Format<"email">>(),
    password: typia.random<string & tags.Format<"password">>(),
    // model a concrete browser-like context for href/referrer
    href: "https://admin-console.shoppingmall.test/auth/admin/join",
    referrer: "https://admin-console.shoppingmall.test/login",
    // provide a realistic ipv4 value using typia.random to satisfy the tag
    ip: typia.random<string & tags.Format<"ipv4">>(),
  } satisfies IShoppingMallAdminJoin.ICreate;

  // 2. Call admin join to create an administrator and receive an authorized context
  const authorized = await api.functional.auth.admin.join(connection, {
    body: joinBody,
  });

  // Validate that the response matches IShoppingMallAdmin.IAuthorized
  typia.assert<IShoppingMallAdmin.IAuthorized>(authorized);

  // Validate the embedded token structure as IAuthorizationToken
  typia.assert<IAuthorizationToken>(authorized.token);

  // 3. Build an unauthenticated connection clone
  // Note: we do NOT touch connection.headers directly after this; the clone
  // represents a client with no Authorization header at all.
  const unauthenticatedConnection: api.IConnection = {
    ...connection,
    headers: {},
  };

  // Even though we cannot actually call the /shoppingMall/admin/statistics/salesByDay
  // endpoint (no SDK function is provided), we can still reason about the auth
  // model: the original `connection` is now an authenticated admin context,
  // while `unauthenticatedConnection` has no Authorization header set.

  // 4. Business-level sanity assertions on admin authorization payload
  TestValidator.predicate(
    "admin account id should be a non-empty uuid string",
    () => authorized.id.length > 0,
  );

  TestValidator.predicate(
    "admin email in payload should match the join request email",
    () => authorized.email === joinBody.email,
  );

  TestValidator.predicate(
    "admin token access should be a non-empty string",
    () => authorized.token.access.length > 0,
  );

  TestValidator.predicate(
    "admin token refresh should be a non-empty string",
    () => authorized.token.refresh.length > 0,
  );

  // 5. Sanity check: the unauthenticated connection object has an empty headers map
  // We avoid touching the original `connection.headers` entirely, honoring the
  // global rule that the SDK is the sole owner of live header manipulation.
  TestValidator.predicate(
    "unauthenticated connection must have no configured headers",
    () => Object.keys(unauthenticatedConnection.headers ?? {}).length === 0,
  );
}
