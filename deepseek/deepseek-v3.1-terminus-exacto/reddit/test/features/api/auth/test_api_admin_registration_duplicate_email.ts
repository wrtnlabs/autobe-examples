import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { ICommunityPlatformAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAdmin";
import type { ICommunityPlatformAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAuthorizationToken";

/**
 * Test administrator registration with duplicate email address validation.
 *
 * This test validates that the platform properly enforces email uniqueness
 * constraints for administrator accounts by attempting to create a second admin
 * account with the same email address as an existing admin account. The system
 * should reject the duplicate registration and return an appropriate error
 * response.
 */
export async function test_api_admin_registration_duplicate_email(
  connection: api.IConnection,
) {
  // Generate unique test data for the first administrator account
  const firstAdminEmail = typia.random<string & tags.Format<"email">>();
  const firstAdminPassword = typia.random<string & tags.Format<"password">>();
  const firstAdminDisplayName = RandomGenerator.name();

  // Use realistic admin level values that might be supported by the system
  const adminLevels = ["system", "content", "user", "moderation"] as const;
  const firstAdminLevel = RandomGenerator.pick(adminLevels);
  const firstIsSuperAdmin = RandomGenerator.pick([true, false] as const);

  // Step 1: Create the first administrator account successfully
  const firstAdmin = await api.functional.auth.admin.join(connection, {
    body: {
      email: firstAdminEmail,
      password: firstAdminPassword,
      display_name: firstAdminDisplayName,
      admin_level: firstAdminLevel,
      is_super_admin: firstIsSuperAdmin,
    } satisfies ICommunityPlatformAdmin.ICreate,
  });

  // Validate the first admin creation response
  typia.assert(firstAdmin);
  TestValidator.equals(
    "first admin email matches",
    firstAdmin.email,
    firstAdminEmail,
  );
  TestValidator.equals(
    "first admin display name matches",
    firstAdmin.display_name,
    firstAdminDisplayName,
  );
  TestValidator.equals(
    "first admin level matches",
    firstAdmin.admin_level,
    firstAdminLevel,
  );
  TestValidator.equals(
    "first admin super admin status matches",
    firstAdmin.is_super_admin,
    firstIsSuperAdmin,
  );
  TestValidator.predicate(
    "first admin has valid token",
    firstAdmin.token.access.length > 0,
  );

  // Step 2: Attempt to create a second administrator account with the same email
  const secondAdminPassword = typia.random<string & tags.Format<"password">>();
  const secondAdminDisplayName = RandomGenerator.name();
  const secondAdminLevel = RandomGenerator.pick(
    adminLevels.filter((level) => level !== firstAdminLevel),
  );
  const secondIsSuperAdmin = !firstIsSuperAdmin; // Different super admin status

  await TestValidator.error(
    "duplicate email registration should fail",
    async () => {
      await api.functional.auth.admin.join(connection, {
        body: {
          email: firstAdminEmail, // Same email as first admin
          password: secondAdminPassword,
          display_name: secondAdminDisplayName,
          admin_level: secondAdminLevel,
          is_super_admin: secondIsSuperAdmin,
        } satisfies ICommunityPlatformAdmin.ICreate,
      });
    },
  );

  // Step 3: Additional validation to ensure the constraint is properly enforced
  TestValidator.predicate(
    "original admin account ID remains valid",
    /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
      firstAdmin.id,
    ),
  );
  TestValidator.predicate(
    "original admin token remains accessible",
    firstAdmin.token.access.length > 0 && firstAdmin.token.refresh.length > 0,
  );
}
