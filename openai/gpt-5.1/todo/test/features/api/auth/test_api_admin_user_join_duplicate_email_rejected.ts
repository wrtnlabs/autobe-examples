import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ITodoAppAdminUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppAdminUser";

/**
 * Ensure duplicate admin registration by email is rejected.
 *
 * Business goal
 *
 * - Verify that POST /auth/adminUser/join enforces uniqueness of the
 *   todo_app_adminusers.email column, and that a second registration attempt
 *   with the same email fails gracefully while the first succeeds.
 *
 * Flow
 *
 * 1. Build a valid ITodoAppAdminUser.IJoin payload using a random email, random
 *    password, and optional display_name.
 * 2. Call api.functional.auth.adminUser.join(connection, { body }) to create the
 *    initial admin account.
 *
 *    - Assert the response via typia.assert to confirm it matches
 *         ITodoAppAdminUser.IAuthorized and carries a token.
 * 3. Build a second ITodoAppAdminUser.IJoin payload reusing the same email but
 *    with a different valid password and display_name.
 * 4. Call api.functional.auth.adminUser.join again inside TestValidator.error,
 *    expecting it to throw because the email is already registered.
 * 5. Do not assert on HTTP status code or error message details; simply validate
 *    that an error occurs for the duplicate registration attempt.
 */
export async function test_api_admin_user_join_duplicate_email_rejected(
  connection: api.IConnection,
) {
  // 1. Prepare a unique admin email and password for the first registration
  const email: string & tags.Format<"email"> = typia.random<
    string & tags.Format<"email">
  >();
  const password1: string & tags.Format<"password"> = typia.random<
    string & tags.Format<"password">
  >();
  const displayName1: string = RandomGenerator.name();

  const firstJoinBody = {
    email,
    password: password1,
    display_name: displayName1,
  } satisfies ITodoAppAdminUser.IJoin;

  const firstAuthorized: ITodoAppAdminUser.IAuthorized =
    await api.functional.auth.adminUser.join(connection, {
      body: firstJoinBody,
    });
  typia.assert<ITodoAppAdminUser.IAuthorized>(firstAuthorized);

  // 2. Attempt to register another admin user with the same email
  const password2: string & tags.Format<"password"> = typia.random<
    string & tags.Format<"password">
  >();
  const displayName2: string = RandomGenerator.name();

  const secondJoinBody = {
    email, // same email as first registration
    password: password2,
    display_name: displayName2,
  } satisfies ITodoAppAdminUser.IJoin;

  await TestValidator.error(
    "duplicate adminUser.join with same email must be rejected",
    async () => {
      await api.functional.auth.adminUser.join(connection, {
        body: secondJoinBody,
      });
    },
  );
}
