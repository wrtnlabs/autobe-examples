import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomer";
import type { IShoppingMallCustomerAuth } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomerAuth";

/**
 * Validate that the customer refresh endpoint rejects invalid refresh tokens.
 *
 * Business goal
 *
 * - Ensure that POST /auth/customer/refresh does not issue new JWT tokens when
 *   the provided refresh token is malformed or otherwise invalid.
 * - Verify this at the business-logic level: invalid tokens must cause the
 *   operation to fail instead of returning an IShoppingMallCustomer.IAuthorized
 *   payload.
 *
 * Test workflow
 *
 * 1. Register a legitimate customer via POST /auth/customer/join
 *
 *    - Use a realistic IShoppingMallCustomerAuth.IJoin payload with
 *
 *         - Email: random RFC-compliant email
 *         - Password: simple string
 *         - Name: random name
 *         - Ip: omitted so that backend may infer it
 *         - Href: random URI representing current page
 *         - Referrer: random URI representing referrer
 *    - Capture the returned IShoppingMallCustomer.IAuthorized, and from it the
 *         nested IAuthorizationToken, especially token.refresh.
 *    - Assert the structure of the authorized payload with typia.assert.
 * 2. Attempt refresh with a clearly malformed refresh token
 *
 *    - Build a body: IShoppingMallCustomerAuth.IRefresh where
 *
 *         - RefreshToken is a random gibberish string that cannot possibly be a valid
 *                   token (e.g., RandomGenerator.alphabets(32)).
 *         - UserAgent is a reasonable string (e.g., "jest-e2e-client/1.0").
 *    - Call api.functional.auth.customer.refresh with that body, wrapped in
 *         TestValidator.error so that the expectation is failure.
 *    - This ensures no IShoppingMallCustomer.IAuthorized is ever produced for the
 *         malformed token.
 * 3. Attempt refresh with a tampered token derived from a valid token
 *
 *    - Take the valid refresh token from step 1 and append additional random
 *         characters to create a syntactically similar but invalid token.
 *    - Again create IShoppingMallCustomerAuth.IRefresh with this tampered
 *         refreshToken and a plausible userAgent string.
 *    - Call refresh inside TestValidator.error expecting failure.
 * 4. (Conceptual) expired token case
 *
 *    - Because we cannot directly manipulate server-side time or token expiry in
 *         this test, we cannot guarantee real "expired" semantics here.
 *    - Instead, we conceptually treat any invalid or rejected token as a proxy for
 *         the expiry behavior, relying on the server to enforce its own
 *         policies.
 *
 * Assertions and constraints
 *
 * - Use typia.assert on successful join response only.
 * - For invalid refresh attempts, use TestValidator.error with async callbacks
 *   and always await it.
 * - Do not attempt to inspect HTTP status codes or response bodies from errors:
 *   the contract here is simply that the call must fail.
 * - Never manipulate connection.headers directly; rely on SDK to manage
 *   Authorization header from the join call.
 */
export async function test_api_customer_refresh_with_expired_or_invalid_token(
  connection: api.IConnection,
) {
  // 1. Register a legitimate customer via /auth/customer/join
  const joinBody = {
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(16),
    name: RandomGenerator.name(),
    href: "https://shop.example.com/register",
    referrer: "https://shop.example.com/landing",
  } satisfies IShoppingMallCustomerAuth.IJoin;

  const authorized: IShoppingMallCustomer.IAuthorized =
    await api.functional.auth.customer.join(connection, {
      body: joinBody,
    });
  typia.assert(authorized);

  const validRefreshToken: string = authorized.token.refresh;

  // 2. Malformed refresh token scenario
  const malformedRefreshBody = {
    refreshToken: RandomGenerator.alphaNumeric(32),
    userAgent: "e2e-test-client/1.0 (malformed-token)",
  } satisfies IShoppingMallCustomerAuth.IRefresh;

  await TestValidator.error(
    "refresh with malformed token must fail",
    async () => {
      await api.functional.auth.customer.refresh(connection, {
        body: malformedRefreshBody,
      });
    },
  );

  // 3. Tampered refresh token derived from a valid token
  const tamperedRefreshToken: string = `${validRefreshToken}.${RandomGenerator.alphaNumeric(8)}`;

  const tamperedRefreshBody = {
    refreshToken: tamperedRefreshToken,
    userAgent: "e2e-test-client/1.0 (tampered-token)",
  } satisfies IShoppingMallCustomerAuth.IRefresh;

  await TestValidator.error(
    "refresh with tampered token must fail",
    async () => {
      await api.functional.auth.customer.refresh(connection, {
        body: tamperedRefreshBody,
      });
    },
  );
}
