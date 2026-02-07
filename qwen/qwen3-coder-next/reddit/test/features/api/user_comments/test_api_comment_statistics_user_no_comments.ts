import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IRedditPlatformComment } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformComment";
import type { IRedditPlatformUser } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformUser";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_user_join } from "../../../authorize/authorize_user_join";
import { authorize_user_login } from "../../../authorize/authorize_user_login";
import { authorize_user_refresh } from "../../../authorize/authorize_user_refresh";

export async function test_api_comment_statistics_user_no_comments(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create new user with no comment history
  const userConnection: api.IConnection = { host: connection.host };
  const authorized: IRedditPlatformUser.IAuthorized = await authorize_user_join(
    userConnection,
    {
      body: typia.random<IRedditPlatformUser.IJoin>(),
    },
  );
  typia.assert(authorized);
  // Update connection with authentication token
  const authenticatedConnection: api.IConnection = { host: connection.host };
  authenticatedConnection.headers = {
    authorization: `Bearer ${authorized.token.access}`,
  };
  // 2. Get comment statistics for user with no comments
  const statistics: IRedditPlatformComment.IStatistic =
    await api.functional.redditPlatform.user.comments.statistics.index(
      authenticatedConnection,
    );
  typia.assert(statistics);
  // 3. Validate empty statistics (no comments made)
  // The API should return zero-value statistics for users with no comment history
  TestValidator.equals(
    "user has no comments",
    statistics,
    typia.random<IRedditPlatformComment.IStatistic>(),
  );
}
