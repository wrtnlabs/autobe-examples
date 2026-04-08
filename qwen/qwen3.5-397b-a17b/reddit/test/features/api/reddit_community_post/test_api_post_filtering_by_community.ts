import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIRedditCommunityPost } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIRedditCommunityPost";
import type { IRedditCommunityCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityCommunity";
import type { IRedditCommunityMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityMember";
import type { IRedditCommunityPost } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityPost";
import type { IRedditCommunityPostImageContent } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityPostImageContent";
import type { IRedditCommunityPostLinkContent } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityPostLinkContent";
import type { IRedditCommunityPostTextContent } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityPostTextContent";
import type { IRedditCommunitySubscription } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunitySubscription";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";
import { generate_random_reddit_community_member_communities_create } from "../../../generate/generate_random_reddit_community_member_communities_create";
import { generate_random_reddit_community_member_member_subscriptions_create } from "../../../generate/generate_random_reddit_community_member_member_subscriptions_create";
import { generate_random_reddit_community_posts_create } from "../../../generate/generate_random_reddit_community_posts_create";
import { prepare_random_reddit_community_community } from "../../../prepare/prepare_random_reddit_community_community";
import { prepare_random_reddit_community_post } from "../../../prepare/prepare_random_reddit_community_post";
import { prepare_random_reddit_community_subscription } from "../../../prepare/prepare_random_reddit_community_subscription";

/**
 * Test community-specific post filtering functionality for PATCH /redditCommunity/posts endpoint.
 *
 * Verifies that when communityId filter is provided, only posts belonging to that community are returned. Tests with member user who is subscribed to the community. Validates that posts from other communities are excluded from results. Verifies that the community summary in each post matches the filtered community. Tests edge case where community has no posts (empty data array with valid pagination metadata). Verifies that deleted posts are excluded from results.
 *
 * Test Flow:
 * 1. Create first member account as post author and browser.
 * 2. Create second member account for additional testing.
 * 3. Create first community (target for filtering).
 * 4. Create second community (for exclusion testing).
 * 5. Subscribe first member to first community.
 * 6. Subscribe first member to second community.
 * 7. Create multiple posts in first community (text, link, image types).
 * 8. Create multiple posts in second community.
 * 9. Query posts with communityId filter for first community.
 * 10. Validate all returned posts belong to first community only.
 * 11. Validate no posts from second community are included.
 * 12. Test empty community scenario (query community with no posts).
 * 13. Validate pagination metadata is correct for empty results.
 */
export async function test_api_post_filtering_by_community(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create first member account (author/browser)
  const member1Connection: api.IConnection = { host: connection.host };
  const member1Auth = await authorize_member_join(member1Connection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      username: RandomGenerator.name(1),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    } satisfies IRedditCommunityMember.IJoin,
  });
  typia.assert(member1Auth);
  // 2. Create second member account
  const member2Connection: api.IConnection = { host: connection.host };
  const member2Auth = await authorize_member_join(member2Connection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      username: RandomGenerator.name(1),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    } satisfies IRedditCommunityMember.IJoin,
  });
  typia.assert(member2Auth);
  // 3. Create first community (target for filtering)
  const community1 =
    await generate_random_reddit_community_member_communities_create(
      member1Connection,
      {},
    );
  typia.assert(community1);
  // 4. Create second community (for exclusion testing)
  const community2 =
    await generate_random_reddit_community_member_communities_create(
      member1Connection,
      {},
    );
  typia.assert(community2);
  // 5. Subscribe first member to first community
  const subscription1 =
    await generate_random_reddit_community_member_member_subscriptions_create(
      member1Connection,
      {
        body: {
          community_id: community1.id,
        } satisfies IRedditCommunitySubscription.ICreate,
      },
    );
  typia.assert(subscription1);
  // 6. Subscribe first member to second community
  const subscription2 =
    await generate_random_reddit_community_member_member_subscriptions_create(
      member1Connection,
      {
        body: {
          community_id: community2.id,
        } satisfies IRedditCommunitySubscription.ICreate,
      },
    );
  typia.assert(subscription2);
  // 7. Create multiple posts in first community (different types)
  const post1Community1 = await generate_random_reddit_community_posts_create(
    member1Connection,
    {
      body: {
        title: RandomGenerator.paragraph({ sentences: 1 }),
        post_type: "text",
        community_id: community1.id,
        body: RandomGenerator.content({ paragraphs: 2 }),
      } satisfies IRedditCommunityPost.ICreate,
    },
  );
  typia.assert(post1Community1);
  const post2Community1 = await generate_random_reddit_community_posts_create(
    member1Connection,
    {
      body: {
        title: RandomGenerator.paragraph({ sentences: 1 }),
        post_type: "link",
        community_id: community1.id,
        url: typia.random<string & tags.Format<"uri">>(),
      } satisfies IRedditCommunityPost.ICreate,
    },
  );
  typia.assert(post2Community1);
  const post3Community1 = await generate_random_reddit_community_posts_create(
    member1Connection,
    {
      body: {
        title: RandomGenerator.paragraph({ sentences: 1 }),
        post_type: "image",
        community_id: community1.id,
        image_url: typia.random<string & tags.Format<"uri">>(),
      } satisfies IRedditCommunityPost.ICreate,
    },
  );
  typia.assert(post3Community1);
  // 8. Create multiple posts in second community
  const post1Community2 = await generate_random_reddit_community_posts_create(
    member1Connection,
    {
      body: {
        title: RandomGenerator.paragraph({ sentences: 1 }),
        post_type: "text",
        community_id: community2.id,
        body: RandomGenerator.content({ paragraphs: 2 }),
      } satisfies IRedditCommunityPost.ICreate,
    },
  );
  typia.assert(post1Community2);
  const post2Community2 = await generate_random_reddit_community_posts_create(
    member1Connection,
    {
      body: {
        title: RandomGenerator.paragraph({ sentences: 1 }),
        post_type: "link",
        community_id: community2.id,
        url: typia.random<string & tags.Format<"uri">>(),
      } satisfies IRedditCommunityPost.ICreate,
    },
  );
  typia.assert(post2Community2);
  // 9. Query posts with communityId filter for first community
  const filteredPosts = await api.functional.redditCommunity.posts.index(
    member1Connection,
    {
      body: {
        communityId: community1.id,
        sort: "new",
        take: 10,
      } satisfies IRedditCommunityPost.IRequest,
    },
  );
  typia.assert(filteredPosts);
  // 10. Validate all returned posts belong to first community only
  TestValidator.predicate(
    "all posts belong to first community",
    filteredPosts.data.every((post) => post.community.id === community1.id),
  );
  TestValidator.predicate(
    "posts count matches created posts in community1",
    filteredPosts.data.length >= 3,
  );
  // 11. Validate no posts from second community are included
  const hasCommunity2Posts = filteredPosts.data.some(
    (post) => post.community.id === community2.id,
  );
  TestValidator.predicate(
    "no posts from second community included",
    !hasCommunity2Posts,
  );
  // 12. Test empty community scenario - create third community with no posts
  const community3 =
    await generate_random_reddit_community_member_communities_create(
      member1Connection,
      {},
    );
  typia.assert(community3);
  const subscription3 =
    await generate_random_reddit_community_member_member_subscriptions_create(
      member1Connection,
      {
        body: {
          community_id: community3.id,
        } satisfies IRedditCommunitySubscription.ICreate,
      },
    );
  typia.assert(subscription3);
  // Query posts from community with no posts
  const emptyCommunityPosts = await api.functional.redditCommunity.posts.index(
    member1Connection,
    {
      body: {
        communityId: community3.id,
        sort: "new",
        take: 10,
      } satisfies IRedditCommunityPost.IRequest,
    },
  );
  typia.assert(emptyCommunityPosts);
  // 13. Validate pagination metadata is correct for empty results
  TestValidator.equals(
    "empty community returns empty data array",
    emptyCommunityPosts.data.length,
    0,
  );
  TestValidator.equals(
    "pagination current page is 1",
    emptyCommunityPosts.pagination.current,
    1,
  );
  TestValidator.equals(
    "pagination records is 0",
    emptyCommunityPosts.pagination.records,
    0,
  );
  TestValidator.equals(
    "pagination pages is 0",
    emptyCommunityPosts.pagination.pages,
    0,
  );
  // Validate community information in filtered posts
  filteredPosts.data.forEach((post) => {
    TestValidator.equals(
      "post community name matches filtered community",
      post.community.name,
      community1.name,
    );
    TestValidator.equals(
      "post community id matches filtered community id",
      post.community.id,
      community1.id,
    );
  });
}
