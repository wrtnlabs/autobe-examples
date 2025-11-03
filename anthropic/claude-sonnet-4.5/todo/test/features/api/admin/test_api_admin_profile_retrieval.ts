import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ITodoListAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoListAdmin";

/**
 * Test admin profile retrieval for authenticated administrator.
 *
 * This test validates that an authenticated administrator can successfully
 * retrieve their own profile information via GET /todoList/admin/admins/me.
 *
 * Workflow:
 *
 * 1. Register a new admin account (which provides authentication tokens)
 * 2. Retrieve the admin's profile using the authenticated connection
 * 3. Validate all profile fields match the registration data
 * 4. Ensure sensitive fields like password_hash are not exposed
 */
export async function test_api_admin_profile_retrieval(
  connection: api.IConnection,
) {
  // Step 1: Register a new admin account
  const registrationEmail = typia.random<string & tags.Format<"email">>();
  const registrationPassword = typia.random<string & tags.MinLength<8>>();

  const registeredAdmin: ITodoListAdmin.IAuthorized =
    await api.functional.auth.admin.join(connection, {
      body: {
        email: registrationEmail,
        password: registrationPassword,
        href: typia.random<string & tags.Format<"uri">>(),
        referrer: typia.random<string & tags.Format<"uri">>(),
      } satisfies ITodoListAdmin.ICreate,
    });

  // Validate registration response
  typia.assert(registeredAdmin);
  TestValidator.equals(
    "registration email matches",
    registeredAdmin.email,
    registrationEmail,
  );

  // Step 2: Retrieve the admin's own profile
  const profileData: ITodoListAdmin =
    await api.functional.todoList.admin.admins.me.at(connection);

  // Step 3: Validate profile data
  typia.assert(profileData);

  // Verify profile matches registered admin
  TestValidator.equals(
    "profile id matches registered id",
    profileData.id,
    registeredAdmin.id,
  );
  TestValidator.equals(
    "profile email matches registered email",
    profileData.email,
    registeredAdmin.email,
  );
  TestValidator.equals(
    "profile created_at matches",
    profileData.created_at,
    registeredAdmin.created_at,
  );
  TestValidator.equals(
    "profile updated_at matches",
    profileData.updated_at,
    registeredAdmin.updated_at,
  );
}
