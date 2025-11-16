import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomer";
import type { IShoppingMallCustomerAuth } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomerAuth";

/**
 * Verify that customer login rejects unknown email addresses.
 *
 * Business goal
 *
 * - Ensure that POST /auth/customer/login does not authenticate or issue tokens
 *   when a user submits credentials for an email address that does not belong
 *   to any existing customer account.
 * - This protects against accidental authentication of phantom accounts and
 *   confirms that the credential lookup against shopping_mall_auth_credentials
 *   behaves correctly for the "no such email" case.
 *
 * Test strategy
 *
 * 1. Generate a random, well-formed email address that is extremely unlikely to
 *    exist in the database (using RandomGenerator and/or typia tags).
 *
 *    - We rely on test isolation and randomness instead of creating and then
 *         deleting a customer, because the requirement is that the email MUST
 *         be unknown.
 * 2. Construct a full IShoppingMallCustomerAuth.ILogin payload:
 *
 *    - Email: the random email from step 1
 *    - Password: an arbitrary string (format is irrelevant for unknown emails)
 *    - Href: a realistic current page URL such as
 *         "https://customer.example.com/login" (must satisfy
 *         tags.Format<"uri">)
 *    - Referrer: another realistic URL, e.g. "https://customer.example.com/" (also
 *         tags.Format<"uri">)
 *    - Ip: explicitly set to null to exercise the nullable branch where the backend
 *         derives IP from the HTTP connection metadata
 *    - UserAgent: a plausible user agent string
 * 3. Call api.functional.auth.customer.login(connection, { body }) with the
 *    constructed payload.
 * 4. Wrap the API call in TestValidator.error with an async callback and a
 *    descriptive title like "login with unknown customer email must fail" so
 *    that the test passes only when the API call throws an error.
 *
 *    - We do not assert a specific HTTP status code; any HttpError indicates that
 *         the login was rejected.
 * 5. If the API call unexpectedly succeeds (i.e., no error is thrown), let
 *    TestValidator.error fail the test, since this would mean the backend
 *    incorrectly authenticated an unknown customer.
 *
 * Technical constraints
 *
 * - Do NOT touch connection.headers in any way; the SDK manages auth headers
 *   internally.
 * - Use only the imports provided by the template (api, typia, RandomGenerator,
 *   TestValidator, etc.).
 * - Do not attempt to inspect a successful IShoppingMallCustomer.IAuthorized
 *   payload in this test, because success is itself a failure condition here.
 */
export async function test_api_customer_login_rejects_unknown_email(
  connection: api.IConnection,
) {
  // 1. Generate an email address that is extremely unlikely to collide
  const localPart: string = RandomGenerator.alphabets(16);
  const domainPart: string = `invalid-${RandomGenerator.alphabets(8)}.example.test`;
  const unknownEmail: string = `${localPart}@${domainPart}`;

  // 2. Build a realistic login payload for an unknown customer
  const loginBody = {
    email: unknownEmail,
    password: RandomGenerator.alphaNumeric(24),
    ip: null,
    href: "https://customer.example.com/login",
    referrer: "https://customer.example.com/",
    userAgent:
      "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
  } satisfies IShoppingMallCustomerAuth.ILogin;

  // 3. Attempt login and assert that it fails
  await TestValidator.error(
    "login with unknown customer email must fail",
    async () => {
      await api.functional.auth.customer.login(connection, {
        body: loginBody,
      });
    },
  );
}
