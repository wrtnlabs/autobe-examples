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

export async function test_api_registered_user_refresh_token_successful(
  connection: api.IConnection,
): Promise<void> {
  // 1. Register a new user and obtain authorized info including token
  const joinConnection: api.IConnection = { host: connection.host };
  const registerBody = {
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(16),
  } satisfies IDiscussionBoardRegisteredUser.IJoin;
  const authorizedUser = await authorize_registered_user_join(joinConnection, {
    body: registerBody,
  });
  typia.assert(authorizedUser);
  // 2. Refresh tokens using the refresh token received
  const refreshConnection: api.IConnection = { host: connection.host };
  const refreshRequest = {
    refreshToken: authorizedUser.token.refresh,
  } satisfies IDiscussionBoardRegisteredUser.IRefresh;
  const refreshedUser = await authorize_registered_user_refresh(
    refreshConnection,
    {
      body: refreshRequest,
    },
  );
  typia.assert(refreshedUser);
  // 3. Verify that the refreshed tokens are new and valid
  TestValidator.notEquals(
    "access token refreshed",
    refreshedUser.token.access,
    authorizedUser.token.access,
  );
  TestValidator.notEquals(
    "refresh token refreshed",
    refreshedUser.token.refresh,
    authorizedUser.token.refresh,
  );
  // 4. Confirm the user profile data matches original upon refresh
  TestValidator.equals(
    "user ID consistency",
    refreshedUser.id,
    authorizedUser.id,
  );
  TestValidator.equals(
    "user email consistency",
    refreshedUser.email,
    authorizedUser.email,
  );
  TestValidator.equals(
    "user display name consistency",
    refreshedUser.displayName,
    authorizedUser.displayName,
  );
  TestValidator.equals(
    "user bio consistency",
    refreshedUser.bio,
    authorizedUser.bio,
  );
  TestValidator.equals(
    "user banned status consistency",
    refreshedUser.isBanned,
    authorizedUser.isBanned,
  );
  TestValidator.equals(
    "user createdAt consistency",
    refreshedUser.createdAt,
    authorizedUser.createdAt,
  );
  TestValidator.equals(
    "user updatedAt consistency",
    refreshedUser.updatedAt,
    authorizedUser.updatedAt,
  );
  TestValidator.equals(
    "user deletedAt consistency",
    refreshedUser.deletedAt,
    authorizedUser.deletedAt,
  );
  // 5. Confirm articles and comments lists consistency
  TestValidator.equals(
    "user articles list consistency",
    refreshedUser.articles,
    authorizedUser.articles,
  );
  TestValidator.equals(
    "user comments list consistency",
    refreshedUser.comments,
    authorizedUser.comments,
  );
}
