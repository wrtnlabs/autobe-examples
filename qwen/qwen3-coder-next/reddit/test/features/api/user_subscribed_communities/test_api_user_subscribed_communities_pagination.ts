import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIRedditPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIRedditPlatformCommunity";
import type { IRedditPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformCommunity";
import type { IRedditPlatformUser } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformUser";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_user_join } from "../../../authorize/authorize_user_join";
import { authorize_user_login } from "../../../authorize/authorize_user_login";
import { authorize_user_refresh } from "../../../authorize/authorize_user_refresh";

export async function test_api_user_subscribed_communities_pagination(
  connection: api.IConnection,
): Promise<void> {
  // Create actor-specific connection for the test user
  const userConnection: api.IConnection = { host: connection.host };
  // Step 1: Register a new user
  const userAuth = await authorize_user_join(userConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "1234",
      username: RandomGenerator.name(),
    } satisfies IRedditPlatformUser.IJoin,
  });
  typia.assert(userAuth);
  // Update connection with the user's authentication token
  userConnection.headers = {
    ...userConnection.headers,
    Authorization: userAuth.token.access,
  };
  // Step 2: Get the user's subscribed communities (with empty initial state)
  const initialSubscriptions =
    await api.functional.redditPlatform.user.users.subscribed_communities.index(
      userConnection,
      {
        userId: "test-user-id",
      },
    );
  typia.assert(initialSubscriptions);
  // Validate response structure
  TestValidator.equals(
    "initial subscriptions count is 0",
    initialSubscriptions.pagination.records,
    0,
  );
  TestValidator.equals(
    "initial data array is empty",
    initialSubscriptions.data.length,
    0,
  );
  // Test with different user to verify proper user isolation
  const otherUserConnection: api.IConnection = { host: connection.host };
  const otherUserAuth = await authorize_user_join(otherUserConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "1234",
      username: RandomGenerator.name(),
    } satisfies IRedditPlatformUser.IJoin,
  });
  typia.assert(otherUserAuth);
  otherUserConnection.headers = {
    ...otherUserConnection.headers,
    Authorization: otherUserAuth.token.access,
  };
  // Get other user's subscriptions (should also be empty or different)
  const otherUserSubscriptions =
    await api.functional.redditPlatform.user.users.subscribed_communities.index(
      otherUserConnection,
      {
        userId: "other-test-user-id",
      },
    );
  typia.assert(otherUserSubscriptions);
}
