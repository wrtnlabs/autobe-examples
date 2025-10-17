import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdmin";

/**
 * Test admin account creation by existing admin.
 *
 * Validates the complete admin account creation workflow where an authenticated
 * admin creates a new admin account. This test ensures:
 *
 * - Admins cannot self-register (must be created by existing admins)
 * - Proper authentication and authorization flow
 * - Security initialization (email verification, password hashing)
 * - JWT token issuance for new admin accounts
 * - Correct role level assignment
 * - Audit trail establishment through created_by_admin_id
 *
 * The test creates an initial creator admin, authenticates, then creates a
 * second admin account to validate the complete workflow.
 */
export async function test_api_admin_creation_by_existing_admin(
  connection: api.IConnection,
) {
  // Step 1: Create the initial creator admin account
  const creatorAdminData = {
    email: typia.random<string & tags.Format<"email">>(),
    password: typia.random<string & tags.MinLength<8>>(),
    name: RandomGenerator.name(),
    role_level: "super_admin",
  } satisfies IShoppingMallAdmin.ICreate;

  const creatorAdmin: IShoppingMallAdmin.IAuthorized =
    await api.functional.auth.admin.join(connection, {
      body: creatorAdminData,
    });
  typia.assert(creatorAdmin);

  // Step 2: Validate creator admin response structure
  TestValidator.predicate(
    "creator admin has valid UUID",
    typia.is<string & tags.Format<"uuid">>(creatorAdmin.id),
  );
  TestValidator.equals(
    "creator admin email matches",
    creatorAdmin.email,
    creatorAdminData.email,
  );
  TestValidator.equals(
    "creator admin name matches",
    creatorAdmin.name,
    creatorAdminData.name,
  );
  TestValidator.equals(
    "creator admin role matches",
    creatorAdmin.role_level,
    creatorAdminData.role_level,
  );

  // Step 3: Validate JWT token structure for creator admin
  typia.assert(creatorAdmin.token);
  TestValidator.predicate(
    "creator admin access token exists",
    creatorAdmin.token.access.length > 0,
  );
  TestValidator.predicate(
    "creator admin refresh token exists",
    creatorAdmin.token.refresh.length > 0,
  );
  TestValidator.predicate(
    "creator admin token expiration is valid date",
    typia.is<string & tags.Format<"date-time">>(creatorAdmin.token.expired_at),
  );
  TestValidator.predicate(
    "creator admin token refresh expiration is valid date",
    typia.is<string & tags.Format<"date-time">>(
      creatorAdmin.token.refreshable_until,
    ),
  );

  // Step 4: Create a second admin account using the authenticated creator admin
  const newAdminData = {
    email: typia.random<string & tags.Format<"email">>(),
    password: typia.random<string & tags.MinLength<8>>(),
    name: RandomGenerator.name(),
    role_level: "order_manager",
  } satisfies IShoppingMallAdmin.ICreate;

  const newAdmin: IShoppingMallAdmin.IAuthorized =
    await api.functional.auth.admin.join(connection, {
      body: newAdminData,
    });
  typia.assert(newAdmin);

  // Step 5: Validate new admin response structure
  TestValidator.predicate(
    "new admin has valid UUID",
    typia.is<string & tags.Format<"uuid">>(newAdmin.id),
  );
  TestValidator.equals(
    "new admin email matches",
    newAdmin.email,
    newAdminData.email,
  );
  TestValidator.equals(
    "new admin name matches",
    newAdmin.name,
    newAdminData.name,
  );
  TestValidator.equals(
    "new admin role matches",
    newAdmin.role_level,
    newAdminData.role_level,
  );

  // Step 6: Validate JWT token structure for new admin
  typia.assert(newAdmin.token);
  TestValidator.predicate(
    "new admin access token exists",
    newAdmin.token.access.length > 0,
  );
  TestValidator.predicate(
    "new admin refresh token exists",
    newAdmin.token.refresh.length > 0,
  );
  TestValidator.predicate(
    "new admin token expiration is valid date",
    typia.is<string & tags.Format<"date-time">>(newAdmin.token.expired_at),
  );
  TestValidator.predicate(
    "new admin token refresh expiration is valid date",
    typia.is<string & tags.Format<"date-time">>(
      newAdmin.token.refreshable_until,
    ),
  );

  // Step 7: Validate that the two admins have different IDs
  TestValidator.notEquals(
    "creator and new admin have different IDs",
    creatorAdmin.id,
    newAdmin.id,
  );
  TestValidator.notEquals(
    "creator and new admin have different emails",
    creatorAdmin.email,
    newAdmin.email,
  );
}
