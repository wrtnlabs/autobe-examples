import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIRedditPlatformPost } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIRedditPlatformPost";
import type { IRedditPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformCommunity";
import type { IRedditPlatformGuest } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformGuest";
import type { IRedditPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformMember";
import type { IRedditPlatformPost } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformPost";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_guest_join } from "../../../authorize/authorize_guest_join";
import { authorize_guest_refresh } from "../../../authorize/authorize_guest_refresh";

export async function test_api_guest_trending_posts_top_sort_time_range(
  connection: api.IConnection,
): Promise<void> {
  // Create guest session
  const guestConnection: api.IConnection = { host: connection.host };
  const guestAuthorized = await authorize_guest_join(guestConnection, {
    body: {
      fingerprint: typia.random<string>(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    },
  });
  typia.assert(guestAuthorized);
  // Test each time range with sort='top'
  const timeRanges = ["today", "week", "month", "year", "all"] as const;
  for (const timeRange of timeRanges) {
    const response =
      await api.functional.redditPlatform.guest.trending.posts.index(
        guestConnection,
        {
          body: {
            page: 1,
            limit: 10,
            sort: "top",
            topTimeRange: timeRange,
          } satisfies IRedditPlatformPost.IRequest,
        },
      );
    typia.assert(response);
    // Validate response structure
    TestValidator.predicate(
      `${timeRange} response has pagination`,
      response.pagination !== undefined,
    );
    TestValidator.equals(
      `${timeRange} pagination current page`,
      response.pagination.current,
      1,
    );
    TestValidator.equals(
      `${timeRange} pagination limit`,
      response.pagination.limit,
      10,
    );
    TestValidator.predicate(
      `${timeRange} response has data array`,
      Array.isArray(response.data),
    );
    // Validate each post in response
    for (const post of response.data) {
      typia.assert(post);
      TestValidator.predicate(
        `${timeRange} post has id`,
        post.id !== undefined,
      );
      TestValidator.predicate(
        `${timeRange} post has title`,
        post.title !== undefined,
      );
      TestValidator.predicate(
        `${timeRange} post has score`,
        post.upvotes_count !== undefined,
      );
      TestValidator.predicate(
        `${timeRange} post has author`,
        post.author !== undefined,
      );
      TestValidator.predicate(
        `${timeRange} post has community`,
        post.community !== undefined,
      );
    }
  }
  // Test default behavior (no topTimeRange provided)
  const defaultResponse =
    await api.functional.redditPlatform.guest.trending.posts.index(
      guestConnection,
      {
        body: {
          page: 1,
          limit: 10,
          sort: "top",
        } satisfies IRedditPlatformPost.IRequest,
      },
    );
  typia.assert(defaultResponse);
  TestValidator.predicate(
    "default response has pagination",
    defaultResponse.pagination !== undefined,
  );
  TestValidator.predicate(
    "default response has data array",
    Array.isArray(defaultResponse.data),
  );
}
