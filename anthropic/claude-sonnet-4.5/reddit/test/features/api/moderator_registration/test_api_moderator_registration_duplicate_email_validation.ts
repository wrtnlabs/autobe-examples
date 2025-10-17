import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IRedditLikeModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikeModerator";

/**
 * Test duplicate email validation in moderator registration.
 *
 * Validates that the moderator registration endpoint properly enforces email
 * uniqueness across moderator accounts. First registers a moderator with a
 * specific email address, then attempts to register another moderator with the
 * same email but different username, verifying that the second registration
 * fails appropriately.
 *
 * Steps:
 *
 * 1. Register first moderator with valid credentials
 * 2. Verify successful registration and token issuance
 * 3. Attempt to register second moderator with same email, different username
 * 4. Verify registration failure due to duplicate email
 */
export async function test_api_moderator_registration_duplicate_email_validation(
  connection: api.IConnection,
) {
  // Generate unique email for the test
  const sharedEmail = typia.random<string & tags.Format<"email">>();

  // Step 1: Register first moderator with unique credentials
  const firstModeratorData = {
    username: typia.random<
      string &
        tags.MinLength<3> &
        tags.MaxLength<20> &
        tags.Pattern<"^[a-zA-Z0-9_-]+$">
    >(),
    email: sharedEmail,
    password: typia.random<string & tags.MinLength<8>>(),
  } satisfies IRedditLikeModerator.ICreate;

  const firstModerator: IRedditLikeModerator.IAuthorized =
    await api.functional.auth.moderator.join(connection, {
      body: firstModeratorData,
    });

  // Step 2: Verify first registration succeeded
  typia.assert(firstModerator);
  TestValidator.equals(
    "first moderator email matches",
    firstModerator.email,
    sharedEmail,
  );
  TestValidator.equals(
    "first moderator username matches",
    firstModerator.username,
    firstModeratorData.username,
  );
  typia.assert(firstModerator.token);

  // Step 3: Attempt to register second moderator with same email but different username
  const secondModeratorData = {
    username: typia.random<
      string &
        tags.MinLength<3> &
        tags.MaxLength<20> &
        tags.Pattern<"^[a-zA-Z0-9_-]+$">
    >(),
    email: sharedEmail,
    password: typia.random<string & tags.MinLength<8>>(),
  } satisfies IRedditLikeModerator.ICreate;

  // Step 4: Verify registration fails due to duplicate email
  await TestValidator.error(
    "duplicate email registration should fail",
    async () => {
      await api.functional.auth.moderator.join(connection, {
        body: secondModeratorData,
      });
    },
  );
}
