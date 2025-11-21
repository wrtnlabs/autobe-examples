import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { ICommunityPlatformAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAdmin";
import type { ICommunityPlatformAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAuthorizationToken";

/**
 * Test successful administrator registration workflow with valid credentials.
 *
 * This test validates the complete admin registration process by creating a new
 * administrator account with proper email format, strong password, display
 * name, admin level, and super admin status. It verifies that the registration
 * creates a valid admin account with authentication tokens and comprehensive
 * profile information including timestamps and security measures.
 */
export async function test_api_admin_registration_success(
  connection: api.IConnection,
) {
  // Generate valid admin registration data
  const adminData = {
    email: typia.random<string & tags.Format<"email">>(),
    password: "StrongPassword123!" satisfies string as string,
    display_name: RandomGenerator.name(),
    admin_level: RandomGenerator.pick([
      "system",
      "content",
      "user",
      "moderation",
    ] as const),
    is_super_admin: RandomGenerator.pick([true, false] as const),
  } satisfies ICommunityPlatformAdmin.ICreate;

  // Register the admin account
  const admin: ICommunityPlatformAdmin.IAuthorized =
    await api.functional.auth.admin.join(connection, {
      body: adminData,
    });

  // Validate the response structure and type safety - this handles ALL validation
  typia.assert(admin);

  // Verify business logic: input data matches response data
  TestValidator.equals(
    "admin email should match input email",
    admin.email,
    adminData.email,
  );
  TestValidator.equals(
    "admin display name should match input display name",
    admin.display_name,
    adminData.display_name,
  );
  TestValidator.equals(
    "admin level should match input admin level",
    admin.admin_level,
    adminData.admin_level,
  );
  TestValidator.equals(
    "super admin status should match input status",
    admin.is_super_admin,
    adminData.is_super_admin,
  );

  // Verify security: password is hashed and not returned in plain text
  TestValidator.notEquals(
    "password hash should not match plain password",
    admin.password_hash,
    adminData.password,
  );
  TestValidator.predicate(
    "password hash should be present and secure",
    admin.password_hash.length > 0 && admin.password_hash !== "",
  );

  // Verify token structure is valid
  typia.assert(admin.token);
  TestValidator.predicate(
    "access token should be present for authentication",
    admin.token.access.length > 0,
  );
  TestValidator.predicate(
    "refresh token should be present for token renewal",
    admin.token.refresh.length > 0,
  );

  // The SDK automatically handles header management - no need to verify connection.headers
}
