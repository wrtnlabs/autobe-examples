import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformPost } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformPost";
import type { ICommunityPlatformUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformUser";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageICommunityPlatformPost } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageICommunityPlatformPost";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_user_join } from "../../../authorize/authorize_user_join";
import { authorize_user_login } from "../../../authorize/authorize_user_login";
import { authorize_user_refresh } from "../../../authorize/authorize_user_refresh";

export async function test_api_user_posts_feed_home_with_no_subscriptions(
  connection: api.IConnection,
): Promise<void> {
  // Test retrieving home feed posts for an authenticated user with no community subscriptions.
  // 1. Register a new user and authorize.
  const userConnection: api.IConnection = { host: connection.host };
  await authorize_user_join(userConnection, { body: {} });
  typia.assert(userConnection.headers?.Authorization);
  // 2. Retrieve the home feed posts for this newly registered user.
  const homeFeed =
    await api.functional.communityPlatform.user.posts.feed.home.index(
      userConnection,
    );
  typia.assert(homeFeed);
  // 3. Validate pagination metadata indicating no posts available.
  TestValidator.equals(
    "pagination current page",
    homeFeed.pagination.current,
    1,
  );
  TestValidator.predicate(
    "pagination limit is non-negative",
    homeFeed.pagination.limit >= 0,
  );
  TestValidator.equals(
    "pagination total records",
    homeFeed.pagination.records,
    0,
  );
  TestValidator.equals("pagination total pages", homeFeed.pagination.pages, 0);
  // 4. Validate data array is empty indicating no posts.
  TestValidator.equals("home feed data length", homeFeed.data.length, 0);
}
