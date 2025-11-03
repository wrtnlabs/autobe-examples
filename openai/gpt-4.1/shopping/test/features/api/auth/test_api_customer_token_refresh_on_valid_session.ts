import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IShoppingAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingAuthorizationToken";
import type { IShoppingCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingCustomer";

/**
 * Validate customer session token refresh after registration.
 *
 * This test simulates a new customer registration (self-join) on the shopping
 * platform to receive initial JWT tokens. It then exercises the
 * /auth/customer/refresh endpoint with the acquired refresh token. The workflow
 * validates that a new set of access and refresh tokens are issued, that the
 * tokens differ from the previous ones, that the response structure conforms to
 * IShoppingCustomer.IAuthorized, and that session context (href/referrer) can
 * be supplied and is accepted. The join environment and refresh context are
 * randomized for realism. No negative or expired session flows are included.
 *
 * Steps:
 *
 * 1. Register a new customer, receive IShoppingCustomer.IAuthorized
 * 2. Perform token refresh using join response's refresh_token
 * 3. Check both access and refresh tokens differ from before
 * 4. Assert conforming response structure and successful refresh operation
 */
export async function test_api_customer_token_refresh_on_valid_session(
  connection: api.IConnection,
) {
  // 1. Generate session context for registration
  const hrefJoin =
    "https://example.com/register/" + RandomGenerator.alphaNumeric(12);
  const referrerJoin =
    "https://example.com/landing/" + RandomGenerator.alphaNumeric(8);

  // 2. Register a new customer
  const customerCreate = {
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(12),
    name: RandomGenerator.name(),
    phone: RandomGenerator.mobile(),
    href: hrefJoin,
    referrer: referrerJoin,
  } satisfies IShoppingCustomer.ICreate;
  const joinResult: IShoppingCustomer.IAuthorized =
    await api.functional.auth.customer.join(connection, {
      body: customerCreate,
    });
  typia.assert(joinResult);

  // Snapshot original tokens
  const originalToken: IShoppingAuthorizationToken = joinResult.token;
  TestValidator.predicate(
    "original token contains access & refresh",
    typeof originalToken.access === "string" &&
      typeof originalToken.refresh === "string",
  );

  // 3. Construct session context for refresh
  const hrefRefresh =
    "https://app.example.com/account/refresh/" +
    RandomGenerator.alphaNumeric(12);
  const referrerRefresh =
    "https://app.example.com/dashboard/" + RandomGenerator.alphaNumeric(8);
  const refreshPayload = {
    refresh_token: originalToken.refresh,
    href: hrefRefresh,
    referrer: referrerRefresh,
    // Omit ip for simplicity, but could supply a valid IPv4 string
  } satisfies IShoppingCustomer.IRefresh;

  // 4. Refresh the tokens
  const refreshResult: IShoppingCustomer.IAuthorized =
    await api.functional.auth.customer.refresh(connection, {
      body: refreshPayload,
    });
  typia.assert(refreshResult);

  // 5. Check that returned tokens differ (rotation)
  TestValidator.notEquals(
    "new access token is rotated",
    refreshResult.token.access,
    originalToken.access,
  );
  TestValidator.notEquals(
    "new refresh token is rotated",
    refreshResult.token.refresh,
    originalToken.refresh,
  );

  // 6. Confirm response conforms and basic session fields are set
  TestValidator.equals(
    "customer ID stable across session",
    refreshResult.id,
    joinResult.id,
  );
  TestValidator.equals(
    "customer email stable across session",
    refreshResult.email,
    joinResult.email,
  );
  TestValidator.predicate(
    "refreshed token contains access & refresh",
    typeof refreshResult.token.access === "string" &&
      typeof refreshResult.token.refresh === "string",
  );
}
