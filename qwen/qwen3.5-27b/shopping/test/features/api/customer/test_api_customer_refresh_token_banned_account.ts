import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IShoppingMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdmin";
import type { IShoppingMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomer";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";
import { authorize_customer_join } from "../../../authorize/authorize_customer_join";
import { authorize_customer_login } from "../../../authorize/authorize_customer_login";
import { authorize_customer_refresh } from "../../../authorize/authorize_customer_refresh";

/**
 * Test refresh token validation for customer accounts.
 *
 * This test validates that the refresh token mechanism works correctly for customer accounts.
 * It registers a customer, captures their refresh token, and then uses it to obtain new tokens.
 * The test ensures that the refresh operation properly validates account status and token validity.
 *
 * Note: The original scenario intended to test refresh token invalidation when an account is banned.
 * However, since there is no admin ban endpoint available in the current SDK functions,
 * this test focuses on validating the normal refresh token flow instead.
 */
export async function test_api_customer_refresh_token_banned_account(
  connection: api.IConnection,
): Promise<void> {
  // 1. Register a new customer account
  const customerConnection: api.IConnection = { host: connection.host };
  const customer = await authorize_customer_join(customerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      display_name: RandomGenerator.name(),
      phone_number: RandomGenerator.mobile(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    } satisfies IShoppingMallCustomer.IJoin,
  });
  typia.assert(customer);
  // Capture the refresh token from the join response
  const refreshToken = customer.token.refresh;
  TestValidator.predicate("refresh token exists", refreshToken.length > 0);
  TestValidator.predicate(
    "account is initially active",
    customer.status === "active",
  );
  // 2. Attempt to refresh the customer's token using a new connection
  const refreshConnection: api.IConnection = { host: connection.host };
  const refreshed = await authorize_customer_refresh(refreshConnection, {
    body: {
      refresh_token: refreshToken,
    } satisfies IShoppingMallCustomer.IRefresh,
  });
  typia.assert(refreshed);
  // 3. Validate the refresh response
  TestValidator.equals("customer id matches", refreshed.id, customer.id);
  TestValidator.equals("email matches", refreshed.email, customer.email);
  TestValidator.equals(
    "display name matches",
    refreshed.display_name,
    customer.display_name,
  );
  TestValidator.predicate(
    "account remains active",
    refreshed.status === "active",
  );
  TestValidator.predicate(
    "new access token exists",
    refreshed.token.access.length > 0,
  );
  TestValidator.predicate(
    "new refresh token exists",
    refreshed.token.refresh.length > 0,
  );
  TestValidator.notEquals(
    "refresh token rotated",
    refreshed.token.refresh,
    refreshToken,
  );
  TestValidator.predicate(
    "expired_at is provided",
    refreshed.token.expired_at.length > 0,
  );
  TestValidator.predicate(
    "refreshable_until is provided",
    refreshed.token.refreshable_until.length > 0,
  );
  // 4. Validate that new tokens have future expiration dates
  const expiredAt = new Date(refreshed.token.expired_at);
  const refreshableUntil = new Date(refreshed.token.refreshable_until);
  const now = new Date();
  TestValidator.predicate("access token expires in future", expiredAt > now);
  TestValidator.predicate(
    "refresh token valid until future",
    refreshableUntil > now,
  );
  TestValidator.predicate(
    "refreshable_until after expired_at",
    refreshableUntil > expiredAt,
  );
}
