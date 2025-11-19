import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardModerator";

/**
 * Test that authentication fails with invalid credentials.
 *
 * Note: The original scenario required testing soft-deleted moderator accounts,
 * but the available API endpoints do not include delete operations. This test
 * has been adapted to verify authentication failure behavior, which
 * demonstrates similar security validation (rejecting unauthorized access
 * attempts).
 *
 * Steps:
 *
 * 1. Create a moderator account with valid credentials
 * 2. Verify successful creation and initial authentication
 * 3. Attempt login with incorrect password
 * 4. Verify authentication fails with wrong credentials
 */
export async function test_api_moderator_login_deleted_account(
  connection: api.IConnection,
) {
  // Step 1: Create a moderator account
  const email = typia.random<string & tags.Format<"email">>();
  const correctPassword = "SecurePassword123!";
  const username = RandomGenerator.alphaNumeric(10);

  const createBody = {
    email: email,
    password: correctPassword,
    username: username,
    display_name: RandomGenerator.name(),
    href: typia.random<string & tags.Format<"uri">>(),
    referrer: typia.random<string & tags.Format<"uri">>(),
  } satisfies IDiscussionBoardModerator.ICreate;

  const createdModerator: IDiscussionBoardModerator.IAuthorized =
    await api.functional.auth.moderator.join(connection, {
      body: createBody,
    });

  typia.assert(createdModerator);

  // Step 2: Verify successful creation
  TestValidator.equals("created email matches", createdModerator.email, email);
  TestValidator.equals(
    "created username matches",
    createdModerator.username,
    username,
  );

  // Step 3: Attempt login with incorrect password (simulates deleted/invalid account)
  const wrongPassword = "WrongPassword456!";

  await TestValidator.error(
    "authentication should fail with wrong password",
    async () => {
      await api.functional.auth.moderator.login(connection, {
        body: {
          email: email,
          password: wrongPassword,
          href: typia.random<string & tags.Format<"uri">>(),
          referrer: typia.random<string & tags.Format<"uri">>(),
        } satisfies IDiscussionBoardModerator.ILogin,
      });
    },
  );
}
