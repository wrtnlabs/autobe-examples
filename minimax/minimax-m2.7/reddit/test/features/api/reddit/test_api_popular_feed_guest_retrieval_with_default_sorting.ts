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

export async function test_api_popular_feed_guest_retrieval_with_default_sorting(
  connection: api.IConnection,
): Promise<void> {
  // 1. Guest join to establish session
  const guestConnection: api.IConnection = { host: connection.host };
  await authorize_guest_join(guestConnection, {});
  // 2. Retrieve popular feed with default sorting (hot)
  const popularFeed = await api.functional.redditClone.guest.feed.popular.index(
    guestConnection,
    {
      body: {} satisfies IRedditClonePost.IRequest,
    },
  );
  typia.assert(popularFeed);
  // 3. Validate response structure
  TestValidator.predicate("has pagination", popularFeed.pagination !== null);
  TestValidator.predicate("has data array", Array.isArray(popularFeed.data));
  // 4. Test pagination by requesting different pages
  if (popularFeed.data.length > 0) {
    const secondPage =
      await api.functional.redditClone.guest.feed.popular.index(
        guestConnection,
        {
          body: {
            page: 2,
            limit: 1,
          } satisfies IRedditClonePost.IRequest,
        },
      );
    typia.assert(secondPage);
    // Validate pagination metadata
    TestValidator.equals("current page is 2", secondPage.pagination.current, 2);
    TestValidator.equals("limit is 1", secondPage.pagination.limit, 1);
  }
}
