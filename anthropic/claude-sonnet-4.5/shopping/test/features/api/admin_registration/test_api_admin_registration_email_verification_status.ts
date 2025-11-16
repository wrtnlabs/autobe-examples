import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdmin";

/**
 * Test administrator registration with different email verification statuses.
 *
 * Validates that the admin registration endpoint supports both pre-verified and
 * unverified admin account creation. This test creates two admin accounts with
 * different email_verified values and confirms that the system correctly
 * handles both scenarios, returning the appropriate verification status in each
 * response.
 *
 * Test Flow:
 *
 * 1. Create admin account with email_verified: true (trusted onboarding)
 * 2. Validate response contains email_verified: true and valid tokens
 * 3. Create admin account with email_verified: false (standard registration)
 * 4. Validate response contains email_verified: false and valid tokens
 * 5. Verify both registrations succeed with complete admin data
 */
export async function test_api_admin_registration_email_verification_status(
  connection: api.IConnection,
) {
  // Step 1: Create first admin account with email_verified: true (pre-verified)
  const verifiedAdminEmail = typia.random<string & tags.Format<"email">>();
  const verifiedAdminBody = {
    email: verifiedAdminEmail,
    password: typia.random<string & tags.Format<"password">>(),
    full_name: RandomGenerator.name(),
    phone_number: RandomGenerator.mobile(),
    admin_level: RandomGenerator.pick([
      "super_admin",
      "moderator",
      "support",
    ] as const),
    email_verified: true,
    href: typia.random<string & tags.Format<"uri">>(),
    referrer: typia.random<string & tags.Format<"uri">>(),
  } satisfies IShoppingMallAdmin.ICreate;

  const verifiedAdmin: IShoppingMallAdmin.IAuthorized =
    await api.functional.auth.admin.join(connection, {
      body: verifiedAdminBody,
    });
  typia.assert(verifiedAdmin);

  // Step 2: Validate the verified admin response
  TestValidator.equals(
    "verified admin email should match input",
    verifiedAdmin.email,
    verifiedAdminEmail,
  );
  TestValidator.equals(
    "verified admin email_verified should be true",
    verifiedAdmin.email_verified,
    true,
  );
  TestValidator.equals(
    "verified admin full_name should match input",
    verifiedAdmin.full_name,
    verifiedAdminBody.full_name,
  );
  TestValidator.equals(
    "verified admin phone_number should match input",
    verifiedAdmin.phone_number,
    verifiedAdminBody.phone_number,
  );
  TestValidator.equals(
    "verified admin admin_level should match input",
    verifiedAdmin.admin_level,
    verifiedAdminBody.admin_level,
  );
  TestValidator.predicate(
    "verified admin should have valid token",
    verifiedAdmin.token.access.length > 0,
  );
  TestValidator.predicate(
    "verified admin should have valid refresh token",
    verifiedAdmin.token.refresh.length > 0,
  );

  // Step 3: Create second admin account with email_verified: false (unverified)
  const unverifiedAdminEmail = typia.random<string & tags.Format<"email">>();
  const unverifiedAdminBody = {
    email: unverifiedAdminEmail,
    password: typia.random<string & tags.Format<"password">>(),
    full_name: RandomGenerator.name(),
    phone_number: RandomGenerator.mobile(),
    admin_level: RandomGenerator.pick([
      "super_admin",
      "moderator",
      "support",
    ] as const),
    email_verified: false,
    href: typia.random<string & tags.Format<"uri">>(),
    referrer: typia.random<string & tags.Format<"uri">>(),
  } satisfies IShoppingMallAdmin.ICreate;

  const unverifiedAdmin: IShoppingMallAdmin.IAuthorized =
    await api.functional.auth.admin.join(connection, {
      body: unverifiedAdminBody,
    });
  typia.assert(unverifiedAdmin);

  // Step 4: Validate the unverified admin response
  TestValidator.equals(
    "unverified admin email should match input",
    unverifiedAdmin.email,
    unverifiedAdminEmail,
  );
  TestValidator.equals(
    "unverified admin email_verified should be false",
    unverifiedAdmin.email_verified,
    false,
  );
  TestValidator.equals(
    "unverified admin full_name should match input",
    unverifiedAdmin.full_name,
    unverifiedAdminBody.full_name,
  );
  TestValidator.equals(
    "unverified admin phone_number should match input",
    unverifiedAdmin.phone_number,
    unverifiedAdminBody.phone_number,
  );
  TestValidator.equals(
    "unverified admin admin_level should match input",
    unverifiedAdmin.admin_level,
    unverifiedAdminBody.admin_level,
  );
  TestValidator.predicate(
    "unverified admin should have valid token",
    unverifiedAdmin.token.access.length > 0,
  );
  TestValidator.predicate(
    "unverified admin should have valid refresh token",
    unverifiedAdmin.token.refresh.length > 0,
  );

  // Step 5: Verify both admins have different verification statuses
  TestValidator.notEquals(
    "admin verification statuses should differ",
    verifiedAdmin.email_verified,
    unverifiedAdmin.email_verified,
  );
}
