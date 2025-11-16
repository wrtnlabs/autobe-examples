import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSeller";

/**
 * Test successful seller login workflow with valid credentials.
 *
 * This test validates that a seller can authenticate using their registered
 * email and password, and receive valid JWT tokens (access and refresh) along
 * with complete seller profile information.
 *
 * The test workflow:
 *
 * 1. Generate valid seller login credentials (email, password, session context)
 * 2. Call the seller login endpoint with the credentials
 * 3. Validate the response contains all expected seller profile fields
 * 4. Verify JWT token structure with proper access and refresh tokens
 * 5. Ensure token expiration timestamps are valid and in the future
 * 6. Confirm all required IShoppingMallSeller.IAuthorized fields are present
 *
 * Note: This test assumes the seller account already exists in the system. The
 * login endpoint validates credentials and returns the authenticated seller
 * profile.
 */
export async function test_api_seller_login_successful_authentication(
  connection: api.IConnection,
) {
  // Generate valid login credentials
  const loginCredentials = {
    email: typia.random<string & tags.Format<"email">>(),
    password: "SecurePassword123!",
    ip: typia.random<string>(),
    href: typia.random<string & tags.Format<"uri">>(),
    referrer: typia.random<string & tags.Format<"uri">>(),
  } satisfies IShoppingMallSeller.ILogin;

  // Execute seller login
  const loginResult: IShoppingMallSeller.IAuthorized =
    await api.functional.auth.seller.login(connection, {
      body: loginCredentials,
    });

  // Validate the complete response structure
  typia.assert(loginResult);

  // Verify seller profile fields exist and are properly typed
  TestValidator.predicate("seller ID is present", loginResult.id.length > 0);
  TestValidator.predicate(
    "seller email is present",
    loginResult.email.length > 0,
  );
  TestValidator.predicate(
    "full name is present",
    loginResult.full_name.length > 0,
  );
  TestValidator.predicate(
    "phone number is present",
    loginResult.phone_number.length > 0,
  );
  TestValidator.predicate(
    "business name is present",
    loginResult.business_name.length > 0,
  );
  TestValidator.predicate(
    "business description is present",
    loginResult.business_description.length > 0,
  );
  TestValidator.predicate(
    "store name is present",
    loginResult.store_name.length > 0,
  );
  TestValidator.predicate("status is present", loginResult.status.length > 0);
  TestValidator.predicate(
    "email verified is boolean",
    typeof loginResult.email_verified === "boolean",
  );

  // Verify timestamp fields are valid
  TestValidator.predicate(
    "created_at is valid",
    new Date(loginResult.created_at).getTime() > 0,
  );
  TestValidator.predicate(
    "updated_at is valid",
    new Date(loginResult.updated_at).getTime() > 0,
  );

  // Verify JWT token structure
  TestValidator.predicate(
    "access token exists",
    loginResult.token.access.length > 0,
  );
  TestValidator.predicate(
    "refresh token exists",
    loginResult.token.refresh.length > 0,
  );

  // Verify token expiration timestamps are in the future
  const now = Date.now();
  const expiredAt = new Date(loginResult.token.expired_at).getTime();
  const refreshableUntil = new Date(
    loginResult.token.refreshable_until,
  ).getTime();

  TestValidator.predicate("access token not yet expired", expiredAt > now);
  TestValidator.predicate(
    "refresh token not yet expired",
    refreshableUntil > now,
  );
  TestValidator.predicate(
    "refresh expiration after access expiration",
    refreshableUntil >= expiredAt,
  );
}
