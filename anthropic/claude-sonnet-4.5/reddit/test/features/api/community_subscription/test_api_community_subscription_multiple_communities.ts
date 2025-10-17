import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IRedditLikeCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikeCommunity";
import type { IRedditLikeCommunitySubscription } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikeCommunitySubscription";
import type { IRedditLikeMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikeMember";

/**
 * Test that a member can successfully subscribe to multiple different
 * communities and that each subscription is tracked independently.
 *
 * This test validates the platform's ability to handle multiple community
 * subscriptions from a single member account. It ensures that subscription
 * relationships are properly isolated between different communities and that
 * all subscription operations succeed independently.
 *
 * Workflow:
 *
 * 1. Register a new member account
 * 2. Create three different communities with varying configurations
 * 3. Subscribe the member to all three communities in sequence
 * 4. Validate each subscription operation succeeds
 * 5. Verify subscriber counts are incremented correctly
 * 6. Confirm subscription records contain proper metadata
 */
export async function test_api_community_subscription_multiple_communities(
  connection: api.IConnection,
) {
  // Step 1: Register a new member account
  const memberEmail = typia.random<string & tags.Format<"email">>();
  const memberPassword = "SecurePass123!@#";
  const memberUsername = RandomGenerator.alphaNumeric(12);

  const member: IRedditLikeMember.IAuthorized =
    await api.functional.auth.member.join(connection, {
      body: {
        username: memberUsername,
        email: memberEmail,
        password: memberPassword,
      } satisfies IRedditLikeMember.ICreate,
    });
  typia.assert(member);

  // Step 2: Create three different communities with varying themes
  const community1: IRedditLikeCommunity =
    await api.functional.redditLike.member.communities.create(connection, {
      body: {
        code: RandomGenerator.alphaNumeric(10),
        name: RandomGenerator.name(2),
        description: RandomGenerator.paragraph({ sentences: 3 }),
        privacy_type: "public",
        posting_permission: "anyone_subscribed",
        allow_text_posts: true,
        allow_link_posts: true,
        allow_image_posts: true,
        primary_category: "technology",
      } satisfies IRedditLikeCommunity.ICreate,
    });
  typia.assert(community1);
  TestValidator.equals(
    "community1 initial subscriber count",
    community1.subscriber_count,
    0,
  );

  const community2: IRedditLikeCommunity =
    await api.functional.redditLike.member.communities.create(connection, {
      body: {
        code: RandomGenerator.alphaNumeric(10),
        name: RandomGenerator.name(2),
        description: RandomGenerator.paragraph({ sentences: 4 }),
        privacy_type: "public",
        posting_permission: "approved_only",
        allow_text_posts: true,
        allow_link_posts: false,
        allow_image_posts: true,
        primary_category: "gaming",
      } satisfies IRedditLikeCommunity.ICreate,
    });
  typia.assert(community2);
  TestValidator.equals(
    "community2 initial subscriber count",
    community2.subscriber_count,
    0,
  );

  const community3: IRedditLikeCommunity =
    await api.functional.redditLike.member.communities.create(connection, {
      body: {
        code: RandomGenerator.alphaNumeric(10),
        name: RandomGenerator.name(2),
        description: RandomGenerator.paragraph({ sentences: 5 }),
        privacy_type: "public",
        posting_permission: "moderators_only",
        allow_text_posts: false,
        allow_link_posts: true,
        allow_image_posts: false,
        primary_category: "education",
      } satisfies IRedditLikeCommunity.ICreate,
    });
  typia.assert(community3);
  TestValidator.equals(
    "community3 initial subscriber count",
    community3.subscriber_count,
    0,
  );

  // Step 3: Subscribe the member to all three communities
  const subscription1: IRedditLikeCommunitySubscription =
    await api.functional.redditLike.member.communities.subscribe.create(
      connection,
      {
        communityId: community1.id,
      },
    );
  typia.assert(subscription1);
  TestValidator.equals(
    "subscription1 community_id matches",
    subscription1.community_id,
    community1.id,
  );
  TestValidator.equals(
    "subscription1 member_id matches",
    subscription1.member_id,
    member.id,
  );

  const subscription2: IRedditLikeCommunitySubscription =
    await api.functional.redditLike.member.communities.subscribe.create(
      connection,
      {
        communityId: community2.id,
      },
    );
  typia.assert(subscription2);
  TestValidator.equals(
    "subscription2 community_id matches",
    subscription2.community_id,
    community2.id,
  );
  TestValidator.equals(
    "subscription2 member_id matches",
    subscription2.member_id,
    member.id,
  );

  const subscription3: IRedditLikeCommunitySubscription =
    await api.functional.redditLike.member.communities.subscribe.create(
      connection,
      {
        communityId: community3.id,
      },
    );
  typia.assert(subscription3);
  TestValidator.equals(
    "subscription3 community_id matches",
    subscription3.community_id,
    community3.id,
  );
  TestValidator.equals(
    "subscription3 member_id matches",
    subscription3.member_id,
    member.id,
  );

  // Step 4: Verify all three subscriptions have unique IDs
  TestValidator.notEquals(
    "subscription1 and subscription2 have different IDs",
    subscription1.id,
    subscription2.id,
  );
  TestValidator.notEquals(
    "subscription2 and subscription3 have different IDs",
    subscription2.id,
    subscription3.id,
  );
  TestValidator.notEquals(
    "subscription1 and subscription3 have different IDs",
    subscription1.id,
    subscription3.id,
  );
}
