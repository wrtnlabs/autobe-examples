import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ITodoListAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoListAdmin";

/**
 * Test administrator login authentication workflow.
 *
 * This test validates the complete admin authentication process including
 * registration, login, token generation, and session creation. It ensures that
 * administrators can successfully authenticate and receive proper credentials
 * for accessing administrative functions.
 *
 * Workflow:
 *
 * 1. Create a new admin account through registration
 * 2. Authenticate the admin using login credentials
 * 3. Validate JWT tokens and session information
 * 4. Verify admin profile data matches registration
 */
export async function test_api_admin_login_authentication(
  connection: api.IConnection,
) {
  // Step 1: Create a new administrator account for testing
  const adminEmail = typia.random<string & tags.Format<"email">>();
  const adminPassword = typia.random<string & tags.MinLength<8>>();

  const registeredAdmin: ITodoListAdmin.IAuthorized =
    await api.functional.auth.admin.join(connection, {
      body: {
        email: adminEmail,
        password: adminPassword,
        href: typia.random<string & tags.Format<"uri">>(),
        referrer: typia.random<string & tags.Format<"uri">>(),
      } satisfies ITodoListAdmin.ICreate,
    });
  typia.assert(registeredAdmin);

  // Step 2: Authenticate the admin through login endpoint
  const loginResponse: ITodoListAdmin.ILoginResponse =
    await api.functional.todoList.admins.login(connection, {
      body: {
        email: adminEmail,
        password: adminPassword,
        href: typia.random<string & tags.Format<"uri">>(),
        referrer: typia.random<string & tags.Format<"uri">>(),
      } satisfies ITodoListAdmin.ILogin,
    });
  typia.assert(loginResponse);

  // Step 3: Validate JWT token structure
  TestValidator.predicate(
    "access token should be present",
    loginResponse.token.access.length > 0,
  );
  TestValidator.predicate(
    "refresh token should be present",
    loginResponse.token.refresh.length > 0,
  );
  typia.assert<IAuthorizationToken>(loginResponse.token);

  // Step 4: Verify admin profile information matches registration
  TestValidator.equals(
    "login email matches registration email",
    loginResponse.email,
    adminEmail,
  );

  // Step 5: Validate session ID is created
  TestValidator.predicate(
    "session ID should be valid UUID",
    loginResponse.session_id.length > 0,
  );
}
