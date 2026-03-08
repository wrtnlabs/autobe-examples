import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIRedditPlatformPost } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIRedditPlatformPost";
import type { IRedditPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformCommunity";
import type { IRedditPlatformFile } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformFile";
import type { IRedditPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformMember";
import type { IRedditPlatformPost } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformPost";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";
import { generate_random_reddit_platform_member_communities_create } from "../../../generate/generate_random_reddit_platform_member_communities_create";
import { prepare_random_reddit_platform_community } from "../../../prepare/prepare_random_reddit_platform_community";

export async function test_api_community_feed_top_sorting_with_time_filter(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create member account for authentication
  const memberConnection: api.IConnection = { host: connection.host };
  const member = await authorize_member_join(memberConnection, {
    body: {
      email: typia.random<string & tags.MinLength<1> & tags.MaxLength<255> & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      username: RandomGenerator.name(1),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IRedditPlatformMember.IJoin,
  });
  typia.assert(member);
  // 2. Create test community for feed query
  const community =
    await generate_random_reddit_platform_member_communities_create(
      memberConnection,
      {
        body: {
          name: RandomGenerator.name(2),
          description: RandomGenerator.paragraph({ sentences: 3 }),
        } satisfies IRedditPlatformCommunity.ICreate,
      },
    );
  typia.assert(community);
  // 3. Test community feed with top sorting and different time filters
  const timeFilters: Array<"today" | "week" | "month" | "year" | "all_time"> = [
    "today",
    "week",
    "month",
    "year",
    "all_time",
  ];
  for (const timeFilter of timeFilters) {
    const feed = await api.functional.redditPlatform.feeds.community.index(
      connection,
      {
        communityId: community.id,
        body: {
          sort_by: "top",
          time_filter: timeFilter,
          limit: 20,
          page: 1,
        } satisfies IRedditPlatformPost.IRequest,
      },
    );
    typia.assert(feed);
    // 4. Validate response structure
    TestValidator.equals(
      `feed pagination current page for ${timeFilter}`,
      feed.pagination.current,
      1,
    );
    TestValidator.equals(
      `feed pagination limit for ${timeFilter}`,
      feed.pagination.limit,
      20,
    );
    TestValidator.predicate(
      `feed pagination records non-negative for ${timeFilter}`,
      feed.pagination.records >= 0,
    );
    TestValidator.predicate(
      `feed pagination pages non-negative for ${timeFilter}`,
      feed.pagination.pages >= 0,
    );
    // 5. Validate data array structure
    TestValidator.predicate(
      `feed data is array for ${timeFilter}`,
      Array.isArray(feed.data),
    );
    // 6. Validate each post in feed has required fields
    for (const post of feed.data) {
      typia.assert(post);
      TestValidator.predicate(
        `post has valid UUID id for ${timeFilter}`,
        /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
          post.id,
        ),
      );
      TestValidator.predicate(
        `post has non-empty title for ${timeFilter}`,
        post.title.length > 0,
      );
      TestValidator.predicate(
        `post has non-null vote_score for ${timeFilter}`,
        typeof post.vote_score === "number",
      );
      TestValidator.predicate(
        `post has non-null comment_count for ${timeFilter}`,
        typeof post.comment_count === "number",
      );
      TestValidator.predicate(
        `post has valid created_at for ${timeFilter}`,
        post.created_at.length > 0,
      );
      TestValidator.predicate(
        `post has valid post_type for ${timeFilter}`,
        post.post_type.length > 0,
      );
      TestValidator.predicate(
        `post has preview for ${timeFilter}`,
        typeof post.preview === "string",
      );
    }
    // 7. If posts exist, verify they are sorted by vote_score descending
    if (feed.data.length > 1) {
      for (let i = 1; i < feed.data.length; i++) {
        TestValidator.predicate(
          `posts sorted by vote_score descending for ${timeFilter}`,
          feed.data[i - 1].vote_score >= feed.data[i].vote_score,
        );
      }
    }
  }
}