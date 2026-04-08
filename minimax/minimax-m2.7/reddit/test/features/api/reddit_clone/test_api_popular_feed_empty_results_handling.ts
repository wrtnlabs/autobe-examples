import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIRedditClonePost } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIRedditClonePost";
import type { IRedditCloneCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneCommunity";
import type { IRedditCloneGuest } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneGuest";
import type { IRedditCloneMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneMember";
import type { IRedditClonePost } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditClonePost";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_guest_join } from "../../../authorize/authorize_guest_join";
import { authorize_guest_refresh } from "../../../authorize/authorize_guest_refresh";

export async function test_api_popular_feed_empty_results_handling(
  connection: api.IConnection,
): Promise<void> {
  // 1. Establish guest session for API access
  const guestConnection: api.IConnection = { host: connection.host };
  await authorize_guest_join(guestConnection, {});
  // 2. Test empty feed with default parameters (no posts exist yet on platform)
  const emptyFeed = await api.functional.redditClone.guest.feed.popular.index(
    guestConnection,
    {
      body: {} satisfies IRedditClonePost.IRequest,
    },
  );
  typia.assert(emptyFeed);
  // 3. Validate response structure for empty results
  TestValidator.equals("data array should be empty", emptyFeed.data.length, 0);
  TestValidator.equals("records should be 0", emptyFeed.pagination.records, 0);
  TestValidator.equals("pages should be 0", emptyFeed.pagination.pages, 0);
  TestValidator.equals(
    "current page should be 1",
    emptyFeed.pagination.current,
    1,
  );
  // 4. Test with time filter "day" - even more restrictive, should return empty
  const emptyDayFilter =
    await api.functional.redditClone.guest.feed.popular.index(guestConnection, {
      body: {
        sort: "top",
        timeRange: "day",
      } satisfies IRedditClonePost.IRequest,
    });
  typia.assert(emptyDayFilter);
  TestValidator.equals(
    "day filter data should be empty",
    emptyDayFilter.data.length,
    0,
  );
  TestValidator.equals(
    "day filter records should be 0",
    emptyDayFilter.pagination.records,
    0,
  );
  // 5. Test with page number beyond available results
  const pageBeyondResults =
    await api.functional.redditClone.guest.feed.popular.index(guestConnection, {
      body: {
        page: 5,
        limit: 10,
      } satisfies IRedditClonePost.IRequest,
    });
  typia.assert(pageBeyondResults);
  TestValidator.equals(
    "page beyond results data should be empty",
    pageBeyondResults.data.length,
    0,
  );
  TestValidator.equals(
    "page beyond results records should be 0",
    pageBeyondResults.pagination.records,
    0,
  );
  TestValidator.equals(
    "page beyond results pages should be 0",
    pageBeyondResults.pagination.pages,
    0,
  );
  TestValidator.equals(
    "page beyond results current should be 5",
    pageBeyondResults.pagination.current,
    5,
  );
}
