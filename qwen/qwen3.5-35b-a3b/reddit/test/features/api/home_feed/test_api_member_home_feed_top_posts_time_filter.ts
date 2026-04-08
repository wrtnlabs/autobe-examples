import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIRedditCommunityPost } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIRedditCommunityPost";
import type { IRedditCommunityCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityCommunity";
import type { IRedditCommunityMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityMember";
import type { IRedditCommunityPost } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityPost";
import type { IRedditCommunitySubscription } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunitySubscription";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";
import { generate_random_reddit_community_member_subscriptions_create } from "../../../generate/generate_random_reddit_community_member_subscriptions_create";
import { prepare_random_reddit_community_subscription } from "../../../prepare/prepare_random_reddit_community_subscription";

export async function test_api_member_home_feed_top_posts_time_filter(
  connection: api.IConnection,
): Promise<void> {
  // 1. Register and authenticate member
  const memberConnection: api.IConnection = { host: connection.host };
  const member = await api.functional.redditCommunity.auth.member.join(
    memberConnection,
    {
      body: typia.random<IRedditCommunityMember.IJoin>(),
    },
  );
  typia.assert(member);
  // 2. Create subscriptions to communities
  // Use random UUIDs for community IDs (simulated mode will handle)
  const communityId1 = typia.random<string & tags.Format<"uuid">>();
  const communityId2 = typia.random<string & tags.Format<"uuid">>();
  await api.functional.redditCommunity.member.subscriptions.create(
    memberConnection,
    {
      body: { reddit_community_communities_id: communityId1 },
    },
  );
  await api.functional.redditCommunity.member.subscriptions.create(
    memberConnection,
    {
      body: { reddit_community_communities_id: communityId2 },
    },
  );
  // 3. Test home feed with different time_period filters
  const timePeriods: Array<
    "today" | "this_week" | "this_month" | "this_year" | "all_time"
  > = ["today", "this_week", "this_month", "this_year", "all_time"];
  const results: IPageIRedditCommunityPost.ISummary[] = [];
  for (const timePeriod of timePeriods) {
    const result = await api.functional.redditCommunity.member.home_feed.index(
      memberConnection,
      {
        body: {
          sort: "top",
          timePeriod,
          limit: 20,
          page: 1,
        } satisfies IRedditCommunityPost.IRequest,
      },
    );
    typia.assert(result);
    results.push(result);
    // Validate pagination metadata
    TestValidator.equals(
      `${timePeriod} has pagination object`,
      typeof result.pagination.current,
      typeof result.pagination.current,
    );
    TestValidator.equals(
      `${timePeriod} pagination limit is number`,
      typeof result.pagination.limit,
      "number",
    );
    TestValidator.equals(
      `${timePeriod} pagination records is number`,
      typeof result.pagination.records,
      "number",
    );
    TestValidator.equals(
      `${timePeriod} pagination pages is number`,
      typeof result.pagination.pages,
      "number",
    );
    // Validate pagination consistency
    TestValidator.predicate(
      `${timePeriod} pages calculated correctly`,
      result.pagination.pages ===
        Math.ceil(result.pagination.records / result.pagination.limit),
    );
    // Validate data array exists
    TestValidator.predicate(
      `${timePeriod} data is array`,
      Array.isArray(result.data),
    );
    // Validate post structure
    for (const post of result.data) {
      typia.assert(post);
      TestValidator.equals(
        `${timePeriod} post id is string`,
        typeof post.id,
        "string",
      );
      TestValidator.equals(
        `${timePeriod} post title is string`,
        typeof post.title,
        "string",
      );
      TestValidator.equals(
        `${timePeriod} post vote_score is number`,
        typeof post.vote_score,
        "number",
      );
      TestValidator.equals(
        `${timePeriod} post comment_count is number`,
        typeof post.comment_count,
        "number",
      );
      TestValidator.equals(
        `${timePeriod} post created_at is string`,
        typeof post.created_at,
        "string",
      );
    }
  }
  // 4. Validate time filter affects results
  // all_time (index 4) should have >= posts than this_week (index 1)
  const thisWeekResult = results[1];
  const allTimeResult = results[4];
  TestValidator.predicate(
    "all_time has more or equal posts than this_week",
    allTimeResult.data.length >= thisWeekResult.data.length,
  );
  // Validate pagination records count matches data length
  TestValidator.equals(
    "this_week pagination records matches data",
    thisWeekResult.pagination.records,
    thisWeekResult.data.length,
  );
  TestValidator.equals(
    "all_time pagination records matches data",
    allTimeResult.pagination.records,
    allTimeResult.data.length,
  );
}
