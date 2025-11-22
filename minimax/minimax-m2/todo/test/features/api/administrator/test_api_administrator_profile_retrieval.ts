import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ITodoAppAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppAdministrator";

/**
 * Test comprehensive administrator profile retrieval workflow.
 *
 * This E2E test validates the complete administrator account lifecycle from
 * creation to profile retrieval. The test ensures that when a new administrator
 * account is created, all profile data including personal details, role level,
 * status, and timestamps are properly stored and can be successfully retrieved
 * through the administrative API.
 *
 * The workflow includes:
 *
 * 1. Authentication as an existing administrator to establish admin context
 * 2. Creating a new administrator account with comprehensive profile data
 * 3. Retrieving the created administrator's profile through the admin API
 * 4. Validating that all profile data matches the creation data
 * 5. Ensuring proper display of administrative information for oversight purposes
 */
export async function test_api_administrator_profile_retrieval(
  connection: api.IConnection,
) {
  // Step 1: Create first administrator account for authentication context
  const adminEmail = typia.random<string & tags.Format<"email">>();
  const adminAuth = await api.functional.auth.admin.join(connection, {
    body: {
      email: adminEmail,
      password_hash: typia.random<string>(),
      first_name: RandomGenerator.name(1),
      last_name: RandomGenerator.name(1),
      role_level: "super_admin",
      status: "active",
    } satisfies ITodoAppAdministrator.ICreate,
  });
  typia.assert(adminAuth);

  // Step 2: Create new administrator account whose profile will be retrieved
  const newAdminEmail = typia.random<string & tags.Format<"email">>();
  const newAdmin = await api.functional.todoApp.administrators.create(
    connection,
    {
      body: {
        email: newAdminEmail,
        password_hash: typia.random<string>(),
        first_name: "John",
        last_name: "Doe",
        role_level: "admin",
        status: "active",
      } satisfies ITodoAppAdministrator.ICreate,
    },
  );
  typia.assert(newAdmin);

  // Step 3: Retrieve the created administrator's profile
  const retrievedProfile =
    await api.functional.todoApp.admin.administrators.profile.at(connection, {
      administratorId: newAdmin.id,
    });
  typia.assert(retrievedProfile);

  // Step 4: Validate profile data matches creation data
  TestValidator.equals(
    "profile ID should match created admin ID",
    retrievedProfile.id,
    newAdmin.id,
  );

  TestValidator.equals(
    "profile email should match creation email",
    retrievedProfile.email,
    newAdminEmail,
  );

  TestValidator.equals(
    "profile first name should match creation data",
    retrievedProfile.first_name,
    "John",
  );

  TestValidator.equals(
    "profile last name should match creation data",
    retrievedProfile.last_name,
    "Doe",
  );

  TestValidator.equals(
    "profile role level should match creation data",
    retrievedProfile.role_level,
    "admin",
  );

  TestValidator.equals(
    "profile status should match creation data",
    retrievedProfile.status,
    "active",
  );

  // Step 5: Validate timestamp fields exist and are properly formatted
  TestValidator.predicate(
    "profile should have valid creation timestamp",
    typeof retrievedProfile.created_at === "string" &&
      retrievedProfile.created_at.length > 0,
  );

  TestValidator.predicate(
    "profile should have valid update timestamp",
    typeof retrievedProfile.updated_at === "string" &&
      retrievedProfile.updated_at.length > 0,
  );

  // Step 6: Verify timestamps are reasonable (not in the future, not too old)
  const createdAt = new Date(retrievedProfile.created_at);
  const updatedAt = new Date(retrievedProfile.updated_at);
  const now = new Date();

  TestValidator.predicate(
    "creation timestamp should not be in the future",
    createdAt <= now,
  );

  TestValidator.predicate(
    "update timestamp should not be in the future",
    updatedAt <= now,
  );

  TestValidator.predicate(
    "update timestamp should be after or equal to creation timestamp",
    updatedAt >= createdAt,
  );
}
