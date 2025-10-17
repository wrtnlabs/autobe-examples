import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IRedditLikeCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikeCommunity";
import type { IRedditLikeCommunitySubscription } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikeCommunitySubscription";
import type { IRedditLikeMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikeMember";

/**
 * Test the complete subscribe-unsubscribe-resubscribe cycle to ensure members
 * can freely manage their community memberships.
 *
 * This test validates the full subscription lifecycle:
 *
 * 1. Member account creation and authentication
 * 2. Community creation
 * 3. Initial subscription to the community
 * 4. Unsubscription from the community
 * 5. Resubscription to verify members can rejoin
 *
 * Each step verifies that subscription operations succeed and that subscription
 * records are properly created with unique IDs and timestamps.
 *
 * Note: Subscriber count verification is limited because there is no API
 * endpoint available in the provided materials to retrieve community details
 * after operations.
 */
export async function test_api_community_resubscription_after_unsubscribe(
  connection: api.IConnection,
) {
  // Step 1: Create and authenticate a new member account
  const memberData = {
    username: RandomGenerator.alphaNumeric(10),
    email: typia.random<string & tags.Format<"email">>(),
    password: "SecurePass123!@#",
  } satisfies IRedditLikeMember.ICreate;

  const member: IRedditLikeMember.IAuthorized =
    await api.functional.auth.member.join(connection, {
      body: memberData,
    });
  typia.assert(member);

  // Step 2: Create a new community
  const communityData = {
    code: RandomGenerator.alphaNumeric(15).toLowerCase(),
    name: RandomGenerator.name(2),
    description: RandomGenerator.paragraph({
      sentences: 15,
      wordMin: 4,
      wordMax: 8,
    }),
    privacy_type: "public",
    posting_permission: "anyone_subscribed",
    allow_text_posts: true,
    allow_link_posts: true,
    allow_image_posts: true,
    primary_category: "technology",
  } satisfies IRedditLikeCommunity.ICreate;

  const community: IRedditLikeCommunity =
    await api.functional.redditLike.member.communities.create(connection, {
      body: communityData,
    });
  typia.assert(community);

  // Verify initial subscriber count is 0
  TestValidator.equals(
    "initial subscriber count",
    community.subscriber_count,
    0,
  );

  // Step 3: Subscribe to the community (initial subscription)
  const initialSubscription: IRedditLikeCommunitySubscription =
    await api.functional.redditLike.member.communities.subscribe.create(
      connection,
      {
        communityId: community.id,
      },
    );
  typia.assert(initialSubscription);

  // Verify subscription was created correctly
  TestValidator.equals(
    "subscription community ID",
    initialSubscription.community_id,
    community.id,
  );
  TestValidator.equals(
    "subscription member ID",
    initialSubscription.member_id,
    member.id,
  );

  // Step 4: Unsubscribe from the community
  await api.functional.redditLike.member.communities.unsubscribe(connection, {
    communityId: community.id,
  });

  // Step 5: Resubscribe to the community
  const resubscription: IRedditLikeCommunitySubscription =
    await api.functional.redditLike.member.communities.subscribe.create(
      connection,
      {
        communityId: community.id,
      },
    );
  typia.assert(resubscription);

  // Verify resubscription was successful
  TestValidator.equals(
    "resubscription community ID",
    resubscription.community_id,
    community.id,
  );
  TestValidator.equals(
    "resubscription member ID",
    resubscription.member_id,
    member.id,
  );

  // Verify resubscription has a different ID (new subscription record)
  TestValidator.notEquals(
    "subscription IDs differ",
    resubscription.id,
    initialSubscription.id,
  );

  // Verify resubscription timestamp is after or at the same time as initial subscription
  const initialTimestamp = new Date(
    initialSubscription.subscribed_at,
  ).getTime();
  const resubscriptionTimestamp = new Date(
    resubscription.subscribed_at,
  ).getTime();
  TestValidator.predicate(
    "resubscription timestamp is after or at same time as initial subscription",
    resubscriptionTimestamp >= initialTimestamp,
  );
}
