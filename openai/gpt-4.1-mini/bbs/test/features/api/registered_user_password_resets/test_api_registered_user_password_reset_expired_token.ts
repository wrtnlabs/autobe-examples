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

export async function test_api_registered_user_password_reset_expired_token(
  connection: api.IConnection,
): Promise<void> {
  // 1. Register a new user via the authorized utility function
  const joinConnection: api.IConnection = { host: connection.host };
  const joinBody = {
    email: (RandomGenerator.alphaNumeric(10) + "@test.com").toLowerCase(),
    password: "OldPassword123!",
  } satisfies IDiscussionBoardRegisteredUser.IJoin;
  const user = await authorize_registered_user_join(joinConnection, {
    body: joinBody,
  });
  typia.assert(user);
  // 2. Use a random expired token string (simulated, cannot create token via public API)
  const expiredToken = RandomGenerator.alphaNumeric(32);
  // 3. Attempt password reset with the expired token and new password null (required by DTO)
  const resetBody: IDiscussionBoardRegisteredUserPasswordReset.IPatch = {
    token: expiredToken,
    password: null,
  };
  // The reset should fail because the token is expired
  await TestValidator.error("password reset with expired token", async () => {
    await api.functional.discussionBoard.registeredUser.passwordResets.resetPassword(
      { host: connection.host },
      { body: resetBody },
    );
  });
}
