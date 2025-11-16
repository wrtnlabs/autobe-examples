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
 * Test the complete workflow of a member successfully unsubscribing from a
 * community.
 *
 * This test validates that members can leave communities and remove the
 * subscription relationship, preventing community content from appearing in
 * their personalized feed.
 *
 * Test workflow:
 *
 * 1. Create moderator account for community creation
 * 2. Create a test community (initial subscriber_count = 0)
 * 3. Create member account for subscription operations
 * 4. Subscribe the member to the community (subscriber_count becomes 1)
 * 5. Unsubscribe from the community (target operation - subscriber_count returns
 *    to 0)
 * 6. Validate the deleted subscription record is returned
 * 7. Verify the community's subscriber_count is decremented correctly to 0
 */
export async function test_api_community_unsubscription_successful(
  connection: api.IConnection,
) {
  // Step 1: Create moderator account
  const moderatorEmail = typia.random<string & tags.Format<"email">>();
  const moderatorPassword = typia.random<string & tags.MinLength<8>>();

  const moderator = await api.functional.auth.moderator.join(connection, {
    body: {
      email: moderatorEmail,
      password: moderatorPassword,
      nickname: RandomGenerator.name(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IRedditCommunityCommunityModerator.ICreate,
  });
  typia.assert(moderator);

  // Step 2: Create a community
  const communityName = RandomGenerator.alphabets(10);
  const community =
    await api.functional.redditCommunity.moderator.communities.create(
      connection,
      {
        body: {
          name: communityName,
          display_title: RandomGenerator.paragraph({ sentences: 2 }),
          description: RandomGenerator.paragraph({ sentences: 5 }),
          rules: RandomGenerator.paragraph({ sentences: 3 }),
        } satisfies IRedditCommunityCommunity.ICreate,
      },
    );
  typia.assert(community);

  TestValidator.equals(
    "newly created community has 0 subscribers",
    community.subscriber_count,
    0,
  );

  // Step 3: Create member account
  const memberEmail = typia.random<string & tags.Format<"email">>();
  const memberPassword = typia.random<string & tags.MinLength<8>>();

  const member = await api.functional.auth.member.join(connection, {
    body: {
      username: RandomGenerator.alphaNumeric(10),
      email: memberEmail,
      password: memberPassword,
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IRedditCommunityGuest.ICreate,
  });
  typia.assert(member);

  // Step 4: Subscribe to the community
  const subscription =
    await api.functional.redditCommunity.member.communities.subscriptions.create(
      connection,
      {
        communityName: communityName,
      },
    );
  typia.assert(subscription);

  TestValidator.equals(
    "subscription community name matches",
    subscription.name,
    communityName,
  );

  TestValidator.equals(
    "subscriber count is 1 after subscription",
    subscription.subscriber_count,
    1,
  );

  // Step 5: Unsubscribe from the community (target operation)
  const deletedSubscription =
    await api.functional.redditCommunity.member.communities.subscriptions.erase(
      connection,
      {
        communityName: communityName,
      },
    );
  typia.assert(deletedSubscription);

  // Step 6: Validate the deleted subscription record
  TestValidator.equals(
    "deleted subscription ID matches original",
    deletedSubscription.id,
    subscription.id,
  );

  TestValidator.equals(
    "deleted subscription community name matches",
    deletedSubscription.name,
    communityName,
  );

  // Step 7: Verify subscriber count was decremented to 0
  TestValidator.equals(
    "subscriber count is 0 after unsubscription",
    deletedSubscription.subscriber_count,
    0,
  );
}
