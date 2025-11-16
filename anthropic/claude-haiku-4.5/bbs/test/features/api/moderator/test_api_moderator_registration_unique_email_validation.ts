import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardModerator";

export async function test_api_moderator_registration_unique_email_validation(
  connection: api.IConnection,
) {
  // Step 1: Register first moderator with a unique email
  const firstModeratorEmail = typia.random<string & tags.Format<"email">>();
  const firstModerator: IDiscussionBoardModerator.IAuthorized =
    await api.functional.auth.moderator.join(connection, {
      body: {
        email: firstModeratorEmail,
        username: RandomGenerator.alphaNumeric(10),
        password: "SecurePassword123",
        display_name: RandomGenerator.name(),
      } satisfies IDiscussionBoardModerator.ICreate,
    });
  typia.assert(firstModerator);
  TestValidator.equals(
    "first moderator created with correct email",
    firstModerator.moderator.display_name.length > 0,
    true,
  );

  // Step 2: Attempt to register second moderator with the same email
  await TestValidator.error("duplicate email should fail", async () => {
    await api.functional.auth.moderator.join(connection, {
      body: {
        email: firstModeratorEmail, // Same email as first moderator
        username: RandomGenerator.alphaNumeric(10),
        password: "AnotherPassword456",
        display_name: RandomGenerator.name(),
      } satisfies IDiscussionBoardModerator.ICreate,
    });
  });
}
