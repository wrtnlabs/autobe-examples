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

export async function test_api_member_feed_home_subscribed_communities_only(
  connection: api.IConnection,
): Promise<void> {
  // 1. Register a new member account
  const memberConnection: api.IConnection = { host: connection.host };
  const auth = await authorize_member_join(memberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      username: RandomGenerator.name(1),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    } satisfies IRedditCommunityMember.IJoin,
  });
  typia.assert(auth);
  // 2. Create two communities (CommunityA and CommunityB)
  const communityA =
    await generate_random_reddit_community_member_communities_create(
      memberConnection,
      {
        body: {
          name: `TestCommunityA_${RandomGenerator.alphaNumeric(8)}`,
          description: RandomGenerator.paragraph({ sentences: 2 }),
        } satisfies IRedditCommunityCommunity.ICreate,
      },
    );
  typia.assert(communityA);
  const communityB =
    await generate_random_reddit_community_member_communities_create(
      memberConnection,
      {
        body: {
          name: `TestCommunityB_${RandomGenerator.alphaNumeric(8)}`,
          description: RandomGenerator.paragraph({ sentences: 2 }),
        } satisfies IRedditCommunityCommunity.ICreate,
      },
    );
  typia.assert(communityB);
  // 3. Subscribe to CommunityA only (not CommunityB)
  const subscription =
    await api.functional.redditCommunity.member.communities.subscription.create(
      memberConnection,
      {
        communityName: communityA.name,
      },
    );
  typia.assert(subscription);
  // 4. Create a post in CommunityA (subscribed community)
  const postInSubscribedCommunity =
    await api.functional.redditCommunity.member.posts.create(memberConnection, {
      body: {
        post_type: "text",
        title: RandomGenerator.paragraph({ sentences: 1 }),
        text_content: RandomGenerator.content({ paragraphs: 2 }),
        reddit_community_community_id: communityA.id,
      } satisfies IRedditCommunityPost.ICreate,
    });
  typia.assert(postInSubscribedCommunity);
  // 5. Create a post in CommunityB (unsubscribed community)
  const postInUnsubscribedCommunity =
    await api.functional.redditCommunity.member.posts.create(memberConnection, {
      body: {
        post_type: "text",
        title: RandomGenerator.paragraph({ sentences: 1 }),
        text_content: RandomGenerator.content({ paragraphs: 2 }),
        reddit_community_community_id: communityB.id,
      } satisfies IRedditCommunityPost.ICreate,
    });
  typia.assert(postInUnsubscribedCommunity);
  // 6. Request the home feed with default sorting
  const feed = await api.functional.redditCommunity.member.feeds.home.index(
    memberConnection,
    {
      body: {
        page: 1,
        limit: 20,
        sort: "new",
        feedType: "home",
      } satisfies IRedditCommunityPost.IRequest,
    },
  );
  typia.assert(feed);
  // 7. Verify pagination metadata is correct
  TestValidator.predicate(
    "pagination current page",
    feed.pagination.current >= 1,
  );
  TestValidator.predicate("pagination limit", feed.pagination.limit > 0);
  TestValidator.predicate("pagination records", feed.pagination.records >= 0);
  TestValidator.predicate("pagination pages", feed.pagination.pages >= 0);
  // 8. Verify response contains posts
  TestValidator.predicate("feed has posts", feed.data.length > 0);
  // 9. Verify all posts in feed are from CommunityA (subscribed community only)
  for (const post of feed.data) {
    // Verify post has all required fields
    TestValidator.predicate("post has id", post.id !== undefined);
    TestValidator.predicate("post has title", post.title !== undefined);
    TestValidator.predicate("post has author", post.author !== undefined);
    TestValidator.predicate("post has community", post.community !== undefined);
    TestValidator.predicate(
      "post has vote_score",
      post.vote_score !== undefined,
    );
    TestValidator.predicate(
      "post has comments_count",
      post.comments_count !== undefined,
    );
    TestValidator.predicate(
      "post has created_at",
      post.created_at !== undefined,
    );
    TestValidator.predicate("post has post_type", post.post_type !== undefined);
    // CRITICAL: Verify post is from subscribed community (CommunityA) only
    TestValidator.equals(
      "post community should be CommunityA (subscribed)",
      post.community.id,
      communityA.id,
    );
    // Verify no posts from CommunityB (unsubscribed) appear
    TestValidator.notEquals(
      "post should not be from CommunityB (unsubscribed)",
      post.community.id,
      communityB.id,
    );
  }
  // 10. Verify the subscribed community post appears in feed
  const subscribedCommunityPostFound = feed.data.some(
    (post) => post.id === postInSubscribedCommunity.id,
  );
  TestValidator.predicate(
    "post from subscribed community should appear in home feed",
    subscribedCommunityPostFound,
  );
  // 11. Verify the unsubscribed community post does NOT appear in feed
  const unsubscribedCommunityPostFound = feed.data.some(
    (post) => post.id === postInUnsubscribedCommunity.id,
  );
  TestValidator.predicate(
    "post from unsubscribed community should NOT appear in home feed",
    !unsubscribedCommunityPostFound,
  );
}
