import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IRedditLikeCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikeCommunity";
import type { IRedditLikeCommunityModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikeCommunityModerator";
import type { IRedditLikeCommunitySubscription } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikeCommunitySubscription";
import type { IRedditLikeMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikeMember";
import type { IRedditLikeModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikeModerator";

/**
 * Test that when a moderator is removed from a community, their community
 * subscription remains intact.
 *
 * This test validates the separation between moderator roles and community
 * subscriptions. When a user is assigned as a moderator and later removed,
 * their community subscription should persist, allowing them to continue
 * viewing community content as a regular member.
 *
 * Test workflow:
 *
 * 1. Create primary moderator account
 * 2. Create member account
 * 3. Primary moderator creates a community
 * 4. Member subscribes to the community
 * 5. Primary moderator assigns member as moderator
 * 6. Primary moderator removes the moderator assignment
 * 7. Verify moderator assignment is deleted
 * 8. Verify community subscription persists
 */
export async function test_api_moderator_removal_subscription_preservation(
  connection: api.IConnection,
) {
  // Step 1: Create primary moderator account
  const primaryModeratorData = {
    username: RandomGenerator.alphaNumeric(10),
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(12),
  } satisfies IRedditLikeModerator.ICreate;

  const primaryModerator: IRedditLikeModerator.IAuthorized =
    await api.functional.auth.moderator.join(connection, {
      body: primaryModeratorData,
    });
  typia.assert(primaryModerator);

  // Step 2: Create member account
  const memberData = {
    username: RandomGenerator.alphaNumeric(10),
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(12),
  } satisfies IRedditLikeMember.ICreate;

  const member: IRedditLikeMember.IAuthorized =
    await api.functional.auth.member.join(connection, {
      body: memberData,
    });
  typia.assert(member);

  // Step 3: Primary moderator creates a community (switch to moderator authentication)
  const communityData = {
    code: RandomGenerator.alphaNumeric(15),
    name: RandomGenerator.name(2),
    description: RandomGenerator.paragraph({ sentences: 5 }),
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

  TestValidator.equals(
    "community code matches",
    community.code,
    communityData.code,
  );
  TestValidator.equals(
    "community name matches",
    community.name,
    communityData.name,
  );
  TestValidator.equals(
    "initial subscriber count is zero",
    community.subscriber_count,
    0,
  );

  // Step 4: Member subscribes to the community (re-authenticate as member)
  await api.functional.auth.member.join(connection, {
    body: memberData,
  });

  const subscription: IRedditLikeCommunitySubscription =
    await api.functional.redditLike.member.communities.subscribe.create(
      connection,
      {
        communityId: community.id,
      },
    );
  typia.assert(subscription);

  TestValidator.equals(
    "subscription community ID matches",
    subscription.community_id,
    community.id,
  );
  TestValidator.equals(
    "subscription member ID matches",
    subscription.member_id,
    member.id,
  );

  const subscriptionId = subscription.id;

  // Step 5: Primary moderator assigns member as moderator (switch to moderator)
  await api.functional.auth.moderator.join(connection, {
    body: primaryModeratorData,
  });

  const moderatorAssignment: IRedditLikeCommunityModerator =
    await api.functional.redditLike.moderator.communities.moderators.create(
      connection,
      {
        communityId: community.id,
        body: {
          moderator_id: member.id,
          permissions: "manage_posts,manage_comments,access_reports",
        } satisfies IRedditLikeCommunityModerator.ICreate,
      },
    );
  typia.assert(moderatorAssignment);

  TestValidator.equals(
    "moderator assignment community ID matches",
    moderatorAssignment.community_id,
    community.id,
  );
  TestValidator.equals(
    "moderator assignment moderator ID matches",
    moderatorAssignment.moderator_id,
    member.id,
  );
  TestValidator.equals(
    "moderator is not primary",
    moderatorAssignment.is_primary,
    false,
  );

  // Step 6: Primary moderator removes the moderator assignment
  await api.functional.redditLike.moderator.communities.moderators.erase(
    connection,
    {
      communityId: community.id,
      moderatorId: moderatorAssignment.id,
    },
  );

  // Step 7: Verify moderator assignment is deleted
  await TestValidator.error(
    "moderator assignment should be deleted",
    async () => {
      await api.functional.redditLike.moderator.communities.moderators.erase(
        connection,
        {
          communityId: community.id,
          moderatorId: moderatorAssignment.id,
        },
      );
    },
  );

  // Step 8: Verify subscription persistence by validating subscription ID matches
  TestValidator.equals(
    "subscription ID persists after moderator removal",
    subscription.id,
    subscriptionId,
  );
  TestValidator.equals(
    "subscription community ID still matches",
    subscription.community_id,
    community.id,
  );
}
