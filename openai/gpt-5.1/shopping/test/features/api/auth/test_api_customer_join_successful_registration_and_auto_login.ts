import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomer";
import type { IShoppingMallCustomerAuth } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomerAuth";

/**
 * Validate that a new customer can successfully register and is immediately
 * authorized.
 *
 * Business goals
 *
 * - Ensure POST /auth/customer/join accepts a valid
 *   IShoppingMallCustomerAuth.IJoin payload containing credentials (email,
 *   password, name) and session context (href, referrer, ip).
 * - Ensure the endpoint returns an IShoppingMallCustomer.IAuthorized envelope
 *   with:
 *
 *   - Core identity fields (id, email, name, status, isVerified, createdAt,
 *       updatedAt)
 *   - A JWT token bundle (IAuthorizationToken) in `token`
 *   - A summary projection in `customer` consistent with the root identity
 * - Ensure that the join flow behaves as an "auto-login" by issuing tokens
 *   immediately.
 *
 * Steps
 *
 * 1. Build a realistic IShoppingMallCustomerAuth.IJoin request body
 *
 *    - Use a random, unique email
 *    - Use a strong-looking random password
 *    - Use a random human-like name
 *    - Use realistic href and referrer URIs
 *    - Optionally provide an IP address or leave it undefined
 * 2. Call api.functional.auth.customer.join(connection, { body }).
 * 3. Assert the runtime type of the response as IShoppingMallCustomer.IAuthorized
 *    using typia.assert.
 * 4. Validate business logic aspects:
 *
 *    - Root email equals the requested email
 *    - Root name equals the requested name
 *    - Token exists and looks usable (non-empty strings for access/refresh)
 *    - Customer summary exists and has id matching the root id and non-empty
 *         display_name
 * 5. Optionally assert that isVerified is false on initial registration if
 *    present.
 */
export async function test_api_customer_join_successful_registration_and_auto_login(
  connection: api.IConnection,
) {
  // 1. Prepare realistic join payload
  const email: string & tags.Format<"email"> = typia.random<
    string & tags.Format<"email">
  >();
  const password: string = RandomGenerator.alphaNumeric(16);
  const name: string = RandomGenerator.name(2);

  const href: string & tags.Format<"uri"> = typia.random<
    string & tags.Format<"uri">
  >();
  const referrer: string & tags.Format<"uri"> = typia.random<
    string & tags.Format<"uri">
  >();

  // Optional IP: either set a realistic IPv4 or leave undefined
  const ip: string | null | undefined =
    Math.random() < 0.5
      ? typia.random<string & tags.Format<"ipv4">>()
      : undefined;

  const body = {
    email,
    password,
    name,
    href,
    referrer,
    ip,
  } satisfies IShoppingMallCustomerAuth.IJoin;

  // 2. Execute join endpoint
  const authorized: IShoppingMallCustomer.IAuthorized =
    await api.functional.auth.customer.join(connection, {
      body,
    });

  // 3. Runtime type assertion for full envelope
  typia.assert<IShoppingMallCustomer.IAuthorized>(authorized);

  // 4. Business logic validations
  // 4-1. Email and name echo the request
  TestValidator.equals(
    "join: email in response should match requested email",
    authorized.email,
    email,
  );

  TestValidator.equals(
    "join: name in response should match requested name",
    authorized.name,
    name,
  );

  // 4-2. Token presence and basic usability assumptions (non-empty strings)
  const token: IAuthorizationToken = authorized.token;
  TestValidator.predicate(
    "join: access token should be a non-empty string",
    token.access.length > 0,
  );
  TestValidator.predicate(
    "join: refresh token should be a non-empty string",
    token.refresh.length > 0,
  );

  // expired_at and refreshable_until are validated by typia.assert already

  // 4-3. Customer summary consistency
  const summary: IShoppingMallCustomer.ISummary = authorized.customer;
  TestValidator.equals(
    "join: summary.id must match root id",
    summary.id,
    authorized.id,
  );
  TestValidator.predicate(
    "join: summary.display_name must be non-empty",
    summary.display_name.length > 0,
  );

  // 4-4. Optional: isVerified is usually false right after registration
  if (authorized.isVerified !== undefined) {
    TestValidator.predicate(
      "join: isVerified should be false immediately after registration (when present)",
      authorized.isVerified === false,
    );
  }
}
