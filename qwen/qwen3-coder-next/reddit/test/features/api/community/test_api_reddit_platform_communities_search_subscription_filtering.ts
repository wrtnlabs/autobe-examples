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

export async function test_api_reddit_platform_communities_search_subscription_filtering(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create and authenticate a user
  const userConnection: api.IConnection = { host: connection.host };
  const userAuth = await authorize_user_join(userConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "1234",
      name: RandomGenerator.name(),
    } satisfies IRedditPlatformUser.IJoin,
  });
  typia.assert(userAuth);
  // 2. Search communities (unauthenticated search)
  const searchResult =
    await api.functional.redditPlatform.communities.search.index(
      userConnection,
      {
        body: {} satisfies IRedditPlatformCommunity.IRequest,
      },
    );
  typia.assert(searchResult);
  // 3. Verify response structure
  TestValidator.predicate("has pagination", searchResult.pagination !== null);
  TestValidator.predicate("has data array", Array.isArray(searchResult.data));
  TestValidator.predicate(
    "has records count",
    searchResult.pagination.records >= 0,
  );
  TestValidator.predicate(
    "has pages count",
    searchResult.pagination.pages >= 0,
  );
  // 4. Test search with pagination parameters
  const paginatedResult =
    await api.functional.redditPlatform.communities.search.index(
      userConnection,
      {
        body: {
          limit: 10,
          offset: 0,
        } satisfies IRedditPlatformCommunity.IRequest,
      },
    );
  typia.assert(paginatedResult);
  TestValidator.predicate(
    "result limit matches",
    paginatedResult.pagination.limit === 10,
  );
  // 5. Test search with different pagination values
  const anotherResult =
    await api.functional.redditPlatform.communities.search.index(
      userConnection,
      {
        body: {
          limit: 5,
          offset: 5,
        } satisfies IRedditPlatformCommunity.IRequest,
      },
    );
  typia.assert(anotherResult);
}
