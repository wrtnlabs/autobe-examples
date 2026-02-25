import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardArticle } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardArticle";
import type { IDiscussionBoardArticleTag } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardArticleTag";
import type { IDiscussionBoardComment } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardComment";
import type { IDiscussionBoardRegisteredUser } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardRegisteredUser";
import type { IDiscussionBoardRegisteredUserPasswordReset } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardRegisteredUserPasswordReset";
import type { IDiscussionBoardSection } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardSection";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_registered_user_join } from "../../../authorize/authorize_registered_user_join";
import { authorize_registered_user_login } from "../../../authorize/authorize_registered_user_login";
import { authorize_registered_user_refresh } from "../../../authorize/authorize_registered_user_refresh";

/**
 * E2E test for successful password reset for a registered user.
 *
 * Due to absence of API to request password reset token, this test simulates
 * the password reset by calling reset API with a randomly generated token,
 * assuming it is valid in test environment, then verifies login with new
 * password.
 *
 * Note: In real environment, token should be obtained by reset request.
 */
export async function test_api_registered_user_password_reset_success(
  connection: api.IConnection,
): Promise<void> {
  // 1. Register a new user and get authorized info with token
  const joinConnection: api.IConnection = { host: connection.host };
  const email = typia.random<string & typia.tags.Format<"email">>();
  const oldPassword = RandomGenerator.alphaNumeric(16);
  const joinResult = await authorize_registered_user_join(joinConnection, {
    body: { email, password: oldPassword },
  });
  typia.assert(joinResult);
  // New connection for authorized user, with auth token set internally
  const userConnection: api.IConnection = { host: connection.host };
  userConnection.headers = { Authorization: joinResult.token.access };
  // 2. Simulate a valid reset token generation
  const validToken = RandomGenerator.alphaNumeric(32);
  // 3. Reset password
  const newPassword = RandomGenerator.alphaNumeric(16);
  // Assert the resetBody to satisfy the expected type
  const resetBody = typia.assert<
    api.functional.discussionBoard.registeredUser.passwordResets.resetPassword.Body
  >({
    token: validToken,
    password: newPassword,
  });
  const resetResponse =
    await api.functional.discussionBoard.registeredUser.passwordResets.resetPassword(
      userConnection,
      { body: resetBody },
    );
  typia.assert(resetResponse);
  // 4. Verify by login with new password
  const loginConnection: api.IConnection = { host: connection.host };
  const loginResult = await authorize_registered_user_login(loginConnection, {
    body: { email, password: newPassword },
  });
  typia.assert(loginResult);
  // 5. Validate the login email matches
  TestValidator.equals("login email matches reset", loginResult.email, email);
}
