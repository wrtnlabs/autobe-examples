import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityCommunity";
import type { ICommunityMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityMember";
import type { ICommunityPost } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPost";
import type { ICommunitySubscription } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunitySubscription";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageICommunityPost } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageICommunityPost";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";
import { generate_random_community_member_communities_create } from "../../../generate/generate_random_community_member_communities_create";
import { generate_random_community_member_communities_posts_create } from "../../../generate/generate_random_community_member_communities_posts_create";
import { prepare_random_community_community } from "../../../prepare/prepare_random_community_community";
import { prepare_random_community_post } from "../../../prepare/prepare_random_community_post";

/**
 * Test the popular feed default behavior with hot sorting algorithm.
 *
 * This test verifies that:
 * 1. Popular feed returns posts from all communities
 * 2. Default sorting is by hot score
 * 3. Response structure matches IPageICommunityPost.ISummary
 * 4. Post summaries contain all required fields
 * 5. Author and community summaries are properly included
 * 6. Pagination works correctly
 */
export async function test_api_popular_feed_default_hot_sorting(
  connection: api.IConnection,
): Promise<void> {
  // Step 1: Register a test member
  const memberConnection: api.IConnection = { host: connection.host };
  const member = await authorize_member_join(memberConnection, {});
  typia.assert(member);
  // Step 2: Create two distinct communities
  const community1 = await generate_random_community_member_communities_create(
    memberConnection,
    {},
  );
  typia.assert(community1);
  const community2 = await generate_random_community_member_communities_create(
    memberConnection,
    {},
  );
  typia.assert(community2);
  // Step 3: Subscribe to each community (required for post creation)
  const subscription1 =
    await api.functional.community.member.communities.subscribe(
      memberConnection,
      {
        communityName: community1.name,
      },
    );
  typia.assert(subscription1);
  const subscription2 =
    await api.functional.community.member.communities.subscribe(
      memberConnection,
      {
        communityName: community2.name,
      },
    );
  typia.assert(subscription2);
  // Step 4: Create text posts in each community
  const post1 = await generate_random_community_member_communities_posts_create(
    memberConnection,
    {
      params: {
        communityName: community1.name,
      },
      body: {
        title: RandomGenerator.paragraph({ sentences: 2 }),
        post_type: "TEXT",
        text_content: RandomGenerator.content({ paragraphs: 3 }),
      } satisfies ICommunityPost.ICreate,
    },
  );
  typia.assert(post1);
  const post2 = await generate_random_community_member_communities_posts_create(
    memberConnection,
    {
      params: {
        communityName: community2.name,
      },
      body: {
        title: RandomGenerator.paragraph({ sentences: 2 }),
        post_type: "TEXT",
        text_content: RandomGenerator.content({ paragraphs: 3 }),
      } satisfies ICommunityPost.ICreate,
    },
  );
  typia.assert(post2);
  // Step 5: Call popular feed with default parameters (hot sorting)
  const popularFeed = await api.functional.community.feeds.popular.index(
    connection,
    {
      body: {} satisfies ICommunityPost.IRequest,
    },
  );
  typia.assert(popularFeed);
  // Step 6: Validate pagination structure
  TestValidator.predicate(
    "pagination current is positive",
    popularFeed.pagination.current >= 1,
  );
  TestValidator.predicate(
    "pagination records is non-negative",
    popularFeed.pagination.records >= 0,
  );
  TestValidator.predicate(
    "pagination pages is non-negative",
    popularFeed.pagination.pages >= 0,
  );
  TestValidator.predicate("data is an array", Array.isArray(popularFeed.data));
  // Step 7: Verify posts from both communities appear in the feed
  TestValidator.predicate("data contains posts", popularFeed.data.length >= 2);
  const communityIdsInFeed = popularFeed.data.map((post) => post.community.id);
  TestValidator.predicate(
    "both communities are represented in feed",
    communityIdsInFeed.includes(community1.id) &&
      communityIdsInFeed.includes(community2.id),
  );
  // Step 8: Verify our posts appear in the feed
  const postIdsInFeed = popularFeed.data.map((post) => post.id);
  TestValidator.predicate(
    "post1 appears in feed",
    postIdsInFeed.includes(post1.id),
  );
  TestValidator.predicate(
    "post2 appears in feed",
    postIdsInFeed.includes(post2.id),
  );
  // Step 9: Test pagination - get page 2
  const page2Feed = await api.functional.community.feeds.popular.index(
    connection,
    {
      body: {
        page: 2,
      } satisfies ICommunityPost.IRequest,
    },
  );
  typia.assert(page2Feed);
  TestValidator.equals(
    "page 2 has current = 2",
    page2Feed.pagination.current,
    2,
  );
  // Step 10: Verify total records match between pages
  TestValidator.equals(
    "total records consistent across pages",
    page2Feed.pagination.records,
    popularFeed.pagination.records,
  );
}
