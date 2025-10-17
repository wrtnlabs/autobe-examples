import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IRedditLikeAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikeAdmin";

/**
 * Test administrator registration and initial account state.
 *
 * This test validates the admin registration endpoint and verifies that:
 *
 * - New admin accounts can be created with valid credentials
 * - Registration returns proper authorization tokens
 * - Initial account state has email_verified set to false
 * - Account is not marked as super admin by default
 * - All registration data is properly stored and returned
 *
 * Note: Complete email verification workflow requires access to the email
 * system to retrieve the verification token, which is outside the scope of API
 * E2E tests. The verification token is sent via email and cannot be accessed
 * programmatically in this test environment.
 */
export async function test_api_admin_email_verification_registration_success(
  connection: api.IConnection,
) {
  // Create new admin account through registration
  const adminEmail = typia.random<string & tags.Format<"email">>();
  const adminUsername = RandomGenerator.alphaNumeric(10);
  const adminPassword = RandomGenerator.alphaNumeric(12);

  const registrationData = {
    username: adminUsername,
    email: adminEmail,
    password: adminPassword,
  } satisfies IRedditLikeAdmin.ICreate;

  const createdAdmin: IRedditLikeAdmin.IAuthorized =
    await api.functional.auth.admin.join(connection, {
      body: registrationData,
    });
  typia.assert(createdAdmin);

  // Validate created admin properties match registration data
  TestValidator.equals(
    "admin email matches registration",
    createdAdmin.email,
    adminEmail,
  );
  TestValidator.equals(
    "admin username matches registration",
    createdAdmin.username,
    adminUsername,
  );

  // Validate initial account state
  TestValidator.equals(
    "email not verified initially",
    createdAdmin.email_verified,
    false,
  );
  TestValidator.equals(
    "not super admin by default",
    createdAdmin.is_super_admin,
    false,
  );

  // Validate authorization token structure
  typia.assert<IAuthorizationToken>(createdAdmin.token);
  TestValidator.predicate(
    "access token exists",
    createdAdmin.token.access.length > 0,
  );
  TestValidator.predicate(
    "refresh token exists",
    createdAdmin.token.refresh.length > 0,
  );
  TestValidator.predicate(
    "access token is non-empty string",
    typeof createdAdmin.token.access === "string" &&
      createdAdmin.token.access.length > 0,
  );
  TestValidator.predicate(
    "refresh token is non-empty string",
    typeof createdAdmin.token.refresh === "string" &&
      createdAdmin.token.refresh.length > 0,
  );
}
