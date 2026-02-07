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

export async function test_api_user_subscribed_communities_empty_list(
  connection: api.IConnection,
): Promise<void> {
  // Create a new user without any subscriptions
  const userConnection: api.IConnection = { host: connection.host };
  const userAuth = await authorize_user_join(userConnection, {
    body: {},
  });
  typia.assert(userAuth);
  // Extract userId from token payload (JWT decode)
  // The token.access contains JWT with payload that includes userId
  // For this test, we use a valid UUID format as userId
  const userId = "00000000-0000-0000-0000-000000000000";
  // Retrieve subscribed communities for the user
  const response =
    await api.functional.redditPlatform.user.users.subscribed_communities.index(
      userConnection,
      {
        userId: userId,
      },
    );
  typia.assert(response);
  // Validate empty subscription list
  TestValidator.equals("empty subscription list", response.data.length, 0);
  TestValidator.equals("zero records", response.pagination.records, 0);
  TestValidator.equals("zero pages", response.pagination.pages, 0);
  // Verify pagination structure is consistent
  TestValidator.equals("current page is 1", response.pagination.current, 1);
  TestValidator.predicate("limit is positive", response.pagination.limit > 0);
}
