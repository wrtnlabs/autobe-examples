import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ITodoListAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoListAdmin";

/**
 * Test admin profile retrieval functionality.
 *
 * Validates that an authenticated administrator can successfully retrieve their
 * own profile information through the GET /todoList/admin/admins/me endpoint.
 * This test ensures the basic self-service profile viewing capability defined
 * in the admin permission matrix.
 *
 * Test workflow:
 *
 * 1. Register a new admin account with valid credentials
 * 2. Retrieve the authenticated admin's profile
 * 3. Validate response structure matches ITodoListAdmin.ISummary schema
 * 4. Verify all required fields are present and properly formatted
 * 5. Confirm profile data matches the registered admin account
 */
export async function test_api_admin_profile_retrieval(
  connection: api.IConnection,
) {
  // Step 1: Register a new admin account
  const adminEmail = typia.random<string & tags.Format<"email">>();
  const adminPassword = "SecurePassword123!";

  const registrationData = {
    email: adminEmail,
    password: adminPassword,
    href: typia.random<string & tags.Format<"uri">>(),
    referrer: typia.random<string & tags.Format<"uri">>(),
  } satisfies ITodoListAdmin.ICreate;

  const registeredAdmin: ITodoListAdmin.IAuthorized =
    await api.functional.auth.admin.join(connection, {
      body: registrationData,
    });

  typia.assert(registeredAdmin);

  // Step 2: Retrieve the admin's profile
  const profile: ITodoListAdmin.ISummary =
    await api.functional.todoList.admin.admins.me.at(connection);

  typia.assert(profile);

  // Step 3: Validate profile data matches registration
  TestValidator.equals(
    "profile id matches registered admin id",
    profile.id,
    registeredAdmin.id,
  );

  TestValidator.equals(
    "profile email matches registered admin email",
    profile.email,
    registeredAdmin.email,
  );

  TestValidator.equals(
    "profile created_at matches registered admin created_at",
    profile.created_at,
    registeredAdmin.created_at,
  );

  TestValidator.equals(
    "profile updated_at matches registered admin updated_at",
    profile.updated_at,
    registeredAdmin.updated_at,
  );
}
