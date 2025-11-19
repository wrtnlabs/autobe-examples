import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardModerator";

/**
 * Test moderator registration with duplicate email address.
 *
 * Validates that the moderator registration endpoint enforces email uniqueness
 * constraint. Creates one moderator account successfully, then attempts to
 * register another moderator using the same email address. Verifies that the
 * second registration attempt is rejected with an appropriate error response
 * indicating the email is already in use.
 *
 * Test steps:
 *
 * 1. Register first moderator with email address
 * 2. Attempt to register second moderator with duplicate email
 * 3. Verify the second registration fails with email uniqueness error
 */
export async function test_api_moderator_registration_duplicate_email(
  connection: api.IConnection,
) {
  // Generate unique test data for first moderator
  const email = typia.random<string & tags.Format<"email">>();
  const password = RandomGenerator.alphabets(8) + "A1!";
  const username = typia.random<
    string &
      tags.MinLength<3> &
      tags.MaxLength<50> &
      tags.Pattern<"^[a-zA-Z0-9_]+$">
  >();

  // Step 1: Register first moderator account successfully
  const firstModerator: IDiscussionBoardModerator.IAuthorized =
    await api.functional.auth.moderator.join(connection, {
      body: {
        email: email,
        password: password,
        username: username,
      } satisfies IDiscussionBoardModerator.ICreate,
    });
  typia.assert(firstModerator);
  TestValidator.equals(
    "first moderator email matches input",
    firstModerator.email,
    email,
  );
  TestValidator.equals(
    "first moderator username matches input",
    firstModerator.username,
    username,
  );

  // Step 2: Attempt to register second moderator with duplicate email
  // Should fail due to email uniqueness constraint
  await TestValidator.error(
    "duplicate email registration should fail",
    async () => {
      await api.functional.auth.moderator.join(connection, {
        body: {
          email: email, // Same email as first moderator
          password: RandomGenerator.alphabets(8) + "B2@",
          username: RandomGenerator.alphabets(8),
        } satisfies IDiscussionBoardModerator.ICreate,
      });
    },
  );
}
