import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIRedditCommunityPost } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIRedditCommunityPost";
import type { IRedditCommunityCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityCommunity";
import type { IRedditCommunityGuest } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityGuest";
import type { IRedditCommunityMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityMember";
import type { IRedditCommunityPost } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityPost";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_guest_join } from "../../../authorize/authorize_guest_join";
import { authorize_guest_refresh } from "../../../authorize/authorize_guest_refresh";

export async function test_api_guest_feed_community_top_sort_time_periods(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create guest account
  const guestConnection: api.IConnection = { host: connection.host };
  const guest = await authorize_guest_join(guestConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: typia.random<string & tags.Format<"password">>(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    },
  });
  typia.assert(guest);
  // 2. Define time periods to test
  const timePeriods: Array<
    "today" | "this_week" | "this_month" | "this_year" | "all_time"
  > = ["today", "this_week", "this_month", "this_year", "all_time"];
  // 3. Use a fixed community ID for testing
  const communityId: string & tags.Format<"uuid"> =
    "550e8400-e29b-41d4-a716-446655440000";
  // 4. Test each time period with top sort
  for (const timePeriod of timePeriods) {
    const feed =
      await api.functional.redditCommunity.guest.feeds.community.index(
        guestConnection,
        {
          communityId,
          body: {
            sort: "top" as const,
            timePeriod,
            pageSize: 20,
          } satisfies IRedditCommunityPost.IRequest,
        },
      );
    typia.assert(feed);
    // 5. Validate pagination structure
    TestValidator.equals(
      "pagination has valid structure",
      feed.pagination.current,
      1,
    );
    TestValidator.predicate(
      "pagination has positive records",
      feed.pagination.records >= 0,
    );
    TestValidator.predicate(
      "pagination has valid pages",
      feed.pagination.pages >= 0,
    );
    // 6. Validate posts are sorted by vote_score descending (if posts exist)
    if (feed.data.length > 1) {
      for (let i = 1; i < feed.data.length; i++) {
        const prevPost = feed.data[i - 1];
        const currPost = feed.data[i];
        TestValidator.predicate(
          `post ${i} has lower or equal vote score than post ${i - 1}`,
          currPost.vote_score <= prevPost.vote_score,
        );
      }
    }
    // 7. Validate each post has valid structure
    for (const post of feed.data) {
      typia.assert(post);
      TestValidator.predicate("post has valid id", post.id.length > 0);
      TestValidator.predicate("post has valid title", post.title.length > 0);
      TestValidator.predicate(
        "post has valid vote score",
        typeof post.vote_score === "number",
      );
      TestValidator.predicate(
        "post has valid comment count",
        typeof post.comment_count === "number",
      );
      TestValidator.predicate(
        "post has valid created_at",
        typeof post.created_at === "string",
      );
    }
  }
}
