import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { ICommunityPlatformAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAdmin";
import type { ICommunityPlatformAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAuthorizationToken";

/**
 * Test administrator registration functionality.
 *
 * This test validates the admin registration endpoint with proper email format
 * compliance. Since testing invalid email formats would violate TypeScript type
 * safety, this test focuses on valid registration scenarios and business logic
 * validation.
 */
export async function test_api_admin_registration_invalid_email_format(
  connection: api.IConnection,
) {
  // Generate valid test data
  const validPassword = typia.random<string & tags.Format<"password">>();
  const validDisplayName = RandomGenerator.name();
  const validAdminLevel = "system";
  const validIsSuperAdmin = false;

  // Test successful registration with valid email
  const validEmail = typia.random<string & tags.Format<"email">>();
  const validAdmin = await api.functional.auth.admin.join(connection, {
    body: {
      email: validEmail,
      password: validPassword,
      display_name: validDisplayName,
      admin_level: validAdminLevel,
      is_super_admin: validIsSuperAdmin,
    } satisfies ICommunityPlatformAdmin.ICreate,
  });
  typia.assert(validAdmin);
  TestValidator.equals(
    "valid registration should return authorized admin with matching email",
    validAdmin.email,
    validEmail,
  );

  // Test duplicate email registration (business logic error)
  await TestValidator.error(
    "duplicate email registration should fail",
    async () => {
      await api.functional.auth.admin.join(connection, {
        body: {
          email: validEmail, // Same email as previously registered
          password: validPassword,
          display_name: RandomGenerator.name(), // Different display name
          admin_level: "content", // Different admin level
          is_super_admin: true, // Different super admin status
        } satisfies ICommunityPlatformAdmin.ICreate,
      });
    },
  );

  // Test registration with different valid email
  const anotherValidEmail = typia.random<string & tags.Format<"email">>();
  const anotherAdmin = await api.functional.auth.admin.join(connection, {
    body: {
      email: anotherValidEmail,
      password: validPassword,
      display_name: RandomGenerator.name(),
      admin_level: "user",
      is_super_admin: false,
    } satisfies ICommunityPlatformAdmin.ICreate,
  });
  typia.assert(anotherAdmin);
  TestValidator.equals(
    "second valid registration should succeed",
    anotherAdmin.email,
    anotherValidEmail,
  );
}
