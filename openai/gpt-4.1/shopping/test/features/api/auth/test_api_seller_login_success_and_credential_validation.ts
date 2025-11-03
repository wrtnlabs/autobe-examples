import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IShoppingAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingAuthorizationToken";
import type { IShoppingSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingSeller";

/**
 * Validate successful seller login flow and credential verification.
 *
 * This test verifies the seller authentication process end-to-end:
 *
 * 1. Register a new seller (dependency setup)
 * 2. Log in as seller using valid email and password
 * 3. Assert returned profile matches registration
 * 4. Validate that tokens (access and refresh) are well-formed
 * 5. Business checks: status is 'pending', is_active is true, and account data is
 *    correct
 *
 * This ensures login only works for valid accounts, and the platform returns
 * the full authorized seller profile with valid JWT tokens.
 */
export async function test_api_seller_login_success_and_credential_validation(
  connection: api.IConnection,
) {
  // 1. Register a new seller (dependency)
  const email: string & tags.Format<"email"> = typia.random<
    string & tags.Format<"email">
  >();
  const password: string & tags.MinLength<8> & tags.MaxLength<128> =
    RandomGenerator.alphaNumeric(12);
  const display_name = RandomGenerator.name();
  const contact_phone = RandomGenerator.mobile();
  const sellerJoinBody = {
    email,
    password,
    display_name,
    contact_phone,
    status: "pending",
  } satisfies IShoppingSeller.IJoin;
  const registered: IShoppingSeller.IAuthorized =
    await api.functional.auth.seller.join(connection, {
      body: sellerJoinBody,
    });
  typia.assert(registered);
  TestValidator.equals("registered email matches", registered.email, email);
  TestValidator.equals(
    "registered display_name matches",
    registered.display_name,
    display_name,
  );
  TestValidator.equals(
    "registered contact_phone matches",
    registered.contact_phone,
    contact_phone,
  );
  TestValidator.equals(
    "registered status is 'pending'",
    registered.status,
    "pending",
  );
  TestValidator.predicate(
    "registered is active",
    registered.is_active === true,
  );
  typia.assert(registered.token);

  // 2. Login as seller using those credentials
  const loginBody = {
    email,
    password,
    // href and referrer are required URIs
    href: "https://shop.test/auth/login", // plausible realistic URL
    referrer: "https://shop.test/", // plausible realistic referrer
  } satisfies IShoppingSeller.ILogin;
  const authorized: IShoppingSeller.IAuthorized =
    await api.functional.auth.seller.login(connection, {
      body: loginBody,
    });
  typia.assert(authorized);
  TestValidator.equals(
    "login seller id matches registration",
    authorized.id,
    registered.id,
  );
  TestValidator.equals("login email matches", authorized.email, email);
  TestValidator.equals(
    "login display_name matches",
    authorized.display_name,
    display_name,
  );
  TestValidator.equals(
    "login contact_phone matches",
    authorized.contact_phone,
    contact_phone,
  );
  TestValidator.equals(
    "login status is 'pending'",
    authorized.status,
    "pending",
  );
  TestValidator.predicate("login is active", authorized.is_active === true);
  TestValidator.notEquals(
    "token should differ from registration (should re-issue)",
    authorized.token.access,
    registered.token.access,
  );
  typia.assert(authorized.token);
  TestValidator.predicate(
    "access token is non-empty",
    typeof authorized.token.access === "string" &&
      authorized.token.access.length > 0,
  );
  TestValidator.predicate(
    "refresh token is non-empty",
    typeof authorized.token.refresh === "string" &&
      authorized.token.refresh.length > 0,
  );
  TestValidator.predicate(
    "access and refresh tokens are different",
    authorized.token.access !== authorized.token.refresh,
  );
}
