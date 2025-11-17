import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSeller";

/**
 * Test successful seller login flow with valid credentials.
 *
 * This test covers the entire authentication flow for a new seller:
 *
 * 1. Seller joins by creating an account via POST /auth/seller/join with valid
 *    email and password.
 * 2. Seller then logs in by POST /auth/seller/login using the same credentials.
 * 3. The returned authorization contains JWT tokens that should be validated.
 * 4. Verify token payload including expiration timestamps.
 *
 * This test ensures that the seller authentication system properly issues
 * tokens and handles login flows with correct credentials.
 */
export async function test_api_seller_login_with_valid_credentials(
  connection: api.IConnection,
) {
  // Step 1-2. Create a new seller account
  const email = typia.random<string & tags.Format<"email">>();
  const password = "1234";
  const authorized: IShoppingMallSeller.IAuthorized =
    await api.functional.auth.seller.join(connection, {
      body: {
        email: email,
        password: password,
      } satisfies IShoppingMallSeller.ICreate,
    });
  typia.assert(authorized);

  // Step 3. Perform login with the exact credentials
  const loginContext = {
    email: authorized.email,
    password: password,
    ip: typia.random<string>(),
    href: "https://example.com/current",
    referrer: "https://example.com/referrer",
  } satisfies IShoppingMallSeller.ILogin;

  const loginAuthorized: IShoppingMallSeller.IAuthorized =
    await api.functional.auth.seller.login(connection, {
      body: loginContext,
    });
  typia.assert(loginAuthorized);

  // Step 4. Validate token properties
  const token: IAuthorizationToken = loginAuthorized.token;
  TestValidator.predicate(
    "access token is non-empty string",
    typeof token.access === "string" && token.access.length > 0,
  );
  TestValidator.predicate(
    "refresh token is non-empty string",
    typeof token.refresh === "string" && token.refresh.length > 0,
  );
  TestValidator.predicate(
    "expired_at is ISO 8601 string",
    typeof token.expired_at === "string" &&
      /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(.\d+)?Z$/.test(token.expired_at),
  );
  TestValidator.predicate(
    "refreshable_until is ISO 8601 string",
    typeof token.refreshable_until === "string" &&
      /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(.\d+)?Z$/.test(
        token.refreshable_until,
      ),
  );

  // Step 5. Validate that expiration timestamps are valid chronological order
  const expiredAtNum = Date.parse(token.expired_at);
  const refreshableUntilNum = Date.parse(token.refreshable_until);
  TestValidator.predicate(
    "refreshable_until after expired_at",
    refreshableUntilNum >= expiredAtNum,
  );
}
