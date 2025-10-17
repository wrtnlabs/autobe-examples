import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IRedditLikeCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikeCommunity";
import type { IRedditLikeCommunitySubscription } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikeCommunitySubscription";
import type { IRedditLikeMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikeMember";
import type { IRedditLikeUser } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikeUser";

/**
 * Test subscription list visibility control through show_subscriptions_publicly
 * setting.
 *
 * This test validates that users can control the visibility of their community
 * subscription list through privacy settings, ensuring granular control over
 * whether community affiliations are public information.
 *
 * Test workflow:
 *
 * 1. Create and authenticate a member account
 * 2. Create multiple communities for subscription testing
 * 3. Subscribe to the created communities to build a subscription list
 * 4. Update show_subscriptions_publicly to false and verify the setting
 * 5. Update show_subscriptions_publicly to true and verify visibility is restored
 */
export async function test_api_member_privacy_subscription_list_visibility(
  connection: api.IConnection,
) {
  // Step 1: Create and authenticate a member account
  const memberEmail = typia.random<string & tags.Format<"email">>();
  const memberUsername = RandomGenerator.alphaNumeric(10);
  const memberPassword = "SecurePass123!";

  const member: IRedditLikeMember.IAuthorized =
    await api.functional.auth.member.join(connection, {
      body: {
        username: memberUsername,
        email: memberEmail,
        password: memberPassword,
      } satisfies IRedditLikeMember.ICreate,
    });
  typia.assert(member);

  // Step 2: Create multiple communities for subscription testing
  const communityCount = 3;
  const communities: IRedditLikeCommunity[] = await ArrayUtil.asyncRepeat(
    communityCount,
    async (index) => {
      const community =
        await api.functional.redditLike.member.communities.create(connection, {
          body: {
            code: `testcommunity${index}_${RandomGenerator.alphaNumeric(6)}`,
            name: `Test Community ${index}`,
            description: RandomGenerator.paragraph({
              sentences: 2,
              wordMin: 5,
              wordMax: 10,
            }),
            privacy_type: "public",
            posting_permission: "anyone_subscribed",
            allow_text_posts: true,
            allow_link_posts: true,
            allow_image_posts: true,
            primary_category: "technology",
          } satisfies IRedditLikeCommunity.ICreate,
        });
      typia.assert(community);
      return community;
    },
  );

  // Step 3: Subscribe to the created communities
  const subscriptions: IRedditLikeCommunitySubscription[] =
    await ArrayUtil.asyncMap(communities, async (community) => {
      const subscription =
        await api.functional.redditLike.member.communities.subscribe.create(
          connection,
          {
            communityId: community.id,
          },
        );
      typia.assert(subscription);
      return subscription;
    });

  TestValidator.equals(
    "subscription count matches community count",
    subscriptions.length,
    communityCount,
  );

  // Step 4: Update show_subscriptions_publicly to false to hide subscription list
  const hiddenPrivacySettings: IRedditLikeUser.IPrivacySettings =
    await api.functional.redditLike.member.users.privacy.updatePrivacy(
      connection,
      {
        userId: member.id,
        body: {
          show_subscriptions_publicly: false,
        } satisfies IRedditLikeUser.IUpdatePrivacy,
      },
    );
  typia.assert(hiddenPrivacySettings);

  TestValidator.equals(
    "subscription list should be hidden",
    hiddenPrivacySettings.show_subscriptions_publicly,
    false,
  );

  // Step 5: Update show_subscriptions_publicly to true to make subscription list visible again
  const visiblePrivacySettings: IRedditLikeUser.IPrivacySettings =
    await api.functional.redditLike.member.users.privacy.updatePrivacy(
      connection,
      {
        userId: member.id,
        body: {
          show_subscriptions_publicly: true,
        } satisfies IRedditLikeUser.IUpdatePrivacy,
      },
    );
  typia.assert(visiblePrivacySettings);

  TestValidator.equals(
    "subscription list should be visible",
    visiblePrivacySettings.show_subscriptions_publicly,
    true,
  );
}
