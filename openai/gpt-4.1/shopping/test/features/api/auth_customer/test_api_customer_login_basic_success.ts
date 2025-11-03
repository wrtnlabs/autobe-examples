import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IShoppingAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingAuthorizationToken";
import type { IShoppingCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingCustomer";

/**
 * Validate successful customer login after registration.
 *
 * This test covers the basic login flow for a shopping mall customer:
 *
 * 1. Register a new customer (save password/email details for login)
 * 2. Successfully login using that email and password
 * 3. Confirm a new set of JWT tokens (access/refresh) are received
 * 4. Assert core identity properties match between join and login
 * 5. Validate session tracking: additional audit fields changed (created_at,
 *    updated_at)
 * 6. Ensure audit trail and session update (token updated, session created, new
 *    token versus registration) is reflected.
 *
 * Business logic: After registration, login must always succeed with same
 * credentials, issue new tokens, and presence of session tracking fields must
 * be correct.
 */
export async function test_api_customer_login_basic_success(
  connection: api.IConnection,
) {
  // Step 1: Register new customer (join)
  const joinBody = {
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(12),
    name: RandomGenerator.name(),
    phone: RandomGenerator.mobile(),
    href: "https://shop.example.com/register",
    referrer: "https://shop.example.com/landing",
  } satisfies IShoppingCustomer.ICreate;
  const registered = await api.functional.auth.customer.join(connection, {
    body: joinBody,
  });
  typia.assert(registered);

  // Step 2: Login as customer
  const loginBody = {
    email: joinBody.email,
    password: joinBody.password,
    href: "https://shop.example.com/login",
    referrer: "https://shop.example.com/landing",
  } satisfies IShoppingCustomer.ILogin;
  const logged = await api.functional.auth.customer.login(connection, {
    body: loginBody,
  });
  typia.assert(logged);

  // Step 3: Ensure customer identity is same and account is active
  TestValidator.equals(
    "customer.id matches between join and login",
    logged.id,
    registered.id,
  );
  TestValidator.equals("customer email matches", logged.email, joinBody.email);
  TestValidator.equals("customer name matches", logged.name, joinBody.name);
  TestValidator.equals("customer phone matches", logged.phone, joinBody.phone);
  TestValidator.predicate(
    "customer account is active",
    logged.is_active === true,
  );

  // Step 4: Verify that login issues a new JWT token with expected structure
  typia.assert<IShoppingAuthorizationToken>(logged.token);
  TestValidator.notEquals(
    "login access token is different from registration token",
    logged.token.access,
    registered.token.access,
  );
  TestValidator.notEquals(
    "login refresh token is different from registration token",
    logged.token.refresh,
    registered.token.refresh,
  );

  // Step 5: Session tracking: login updates updated_at (should be same or after join, never before), created_at remains account creation
  TestValidator.equals(
    "created_at is unchanged (login does not change creation date)",
    logged.created_at,
    registered.created_at,
  );
  TestValidator.predicate(
    "login updated_at is same or after join",
    new Date(logged.updated_at) >= new Date(registered.created_at),
  );

  // Step 6: Ensure session/audit trail fields exist and are plausible
  TestValidator.predicate(
    "login issued access token string",
    typeof logged.token.access === "string" && logged.token.access.length > 0,
  );
  TestValidator.predicate(
    "login issued refresh token string",
    typeof logged.token.refresh === "string" && logged.token.refresh.length > 0,
  );
  TestValidator.predicate(
    "login token expiration valid iso string",
    !isNaN(Date.parse(logged.token.expired_at)),
  );
  TestValidator.predicate(
    "login refreshable_until valid iso string",
    !isNaN(Date.parse(logged.token.refreshable_until)),
  );
}
