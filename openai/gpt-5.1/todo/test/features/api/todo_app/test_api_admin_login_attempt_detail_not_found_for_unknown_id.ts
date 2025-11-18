import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ITodoAppAdminUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppAdminUser";
import type { ITodoAppLoginAttempt } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppLoginAttempt";
import type { ITodoAppMemberuser } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppMemberuser";

/**
 * Validate not-found behavior for admin login attempt detail endpoint.
 *
 * This E2E test ensures that GET
 * /todoApp/adminUser/loginAttempts/{loginAttemptId} returns an HTTP not-found
 * error (404) when the specified loginAttemptId does not exist, while valid
 * admin authentication is in place and system state remains unaffected.
 */
export async function test_api_admin_login_attempt_detail_not_found_for_unknown_id(
  connection: api.IConnection,
) {
  // 1. Register an admin user so that we have a legitimate admin actor.
  const adminEmail: string & tags.Format<"email"> = typia.random<
    string & tags.Format<"email">
  >();
  const adminPassword: string & tags.Format<"password"> = typia.random<
    string & tags.Format<"password">
  >();

  const joinBody = {
    email: adminEmail,
    password: adminPassword,
    // display_name is optional; omit it to keep the payload minimal.
  } satisfies ITodoAppAdminUser.IJoin;

  const joinedAdmin: ITodoAppAdminUser.IAuthorized =
    await api.functional.auth.adminUser.join(connection, {
      body: joinBody,
    });
  typia.assert(joinedAdmin);

  // 2. Perform a successful admin login to ensure a real login attempt exists
  //    and to simulate realistic authentication flows.
  const loginBody = {
    email: adminEmail,
    password: adminPassword,
    href: typia.random<string & tags.Format<"uri">>(),
    referrer: typia.random<string & tags.Format<"uri">>(),
    // ip and user_agent are optional; omit for simplicity.
  } satisfies ITodoAppAdminUser.ILogin;

  const loggedInAdmin: ITodoAppAdminUser.IAuthorized =
    await api.functional.auth.adminUser.login(connection, {
      body: loginBody,
    });
  typia.assert(loggedInAdmin);

  // 3. Generate two random UUIDs that are extremely unlikely to match any
  //    existing login attempt IDs. We do not create attempts with these IDs.
  const unknownLoginAttemptId1: string & tags.Format<"uuid"> = typia.random<
    string & tags.Format<"uuid">
  >();
  const unknownLoginAttemptId2: string & tags.Format<"uuid"> = typia.random<
    string & tags.Format<"uuid">
  >();

  // 4. Assert that fetching details for the first unknown loginAttemptId
  //    results in an HTTP 404 not-found error.
  await TestValidator.httpError(
    "admin login attempt detail returns 404 for first unknown id",
    404,
    async () => {
      await api.functional.todoApp.adminUser.loginAttempts.at(connection, {
        loginAttemptId: unknownLoginAttemptId1,
      });
    },
  );

  // 5. Assert that a second unknown loginAttemptId also yields 404, verifying
  //    consistent behavior for different non-existent IDs.
  await TestValidator.httpError(
    "admin login attempt detail returns 404 for second unknown id",
    404,
    async () => {
      await api.functional.todoApp.adminUser.loginAttempts.at(connection, {
        loginAttemptId: unknownLoginAttemptId2,
      });
    },
  );

  // 6. Optional sanity check: ensure that valid IDs still succeed.
  //
  // We cannot directly obtain the ID of the login attempt created by the
  // login call, because the login endpoint returns only the authorized admin
  // context, not the attempt ID. Therefore, we skip a positive-path fetch
  // using a real loginAttemptId here and rely on dedicated tests for
  // /todoApp/adminUser/loginAttempts/:loginAttemptId success behavior.
}
