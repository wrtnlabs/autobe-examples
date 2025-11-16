import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IRedditCommunityCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityCommunity";
import type { IRedditCommunityCommunityModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityCommunityModerator";
import type { IRedditCommunityCommunitySubscription } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityCommunitySubscription";
import type { IRedditCommunityGuest } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityGuest";

/**
 * Test idempotent subscription behavior when subscribing to the same community
 * multiple times.
 *
 * This test validates that the community subscription operation is idempotent,
 * meaning that multiple subscription requests to the same community by the same
 * member should be handled gracefully without creating duplicate records or
 * throwing errors.
 *
 * The test follows this workflow:
 *
 * 1. Create a moderator account and authenticate
 * 2. Create a test community for subscription testing
 * 3. Create a member account and authenticate
 * 4. Subscribe to the community (first attempt)
 * 5. Subscribe to the same community again (second attempt - idempotency test)
 * 6. Validate that both subscriptions succeed
 * 7. Verify data consistency between both subscription results
 *
 * This ensures a clean user experience even if the subscribe action is
 * triggered multiple times due to UI double-clicks, network retries, or other
 * scenarios.
 */
export async function test_api_community_subscription_idempotency(
  connection: api.IConnection,
) {
  // Step 1: Create moderator account
  const moderatorEmail = typia.random<string & tags.Format<"email">>();
  const moderator = await api.functional.auth.moderator.join(connection, {
    body: {
      email: moderatorEmail,
      password: typia.random<string & tags.MinLength<8>>(),
      nickname: RandomGenerator.name(),
      ip: null,
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IRedditCommunityCommunityModerator.ICreate,
  });
  typia.assert(moderator);

  // Step 2: Create a community for subscription testing
  const communityName = RandomGenerator.alphabets(10);
  const community =
    await api.functional.redditCommunity.moderator.communities.create(
      connection,
      {
        body: {
          name: communityName,
          display_title: RandomGenerator.paragraph({
            sentences: 2,
            wordMin: 3,
            wordMax: 8,
          }),
          description: RandomGenerator.paragraph({
            sentences: 5,
            wordMin: 4,
            wordMax: 10,
          }),
          rules: RandomGenerator.paragraph({
            sentences: 3,
            wordMin: 5,
            wordMax: 12,
          }),
          icon_url: typia.random<string & tags.Format<"uri">>(),
          banner_url: typia.random<string & tags.Format<"uri">>(),
        } satisfies IRedditCommunityCommunity.ICreate,
      },
    );
  typia.assert(community);

  // Step 3: Create member account and authenticate
  const memberEmail = typia.random<string & tags.Format<"email">>();
  const member = await api.functional.auth.member.join(connection, {
    body: {
      username: RandomGenerator.alphabets(12),
      email: memberEmail,
      password: typia.random<string & tags.MinLength<8>>(),
      display_name: RandomGenerator.name(),
      bio: RandomGenerator.paragraph({ sentences: 2 }),
      avatar_url: typia.random<string & tags.Format<"uri">>(),
      show_online_status: false,
      show_subscribed_communities: false,
      show_activity_feed: true,
      ip: null,
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IRedditCommunityGuest.ICreate,
  });
  typia.assert(member);

  // Step 4: First subscription attempt - should succeed
  const firstSubscription =
    await api.functional.redditCommunity.member.communities.subscriptions.create(
      connection,
      {
        communityName: communityName,
      },
    );
  typia.assert(firstSubscription);

  // Validate first subscription data
  TestValidator.equals(
    "first subscription community ID matches",
    firstSubscription.id,
    community.id,
  );
  TestValidator.equals(
    "first subscription community name matches",
    firstSubscription.name,
    communityName,
  );

  // Step 5: Second subscription attempt - testing idempotency
  const secondSubscription =
    await api.functional.redditCommunity.member.communities.subscriptions.create(
      connection,
      {
        communityName: communityName,
      },
    );
  typia.assert(secondSubscription);

  // Validate second subscription data
  TestValidator.equals(
    "second subscription community ID matches",
    secondSubscription.id,
    community.id,
  );
  TestValidator.equals(
    "second subscription community name matches",
    secondSubscription.name,
    communityName,
  );

  // Step 6: Verify idempotency - both subscriptions should reference the same community
  TestValidator.equals(
    "both subscriptions reference the same community ID",
    firstSubscription.id,
    secondSubscription.id,
  );
  TestValidator.equals(
    "both subscriptions have the same community name",
    firstSubscription.name,
    secondSubscription.name,
  );

  // Verify data consistency
  TestValidator.equals(
    "subscription title consistency",
    firstSubscription.title,
    secondSubscription.title,
  );
  TestValidator.equals(
    "subscription description consistency",
    firstSubscription.description,
    secondSubscription.description,
  );
}
