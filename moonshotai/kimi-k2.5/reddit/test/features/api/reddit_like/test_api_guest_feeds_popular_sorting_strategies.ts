import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIRedditLikePost } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIRedditLikePost";
import type { IRedditLikeAttachment } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikeAttachment";
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

export async function test_api_guest_feeds_popular_sorting_strategies(
  connection: api.IConnection,
): Promise<void> {
  // 1. Authenticate as guest using required dependency
  const guestConnection: api.IConnection = { host: connection.host };
  await authorize_guest_join(guestConnection, {
    body: {
      deviceFingerprint: typia.random<string & tags.Format<"uuid">>(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<(string & tags.Format<"ipv4">) | null>(),
    } satisfies IRedditLikeGuest.IJoin,
  });
  // 2. Test sort='hot' - weighted combination of vote_score and recency
  const hotFeed = await api.functional.redditLike.guest.feeds.popular.index(
    guestConnection,
    {
      body: {
        sort: "hot",
      } satisfies IRedditLikePost.IRequest,
    },
  );
  typia.assert(hotFeed);
  // 3. Test sort='new' - ORDER BY created_at DESC
  const newFeed = await api.functional.redditLike.guest.feeds.popular.index(
    guestConnection,
    {
      body: {
        sort: "new",
      } satisfies IRedditLikePost.IRequest,
    },
  );
  typia.assert(newFeed);
  // 4. Test sort='top' with timeFilter='all_time' - ORDER BY vote_score DESC
  const topFeed = await api.functional.redditLike.guest.feeds.popular.index(
    guestConnection,
    {
      body: {
        sort: "top",
        timeFilter: "all_time",
      } satisfies IRedditLikePost.IRequest,
    },
  );
  typia.assert(topFeed);
  // 5. Test sort='controversial' - high total votes with near-zero net scores
  const controversialFeed =
    await api.functional.redditLike.guest.feeds.popular.index(guestConnection, {
      body: {
        sort: "controversial",
      } satisfies IRedditLikePost.IRequest,
    });
  typia.assert(controversialFeed);
  // 6. Test pagination with explicit page and limit
  const pagedFeed = await api.functional.redditLike.guest.feeds.popular.index(
    guestConnection,
    {
      body: {
        sort: "new",
        page: 1,
        limit: 20,
      } satisfies IRedditLikePost.IRequest,
    },
  );
  typia.assert(pagedFeed);
  // 7. Test all timeFilter options for top sorting
  const timeFilters: Array<"today" | "week" | "month" | "year" | "all_time"> = [
    "today",
    "week",
    "month",
    "year",
    "all_time",
  ];
  for (const timeFilter of timeFilters) {
    const filteredFeed =
      await api.functional.redditLike.guest.feeds.popular.index(
        guestConnection,
        {
          body: {
            sort: "top",
            timeFilter,
          } satisfies IRedditLikePost.IRequest,
        },
      );
    typia.assert(filteredFeed);
  }
  // 8. Test with post type filter to validate type-specific preview fields
  const textPosts = await api.functional.redditLike.guest.feeds.popular.index(
    guestConnection,
    {
      body: {
        sort: "hot",
        postType: "text",
      } satisfies IRedditLikePost.IRequest,
    },
  );
  typia.assert(textPosts);
  const linkPosts = await api.functional.redditLike.guest.feeds.popular.index(
    guestConnection,
    {
      body: {
        sort: "hot",
        postType: "link",
      } satisfies IRedditLikePost.IRequest,
    },
  );
  typia.assert(linkPosts);
  const imagePosts = await api.functional.redditLike.guest.feeds.popular.index(
    guestConnection,
    {
      body: {
        sort: "hot",
        postType: "image",
      } satisfies IRedditLikePost.IRequest,
    },
  );
  typia.assert(imagePosts);
  // 9. Test sort with custom sortBy and sortOrder
  const customSorted =
    await api.functional.redditLike.guest.feeds.popular.index(guestConnection, {
      body: {
        sortBy: "vote_score",
        sortOrder: "desc",
      } satisfies IRedditLikePost.IRequest,
    });
  typia.assert(customSorted);
  // 10. Test default pagination (no page/limit specified)
  const defaultPaged =
    await api.functional.redditLike.guest.feeds.popular.index(guestConnection, {
      body: {} satisfies IRedditLikePost.IRequest,
    });
  typia.assert(defaultPaged);
}
