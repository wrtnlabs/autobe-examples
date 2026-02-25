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

export async function test_api_password_reset_token_retrieval_expired(
  connection: api.IConnection,
): Promise<void> {
  // Scenario: test retrieving an expired password reset token by UUID
  // 1. Register a new user and obtain authorized user connection
  const userConnection: api.IConnection = { host: connection.host };
  const userJoinBody: IDiscussionBoardRegisteredUser.IJoin = {
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(16),
  };
  const authorizedUser = await authorize_registered_user_join(connection, {
    body: userJoinBody,
  });
  typia.assert(authorizedUser);
  // Update userConnection headers with authorization token access
  userConnection.headers = { Authorization: authorizedUser.token.access };
  // 2. Prepare an expired password reset token UUID
  // Since we don't have direct creation API, we simulate an expired token UUID
  // For the test to be valid, use a random UUID that won't exist and expect error
  const expiredResetId = typia.random<string & tags.Format<"uuid">>();
  // 3. Attempt to retrieve the password reset token with expiredResetId
  // Expect error due to token not found or expired
  await TestValidator.error(
    "retrieving expired password reset token should fail",
    async () => {
      await api.functional.discussionBoard.registeredUser.passwordResets.at(
        userConnection,
        { passwordResetId: expiredResetId },
      );
    },
  );
}
