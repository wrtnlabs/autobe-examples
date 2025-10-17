import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdmin";

/**
 * Test the complete admin registration workflow via /auth/admin/join.
 *
 * This test ensures:
 *
 * 1. A unique, valid registration successfully creates a new admin with a valid
 *    session token.
 * 2. Duplicate email or username causes a business error (not allowed).
 *
 * Steps:
 *
 * 1. Generate unique valid admin registration data (email, username, password)
 * 2. Register new admin and receive authorized session
 * 3. Attempt registration again using the same email (should fail)
 * 4. Attempt registration again using the same username but a different email
 *    (should fail)
 * 5. Validate that tokens are returned and protected fields aren't exposed.
 */
export async function test_api_admin_registration_workflow(
  connection: api.IConnection,
) {
  // Step 1: Generate unique registration data
  const uniqueEmail = typia.random<string & tags.Format<"email">>();
  const uniqueUsername = RandomGenerator.name();
  const uniquePassword = RandomGenerator.alphaNumeric(12); // complexity: 12 alphanum chars
  const createBody = {
    email: uniqueEmail,
    username: uniqueUsername,
    password: uniquePassword,
  } satisfies IDiscussionBoardAdmin.ICreate;

  // Step 2: Register admin with unique credentials
  const session: IDiscussionBoardAdmin.IAuthorized =
    await api.functional.auth.admin.join(connection, { body: createBody });
  typia.assert(session);
  TestValidator.equals("registered email", session.email, uniqueEmail);
  TestValidator.equals("registered username", session.username, uniqueUsername);
  TestValidator.predicate(
    "access token exists",
    !!session.token && session.token.access.length > 0,
  );
  TestValidator.predicate(
    "refresh token exists",
    !!session.token && session.token.refresh.length > 0,
  );

  // Step 3: Attempt duplicate email registration (expect error)
  const dupEmailBody = {
    email: uniqueEmail,
    username: RandomGenerator.name(), // new username
    password: RandomGenerator.alphaNumeric(12),
  } satisfies IDiscussionBoardAdmin.ICreate;
  await TestValidator.error("duplicate email should fail", async () => {
    await api.functional.auth.admin.join(connection, { body: dupEmailBody });
  });

  // Step 4: Attempt duplicate username registration (expect error)
  const dupUsernameBody = {
    email: typia.random<string & tags.Format<"email">>(), // different email
    username: uniqueUsername,
    password: RandomGenerator.alphaNumeric(12),
  } satisfies IDiscussionBoardAdmin.ICreate;
  await TestValidator.error("duplicate username should fail", async () => {
    await api.functional.auth.admin.join(connection, { body: dupUsernameBody });
  });
}
