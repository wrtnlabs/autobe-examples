import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdministrator";

/**
 * Test administrator login authentication workflow for existing accounts.
 *
 * This test validates that an administrator who has previously registered can
 * successfully authenticate using their credentials (email and password) and
 * receive valid JWT tokens for accessing protected administrative endpoints.
 *
 * Test Flow:
 *
 * 1. Register a new administrator account with valid credentials
 * 2. Authenticate the registered administrator using the login endpoint
 * 3. Validate the authentication response structure and token information
 * 4. Verify that the authenticated administrator ID matches the registered account
 */
export async function test_api_administrator_login_existing_account(
  connection: api.IConnection,
) {
  // Step 1: Register a new administrator account to establish existing user context
  const adminEmail = typia.random<string & tags.Format<"email">>();
  const adminPassword = typia.random<
    string & tags.MinLength<8> & tags.MaxLength<128>
  >();
  const adminUsername = typia.random<
    string &
      tags.MinLength<3> &
      tags.MaxLength<30> &
      tags.Pattern<"^[a-zA-Z0-9_-]+$">
  >();

  const registrationData = {
    username: adminUsername,
    email: adminEmail,
    password: adminPassword,
  } satisfies IDiscussionBoardAdministrator.ICreate;

  const registeredAdmin: IDiscussionBoardAdministrator.IAuthorized =
    await api.functional.auth.administrator.join(connection, {
      body: registrationData,
    });
  typia.assert(registeredAdmin);

  // Step 2: Authenticate the registered administrator using login endpoint
  const loginData = {
    email: adminEmail,
    password: adminPassword,
  } satisfies IDiscussionBoardAdministrator.ILogin;

  const authenticatedAdmin: IDiscussionBoardAdministrator.IAuthorized =
    await api.functional.auth.administrator.login(connection, {
      body: loginData,
    });
  typia.assert(authenticatedAdmin);

  // Step 3: Validate that the authenticated administrator ID matches the registered account
  TestValidator.equals(
    "authenticated administrator ID matches registered account",
    authenticatedAdmin.id,
    registeredAdmin.id,
  );
}
