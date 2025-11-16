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
 * Test complete workflow of member subscribing to a community.
 *
 * This test validates the end-to-end subscription process where a regular
 * member subscribes to a community created by a moderator. The test ensures
 * proper actor authentication switching, community creation, subscription
 * creation, and validates that the subscription relationship is correctly
 * established with proper data integrity.
 *
 * Workflow:
 *
 * 1. Create and authenticate moderator account
 * 2. Moderator creates a community
 * 3. Create and authenticate member account
 * 4. Member subscribes to the created community
 * 5. Verify subscription data and community relationship
 */
export async function test_api_community_subscription_creation_by_member(
  connection: api.IConnection,
) {
  // Step 1: Create moderator account
  const moderatorEmail = typia.random<string & tags.Format<"email">>();
  const moderatorPassword = typia.random<string & tags.MinLength<8>>();

  const moderator: IRedditCommunityCommunityModerator.IAuthorized =
    await api.functional.auth.moderator.join(connection, {
      body: {
        email: moderatorEmail,
        password: moderatorPassword,
        nickname: RandomGenerator.name(),
        ip: null,
        href: typia.random<string & tags.Format<"uri">>(),
        referrer: typia.random<string & tags.Format<"uri">>(),
      } satisfies IRedditCommunityCommunityModerator.ICreate,
    });
  typia.assert(moderator);

  // Step 2: Moderator creates a community
  const communityName = RandomGenerator.alphabets(
    typia.random<
      number & tags.Type<"uint32"> & tags.Minimum<3> & tags.Maximum<21>
    >(),
  );

  const community: IRedditCommunityCommunity =
    await api.functional.redditCommunity.moderator.communities.create(
      connection,
      {
        body: {
          name: communityName,
          display_title: RandomGenerator.paragraph({
            sentences: 2,
            wordMin: 3,
            wordMax: 7,
          }),
          description: RandomGenerator.paragraph({
            sentences: 5,
            wordMin: 5,
            wordMax: 10,
          }),
          rules: RandomGenerator.paragraph({
            sentences: 3,
            wordMin: 4,
            wordMax: 8,
          }),
          icon_url: typia.random<string & tags.Format<"uri">>(),
          banner_url: typia.random<string & tags.Format<"uri">>(),
        } satisfies IRedditCommunityCommunity.ICreate,
      },
    );
  typia.assert(community);

  // Step 3: Create member account
  const memberEmail = typia.random<string & tags.Format<"email">>();
  const memberPassword = typia.random<string & tags.MinLength<8>>();

  const member: IRedditCommunityGuest.IAuthorized =
    await api.functional.auth.member.join(connection, {
      body: {
        username: RandomGenerator.alphaNumeric(
          typia.random<
            number & tags.Type<"uint32"> & tags.Minimum<3> & tags.Maximum<50>
          >(),
        ),
        email: memberEmail,
        password: memberPassword,
        display_name: RandomGenerator.name(),
        bio: RandomGenerator.paragraph({ sentences: 2 }),
        avatar_url: typia.random<string & tags.Format<"uri">>(),
        show_online_status: typia.random<boolean>(),
        show_subscribed_communities: typia.random<boolean>(),
        show_activity_feed: typia.random<boolean>(),
        ip: null,
        href: typia.random<string & tags.Format<"uri">>(),
        referrer: typia.random<string & tags.Format<"uri">>(),
      } satisfies IRedditCommunityGuest.ICreate,
    });
  typia.assert(member);

  // Step 4: Member subscribes to the community
  const subscription: IRedditCommunityCommunitySubscription =
    await api.functional.redditCommunity.member.subscriptions.create(
      connection,
      {
        communityName: community.name,
      },
    );
  typia.assert(subscription);

  // Step 5: Validate subscription data
  TestValidator.equals(
    "subscription community ID matches created community",
    subscription.id,
    community.id,
  );

  TestValidator.equals(
    "subscription community name matches",
    subscription.name,
    community.name,
  );

  TestValidator.predicate(
    "subscriber count is non-negative",
    subscription.subscriber_count >= 0,
  );

  TestValidator.predicate(
    "post count is non-negative",
    subscription.post_count >= 0,
  );
}
