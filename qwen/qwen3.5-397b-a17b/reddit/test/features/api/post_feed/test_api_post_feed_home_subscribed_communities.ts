import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIRedditCommunityPost } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIRedditCommunityPost";
import type { IRedditCommunityCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityCommunity";
import type { IRedditCommunityCommunityIcon } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityCommunityIcon";
import type { IRedditCommunityMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityMember";
import type { IRedditCommunityPost } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityPost";
import type { IRedditCommunityPostImage } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityPostImage";
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
import { prepare_random_reddit_community_community } from "../../../prepare/prepare_random_reddit_community_community";

/**
 * Test the home feed functionality for authenticated members.
 * Verifies that the home feed returns only posts from communities the user is subscribed to.
 *
 * Test Steps:
 * 1. Authenticate as a member user
 * 2. Create two communities (CommunityA and CommunityB)
 * 3. Subscribe to CommunityA only (not CommunityB)
 * 4. Create posts in both communities
 * 5. Request home feed (feedType=home)
 * 6. Verify response contains only posts from CommunityA
 * 7. Verify posts from CommunityB are excluded
 * 8. Verify pagination metadata is correct
 * 9. Verify each post summary includes required fields
 */
export async function test_api_post_feed_home_subscribed_communities(
  connection: api.IConnection,
): Promise<void> {
  // 1. Authenticate as member user
  const memberConnection: api.IConnection = { host: connection.host };
  const authResult = await authorize_member_join(memberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      username: RandomGenerator.name(1),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    },
  });
  typia.assert(authResult);
  // 2. Create two communities
  const communityA =
    await generate_random_reddit_community_member_communities_create(
      memberConnection,
      {
        body: {
          name: `CommunityA_${RandomGenerator.alphaNumeric(8)}`,
          description: RandomGenerator.paragraph({ sentences: 2 }),
        },
      },
    );
  typia.assert(communityA);
  const communityB =
    await generate_random_reddit_community_member_communities_create(
      memberConnection,
      {
        body: {
          name: `CommunityB_${RandomGenerator.alphaNumeric(8)}`,
          description: RandomGenerator.paragraph({ sentences: 2 }),
        },
      },
    );
  typia.assert(communityB);
  // 3. Subscribe to CommunityA only
  const subscription =
    await api.functional.redditCommunity.member.communities.subscription.create(
      memberConnection,
      {
        communityName: communityA.name,
      },
    );
  typia.assert(subscription);
  TestValidator.equals(
    "subscription community matches",
    subscription.community.id,
    communityA.id,
  );
  // 4. Create post in subscribed community (CommunityA)
  const postInSubscribedCommunity =
    await api.functional.redditCommunity.member.posts.create(memberConnection, {
      body: {
        title: RandomGenerator.paragraph({ sentences: 1 }),
        post_type: "text",
        text_content: RandomGenerator.content({ paragraphs: 2 }),
      },
    });
  typia.assert(postInSubscribedCommunity);
  TestValidator.equals(
    "post community matches",
    postInSubscribedCommunity.community.id,
    communityA.id,
  );
  // 5. Create post in unsubscribed community (CommunityB)
  const postInUnsubscribedCommunity =
    await api.functional.redditCommunity.member.posts.create(memberConnection, {
      body: {
        title: RandomGenerator.paragraph({ sentences: 1 }),
        post_type: "text",
        text_content: RandomGenerator.content({ paragraphs: 2 }),
      },
    });
  typia.assert(postInUnsubscribedCommunity);
  TestValidator.equals(
    "post community matches",
    postInUnsubscribedCommunity.community.id,
    communityB.id,
  );
  // 6. Request home feed
  const homeFeed = await api.functional.redditCommunity.member.posts.index(
    memberConnection,
    {
      body: {
        feedType: "home",
        sort: "new",
        page: 1,
        limit: 20,
      },
    },
  );
  typia.assert(homeFeed);
  // 7. Verify home feed contains posts
  TestValidator.predicate("home feed has posts", homeFeed.data.length > 0);
  // 8. Verify all posts in home feed are from CommunityA (subscribed)
  for (const post of homeFeed.data) {
    TestValidator.equals(
      "post in home feed is from subscribed community",
      post.community.id,
      communityA.id,
    );
    TestValidator.notEquals(
      "post in home feed is NOT from unsubscribed community",
      post.community.id,
      communityB.id,
    );
  }
  // 9. Verify the post we created in CommunityA appears in the home feed
  const createdPostFound = homeFeed.data.some(
    (post) => post.id === postInSubscribedCommunity.id,
  );
  TestValidator.predicate(
    "created post in subscribed community appears in home feed",
    createdPostFound,
  );
  // 10. Verify pagination metadata
  TestValidator.equals("current page", homeFeed.pagination.current, 1);
  TestValidator.equals("limit", homeFeed.pagination.limit, 20);
  TestValidator.predicate(
    "records count is valid",
    homeFeed.pagination.records >= 0,
  );
  TestValidator.predicate(
    "pages count is valid",
    homeFeed.pagination.pages >= 0,
  );
  // 11. Verify post type matches what we created
  const subscribedCommunityPosts = homeFeed.data.filter(
    (post) => post.community.id === communityA.id,
  );
  TestValidator.predicate(
    "has posts from subscribed community",
    subscribedCommunityPosts.length > 0,
  );
}
