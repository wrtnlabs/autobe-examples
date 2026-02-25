import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardArticle } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardArticle";
import type { IDiscussionBoardArticleTag } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardArticleTag";
import type { IDiscussionBoardComment } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardComment";
import type { IDiscussionBoardRegisteredUser } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardRegisteredUser";
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

export async function test_api_registered_user_refresh_token_expired_failure(
  connection: api.IConnection,
): Promise<void> {
  // Test scenario for token refresh failure using an expired or invalid refresh token.
  // Step 1: Register a new user to obtain valid tokens.
  const joinConnection: api.IConnection = { host: connection.host };
  const authorized = await authorize_registered_user_join(joinConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "validPassword123",
    },
  });
  typia.assert(authorized);
  // Step 2: Create a new connection that simulates the user with the valid token.
  const userConnection: api.IConnection = { host: connection.host };
  userConnection.headers = { Authorization: authorized.token.access };
  // Step 3: Attempt to refresh tokens using an expired or corrupted refresh token.
  // We deliberately pass an invalid refresh token string.
  const invalidRefreshToken = "invalid-or-expired-refresh-token";
  await TestValidator.httpError(
    "refresh with expired or invalid token should fail",
    401,
    async () => {
      await authorize_registered_user_refresh(userConnection, {
        body: { refreshToken: invalidRefreshToken },
      });
    },
  );
}
