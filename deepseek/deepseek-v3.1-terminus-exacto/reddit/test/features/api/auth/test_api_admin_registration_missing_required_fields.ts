import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { ICommunityPlatformAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAdmin";
import type { ICommunityPlatformAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAuthorizationToken";

/**
 * Test administrator registration validation and business logic.
 *
 * Validates that the admin registration endpoint properly handles various
 * scenarios including successful registration and business rule violations.
 * Focuses on runtime validation rather than type system testing.
 */
export async function test_api_admin_registration_missing_required_fields(
  connection: api.IConnection,
) {
  // Generate valid admin registration data
  const validAdminData = typia.random<ICommunityPlatformAdmin.ICreate>();

  // Test successful registration with complete data
  const successfulRegistration = await api.functional.auth.admin.join(
    connection,
    {
      body: validAdminData satisfies ICommunityPlatformAdmin.ICreate,
    },
  );
  typia.assert(successfulRegistration);

  TestValidator.equals(
    "successful registration returns authorized admin with matching email",
    successfulRegistration.email,
    validAdminData.email,
  );

  TestValidator.equals(
    "successful registration returns authorized admin with matching display name",
    successfulRegistration.display_name,
    validAdminData.display_name,
  );

  TestValidator.equals(
    "successful registration returns authorized admin with matching admin level",
    successfulRegistration.admin_level,
    validAdminData.admin_level,
  );

  TestValidator.equals(
    "successful registration returns authorized admin with matching super admin status",
    successfulRegistration.is_super_admin,
    validAdminData.is_super_admin,
  );

  TestValidator.predicate(
    "successful registration includes authentication token",
    successfulRegistration.token !== undefined &&
      successfulRegistration.token.access.length > 0,
  );

  // Test duplicate email registration (business logic validation)
  await TestValidator.error(
    "duplicate email registration should fail",
    async () => {
      const duplicateEmailData = {
        email: validAdminData.email,
        password: typia.random<string & tags.Format<"password">>(),
        display_name: RandomGenerator.name(),
        admin_level: validAdminData.admin_level,
        is_super_admin: !validAdminData.is_super_admin,
      } satisfies ICommunityPlatformAdmin.ICreate;

      await api.functional.auth.admin.join(connection, {
        body: duplicateEmailData satisfies ICommunityPlatformAdmin.ICreate,
      });
    },
  );

  // Test registration with different admin data to ensure endpoint functionality
  const secondAdminData = typia.random<ICommunityPlatformAdmin.ICreate>();
  const secondRegistration = await api.functional.auth.admin.join(connection, {
    body: secondAdminData satisfies ICommunityPlatformAdmin.ICreate,
  });
  typia.assert(secondRegistration);

  TestValidator.equals(
    "second registration returns authorized admin with matching data",
    secondRegistration.email,
    secondAdminData.email,
  );
}
