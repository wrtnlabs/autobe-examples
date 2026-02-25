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

export async function test_api_password_reset_token_retrieval_success(
  connection: api.IConnection,
): Promise<void> {
  // 1. Join registered user and get authorized connection
  const baseConnection: api.IConnection = { host: connection.host };
  const userJoinBody = {
    email: typia.random<string & tags.Format<"email">>(),
    password: "Password1234!",
  } satisfies IDiscussionBoardRegisteredUser.IJoin;
  const authorizedUser = await authorize_registered_user_join(baseConnection, {
    body: userJoinBody,
  });
  const userConnection: api.IConnection = { host: connection.host };
  userConnection.headers = {
    Authorization: authorizedUser.token.access,
  };
  // 2. Because the password reset creation is not available in API, simulate a password reset UUID
  const passwordResetId = typia.random<string & tags.Format<"uuid">>();
  // 3. Call the API to retrieve the password reset token
  const result =
    await api.functional.discussionBoard.registeredUser.passwordResets.at(
      userConnection,
      { passwordResetId },
    );
  // 4. Validate full structure of response
  typia.assert(result);
  // 5. Validate critical fields of the password reset token
  TestValidator.predicate(
    "token string is non-empty",
    typeof result.token === "string" && result.token.length > 0,
  );
  TestValidator.predicate(
    "expiredAt is a valid date",
    typeof result.expiredAt === "string" &&
      !isNaN(Date.parse(result.expiredAt)),
  );
  TestValidator.predicate(
    "registeredUser is present",
    result.registeredUser !== null && typeof result.registeredUser === "object",
  );
  TestValidator.predicate(
    "registeredUser.id is UUID",
    typeof result.registeredUser.id === "string" &&
      /^[0-9a-fA-F-]{36}$/.test(result.registeredUser.id),
  );
  TestValidator.predicate(
    "registeredUser.email contains '@'",
    typeof result.registeredUser.email === "string" &&
      result.registeredUser.email.includes("@"),
  );
}
