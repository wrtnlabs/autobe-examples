import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardUser } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardUser";
import type { IDiscussionBoardUserPasswordReset } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardUserPasswordReset";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_user_join } from "../../../authorize/authorize_user_join";
import { authorize_user_login } from "../../../authorize/authorize_user_login";
import { authorize_user_refresh } from "../../../authorize/authorize_user_refresh";

/**
 * Test retrieval of a non-existent password reset token.
 *
 * This test verifies that the password reset retrieval endpoint handles
 * non-existent tokens gracefully by creating a user account for context,
 * then attempting to retrieve a password reset token using a randomly
 * generated UUID that does not exist in the system.
 */
export async function test_api_password_reset_retrieval_nonexistent_token(
  connection: api.IConnection,
): Promise<void> {
  // Create a user account for authentication context
  const userConnection: api.IConnection = { host: connection.host };
  await authorize_user_join(userConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      display_name: RandomGenerator.name(),
      bio: RandomGenerator.paragraph({ sentences: 2 }),
    } satisfies IDiscussionBoardUser.IJoin,
  });
  // Generate a random UUID that does not exist in the system
  const nonExistentResetId = typia.random<string & tags.Format<"uuid">>();
  // Attempt to retrieve the non-existent password reset token
  // This should test the system's error handling for invalid reset identifiers
  await TestValidator.error(
    "retrieval of non-existent password reset token",
    async () => {
      await api.functional.discussionBoard.user.password_resets.at(
        userConnection,
        {
          resetId: nonExistentResetId,
        },
      );
    },
  );
}
