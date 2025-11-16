import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdmin";

/**
 * Test successful administrator authentication workflow.
 *
 * This test validates the complete admin authentication process from account
 * creation through successful login. It verifies that:
 *
 * 1. Admin account can be created with valid credentials
 * 2. Admin can authenticate using registered credentials
 * 3. Login returns complete admin profile information
 * 4. Fresh JWT tokens are issued on login (different from registration)
 * 5. Session information is properly recorded for audit trails
 *
 * The test ensures both registration and login endpoints function correctly and
 * that authentication tokens are properly managed across sessions.
 */
export async function test_api_admin_authentication_successful(
  connection: api.IConnection,
) {
  // Step 1: Generate admin registration data with valid credentials
  const email = typia.random<string & tags.Format<"email">>();
  const password = "SecurePassword123!";
  const adminLevel = RandomGenerator.pick([
    "super_admin",
    "moderator",
    "support",
  ] as const);

  const registrationBody = {
    email: email,
    password: password,
    full_name: RandomGenerator.name(),
    phone_number: RandomGenerator.mobile(),
    admin_level: adminLevel,
    email_verified: true,
    ip: undefined,
    href: "https://admin.example.com/register",
    referrer: "https://admin.example.com/home",
  } satisfies IShoppingMallAdmin.ICreate;

  // Step 2: Create admin account via join endpoint
  const registeredAdmin: IShoppingMallAdmin.IAuthorized =
    await api.functional.auth.admin.join(connection, {
      body: registrationBody,
    });
  typia.assert(registeredAdmin);

  // Step 3: Validate registration response structure
  TestValidator.equals(
    "registered admin email matches",
    registeredAdmin.email,
    email,
  );
  TestValidator.equals(
    "registered admin full_name matches",
    registeredAdmin.full_name,
    registrationBody.full_name,
  );
  TestValidator.equals(
    "registered admin phone_number matches",
    registeredAdmin.phone_number,
    registrationBody.phone_number,
  );
  TestValidator.equals(
    "registered admin level matches",
    registeredAdmin.admin_level,
    adminLevel,
  );
  TestValidator.equals(
    "registered admin email_verified matches",
    registeredAdmin.email_verified,
    true,
  );
  TestValidator.predicate(
    "registration token exists",
    registeredAdmin.token.access.length > 0 &&
      registeredAdmin.token.refresh.length > 0,
  );

  // Step 4: Store registration tokens for comparison
  const registrationAccessToken = registeredAdmin.token.access;
  const registrationRefreshToken = registeredAdmin.token.refresh;

  // Step 5: Authenticate using login endpoint with same credentials
  const loginBody = {
    email: email,
    password: password,
    ip: undefined,
    href: "https://admin.example.com/login",
    referrer: "https://admin.example.com/dashboard",
  } satisfies IShoppingMallAdmin.ILogin;

  const authenticatedAdmin: IShoppingMallAdmin.IAuthorized =
    await api.functional.auth.admin.login(connection, {
      body: loginBody,
    });
  typia.assert(authenticatedAdmin);

  // Step 6: Validate login response contains complete admin information
  TestValidator.equals(
    "authenticated admin id matches",
    authenticatedAdmin.id,
    registeredAdmin.id,
  );
  TestValidator.equals(
    "authenticated admin email matches",
    authenticatedAdmin.email,
    email,
  );
  TestValidator.equals(
    "authenticated admin full_name matches",
    authenticatedAdmin.full_name,
    registrationBody.full_name,
  );
  TestValidator.equals(
    "authenticated admin phone_number matches",
    authenticatedAdmin.phone_number,
    registrationBody.phone_number,
  );
  TestValidator.equals(
    "authenticated admin level matches",
    authenticatedAdmin.admin_level,
    adminLevel,
  );
  TestValidator.equals(
    "authenticated admin email_verified matches",
    authenticatedAdmin.email_verified,
    true,
  );

  // Step 7: Validate timestamps exist and are valid
  TestValidator.predicate(
    "created_at is valid",
    authenticatedAdmin.created_at.length > 0,
  );
  TestValidator.predicate(
    "updated_at is valid",
    authenticatedAdmin.updated_at.length > 0,
  );

  // Step 8: Verify fresh JWT tokens were issued (different from registration)
  TestValidator.predicate(
    "login access token exists",
    authenticatedAdmin.token.access.length > 0,
  );
  TestValidator.predicate(
    "login refresh token exists",
    authenticatedAdmin.token.refresh.length > 0,
  );
  TestValidator.notEquals(
    "access token is fresh",
    authenticatedAdmin.token.access,
    registrationAccessToken,
  );
  TestValidator.notEquals(
    "refresh token is fresh",
    authenticatedAdmin.token.refresh,
    registrationRefreshToken,
  );

  // Step 9: Validate token expiration timestamps
  TestValidator.predicate(
    "token has expiration",
    authenticatedAdmin.token.expired_at.length > 0,
  );
  TestValidator.predicate(
    "token has refresh limit",
    authenticatedAdmin.token.refreshable_until.length > 0,
  );
}
