import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ITodoListAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoListAdmin";

/**
 * Test that an administrator can retrieve profile information for other
 * administrator accounts in the system.
 *
 * This test validates the admin user management and oversight capabilities by
 * creating two separate admin accounts and verifying that one admin can
 * successfully retrieve another admin's profile information. The test ensures
 * that the response contains complete admin profile data including email,
 * timestamps, and account status, while confirming that password and other
 * sensitive authentication credentials are properly excluded from the
 * response.
 *
 * Steps:
 *
 * 1. Create first admin account (admin1) through registration
 * 2. Create second admin account (admin2) through registration
 * 3. Using admin2's authentication, retrieve admin1's profile by ID
 * 4. Validate response contains all expected profile fields
 * 5. Verify sensitive data is excluded from response
 */
export async function test_api_admin_profile_retrieval_other_admin(
  connection: api.IConnection,
) {
  // Step 1: Create first admin account (admin1) - the one whose profile will be retrieved
  const admin1Email = typia.random<string & tags.Format<"email">>();
  const admin1Password = typia.random<string & tags.MinLength<8>>();

  const admin1: ITodoListAdmin.IAuthorized =
    await api.functional.auth.admin.join(connection, {
      body: {
        email: admin1Email,
        password: admin1Password,
        href: typia.random<string & tags.Format<"uri">>(),
        referrer: typia.random<string & tags.Format<"uri">>(),
      } satisfies ITodoListAdmin.ICreate,
    });
  typia.assert(admin1);

  // Step 2: Create second admin account (admin2) - the one who will retrieve the profile
  const admin2Email = typia.random<string & tags.Format<"email">>();
  const admin2Password = typia.random<string & tags.MinLength<8>>();

  const admin2: ITodoListAdmin.IAuthorized =
    await api.functional.auth.admin.join(connection, {
      body: {
        email: admin2Email,
        password: admin2Password,
        href: typia.random<string & tags.Format<"uri">>(),
        referrer: typia.random<string & tags.Format<"uri">>(),
      } satisfies ITodoListAdmin.ICreate,
    });
  typia.assert(admin2);

  // Step 3: Using admin2's authentication context, retrieve admin1's profile
  // After admin2's join, admin2's token is active in connection.headers.Authorization
  const retrievedAdminProfile: ITodoListAdmin.ISummary =
    await api.functional.todoList.admin.admins.at(connection, {
      adminId: admin1.id,
    });
  typia.assert(retrievedAdminProfile);

  // Step 4: Validate the retrieved profile contains expected fields
  TestValidator.equals(
    "retrieved admin ID matches",
    retrievedAdminProfile.id,
    admin1.id,
  );

  TestValidator.equals(
    "retrieved admin email matches",
    retrievedAdminProfile.email,
    admin1Email,
  );
}
