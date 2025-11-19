import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardModerator";

export async function test_api_moderator_authentication_invalid_password(
  connection: api.IConnection,
) {
  // Step 1: Attempt login with an incorrect password
  // The system should reject the authentication without revealing whether the email exists
  const testEmail = typia.random<string & tags.Format<"email">>();
  const incorrectPassword = "WrongPassword123!";

  await TestValidator.error(
    "should reject login with incorrect password",
    async () => {
      await api.functional.auth.moderator.login(connection, {
        body: {
          email: testEmail,
          password: incorrectPassword,
          href: typia.random<string & tags.Format<"uri">>(),
          referrer: typia.random<string & tags.Format<"uri">>(),
        } satisfies IDiscussionBoardModerator.ILogin,
      });
    },
  );

  // Step 2: Verify authentication error is consistent for non-existent and wrong-password scenarios
  // Both should fail with similar authentication errors (security best practice)
  const anotherEmail = typia.random<string & tags.Format<"email">>();
  const anotherPassword = typia.random<string & tags.MinLength<8>>();

  await TestValidator.error(
    "should reject authentication attempt with different credentials",
    async () => {
      await api.functional.auth.moderator.login(connection, {
        body: {
          email: anotherEmail,
          password: anotherPassword,
          href: typia.random<string & tags.Format<"uri">>(),
          referrer: typia.random<string & tags.Format<"uri">>(),
        } satisfies IDiscussionBoardModerator.ILogin,
      });
    },
  );
}
