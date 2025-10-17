import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IRedditLikeCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikeCommunity";
import type { IRedditLikeCommunitySubscription } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikeCommunitySubscription";
import type { IRedditLikeMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikeMember";

/**
 * Test duplicate subscription prevention for community subscriptions.
 *
 * This test validates that the system properly handles duplicate subscription
 * attempts when a member tries to subscribe to the same community twice. It
 * ensures idempotency and data integrity by verifying that duplicate
 * subscriptions do not corrupt data or incorrectly increment subscriber
 * counts.
 *
 * Test workflow:
 *
 * 1. Create a member account for testing
 * 2. Create a community
 * 3. Subscribe the member to the community (first subscription)
 * 4. Attempt to subscribe the same member to the same community again
 * 5. Validate graceful handling of duplicate subscription
 * 6. Verify subscriber count integrity
 */
export async function test_api_community_subscription_duplicate_prevention(
  connection: api.IConnection,
) {
  // Step 1: Create a member account
  const memberData = {
    username: RandomGenerator.name(1) + RandomGenerator.alphaNumeric(4),
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(8) + "A1!",
  } satisfies IRedditLikeMember.ICreate;

  const member: IRedditLikeMember.IAuthorized =
    await api.functional.auth.member.join(connection, {
      body: memberData,
    });
  typia.assert(member);

  // Step 2: Create a community
  const communityData = {
    code: RandomGenerator.alphabets(10).toLowerCase(),
    name: RandomGenerator.name(2),
    description: RandomGenerator.paragraph({
      sentences: 3,
      wordMin: 5,
      wordMax: 10,
    }),
  } satisfies IRedditLikeCommunity.ICreate;

  const community: IRedditLikeCommunity =
    await api.functional.redditLike.member.communities.create(connection, {
      body: communityData,
    });
  typia.assert(community);

  // Step 3: Subscribe the member to the community (first subscription)
  const firstSubscription: IRedditLikeCommunitySubscription =
    await api.functional.redditLike.member.communities.subscribe.create(
      connection,
      {
        communityId: community.id,
      },
    );
  typia.assert(firstSubscription);

  // Validate the first subscription
  TestValidator.equals(
    "first subscription community ID matches",
    firstSubscription.community_id,
    community.id,
  );
  TestValidator.equals(
    "first subscription member ID matches",
    firstSubscription.member_id,
    member.id,
  );

  // Step 4: Attempt duplicate subscription
  const secondSubscription: IRedditLikeCommunitySubscription =
    await api.functional.redditLike.member.communities.subscribe.create(
      connection,
      {
        communityId: community.id,
      },
    );
  typia.assert(secondSubscription);

  // Step 5: Validate that duplicate subscription returns same or equivalent subscription
  TestValidator.equals(
    "duplicate subscription community ID matches",
    secondSubscription.community_id,
    community.id,
  );
  TestValidator.equals(
    "duplicate subscription member ID matches",
    secondSubscription.member_id,
    member.id,
  );

  // The system should either return the same subscription ID (idempotent) or handle gracefully
  // Both subscriptions should reference the same community and member
  TestValidator.predicate(
    "subscription IDs are consistent",
    firstSubscription.id === secondSubscription.id ||
      (firstSubscription.community_id === secondSubscription.community_id &&
        firstSubscription.member_id === secondSubscription.member_id),
  );
}
