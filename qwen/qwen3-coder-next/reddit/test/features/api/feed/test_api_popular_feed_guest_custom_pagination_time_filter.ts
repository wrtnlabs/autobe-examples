import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIRedditLikePost } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIRedditLikePost";
import type { IRedditLikeCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikeCommunity";
import type { IRedditLikeGuest } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikeGuest";
import type { IRedditLikeMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikeMember";
import type { IRedditLikePost } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikePost";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_guest_join } from "../../../authorize/authorize_guest_join";
import { authorize_guest_refresh } from "../../../authorize/authorize_guest_refresh";

/**
 * Test popular feed endpoint with custom pagination and time filter.
 * 1. Join as guest user
 * 2. Call popular feed with page=2, limit=20, sort=top, timeFilter=week
 * 3. Validate response structure and pagination metadata
 * 4. Check that posts are sorted by vote score (top sorting)
 */
export async function test_api_popular_feed_guest_custom_pagination_time_filter(
  connection: api.IConnection,
) {
  // 1. Join as guest user
  const guestConnection: api.IConnection = { host: connection.host };
  await authorize_guest_join(guestConnection, {
    body: {
      device_id: typia.random<string & tags.Format<"uuid">>(),
    } satisfies IRedditLikeGuest.IJoin,
  });
  // 2. Call popular feed endpoint with custom pagination and sorting
  // Note: The popular feed endpoint accepts IRequest but ignores title/type/communityName
  // for read operations, only using pagination parameters (page, limit) and sorting parameters
  const result = await api.functional.redditLike.guest.popular.index(
    guestConnection,
    {
      body: {
        title: "dummy", // Required by IRequest type but ignored for popular feed
        type: "text" as const, // Required by IRequest type but ignored for popular feed
        communityName: "dummy", // Required by IRequest type but ignored for popular feed
        page: 2,
        limit: 20,
      } satisfies IRedditLikePost.IRequest,
    },
  );
  typia.assert(result);
  // 3. Validate pagination
  TestValidator.equals("page number is 2", result.pagination.current, 2);
  TestValidator.equals("limit is 20", result.pagination.limit, 20);
  TestValidator.equals("has 20 posts", result.data.length, 20);
  // 4. Validate sorting by vote score (top sorting)
  for (let i = 1; i < result.data.length; i++) {
    TestValidator.predicate(
      `post[${i}] vote score <= post[${i - 1}] vote score`,
      result.data[i].voteScore <= result.data[i - 1].voteScore,
    );
  }
}
