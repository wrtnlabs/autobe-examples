import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunity";
import type { ICommunityPlatformCommunitySubscription } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunitySubscription";
import type { ICommunityPlatformCommunityVisibilityLevel } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunityVisibilityLevel";
import type { ICommunityPlatformMemberuser } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMemberuser";
import type { ICommunityPlatformUserFeedPreferences } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformUserFeedPreferences";

export async function test_api_member_user_feed_preferences_access_control(
  connection: api.IConnection,
) {
  // Prepare isolated connections for each actor so their Authorization headers
  // are managed independently by the SDK without manual header manipulation.
  const connForA: api.IConnection = { ...connection };
  const connForB: api.IConnection = { ...connection };

  // 1. Register member user A on its own connection
  const joinAInput = typia.random<ICommunityPlatformMemberuser.IJoinRequest>();
  const authA: ICommunityPlatformMemberuser.IAuthorized =
    await api.functional.auth.memberUser.join(connForA, {
      body: joinAInput,
    });
  typia.assert(authA);
  const memberUserIdA = authA.id;

  // 2. Register member user B on its own connection
  const joinBInput = typia.random<ICommunityPlatformMemberuser.IJoinRequest>();
  const authB: ICommunityPlatformMemberuser.IAuthorized =
    await api.functional.auth.memberUser.join(connForB, {
      body: joinBInput,
    });
  typia.assert(authB);
  const memberUserIdB = authB.id;

  TestValidator.notEquals(
    "member users A and B must be different",
    memberUserIdA,
    memberUserIdB,
  );

  // 3. As user B, create a community
  const communityCreateBody =
    typia.random<ICommunityPlatformCommunity.ICreate>();
  const community: ICommunityPlatformCommunity =
    await api.functional.communityPlatform.memberUser.communities.create(
      connForB,
      {
        body: communityCreateBody,
      },
    );
  typia.assert(community);

  // 4. As user B, subscribe B to the created community
  const subscriptionCreateBody = {
    community_id: community.id,
  } satisfies ICommunityPlatformCommunitySubscription.ICreate;

  const subscription: ICommunityPlatformCommunitySubscription =
    await api.functional.communityPlatform.memberUser.memberUsers.subscriptions.create(
      connForB,
      {
        memberUserId: memberUserIdB,
        body: subscriptionCreateBody,
      },
    );
  typia.assert(subscription);

  TestValidator.equals(
    "subscription owner must be member user B",
    subscription.member_user_id,
    memberUserIdB,
  );
  TestValidator.equals(
    "subscription community must match created community",
    subscription.community_id,
    community.id,
  );

  // 5. As user B, set explicit feed preferences for B
  const updateBodyB = {
    default_post_sort_mode: "hot",
    show_sensitive_content: true,
    include_recommended_feeds: false,
  } satisfies ICommunityPlatformUserFeedPreferences.IUpdate;

  const prefsB: ICommunityPlatformUserFeedPreferences =
    await api.functional.communityPlatform.memberUser.memberUsers.feedPreferences.update(
      connForB,
      {
        memberUserId: memberUserIdB,
        body: updateBodyB,
      },
    );
  typia.assert(prefsB);

  TestValidator.equals(
    "feed preferences member user id should match B",
    prefsB.memberUser.id,
    memberUserIdB,
  );
  TestValidator.equals(
    "default_post_sort_mode should reflect B's update",
    prefsB.default_post_sort_mode,
    updateBodyB.default_post_sort_mode,
  );
  TestValidator.equals(
    "show_sensitive_content should reflect B's update",
    prefsB.show_sensitive_content,
    updateBodyB.show_sensitive_content,
  );
  TestValidator.equals(
    "include_recommended_feeds should reflect B's update",
    prefsB.include_recommended_feeds,
    updateBodyB.include_recommended_feeds,
  );

  const prefsBAfterOwnUpdate: ICommunityPlatformUserFeedPreferences = prefsB;

  // 6. As user A, attempt to update B's feed preferences and expect failure
  const crossUpdateBody = {
    default_post_sort_mode: "new",
    show_sensitive_content: false,
    include_recommended_feeds: true,
  } satisfies ICommunityPlatformUserFeedPreferences.IUpdate;

  await TestValidator.error(
    "user A must not be able to update user B's feed preferences",
    async () => {
      await api.functional.communityPlatform.memberUser.memberUsers.feedPreferences.update(
        connForA,
        {
          memberUserId: memberUserIdB,
          body: crossUpdateBody,
        },
      );
    },
  );

  // 7. As user B, fetch feed preferences again and ensure they were not changed
  const finalPrefsB: ICommunityPlatformUserFeedPreferences =
    await api.functional.communityPlatform.memberUser.memberUsers.feedPreferences.at(
      connForB,
      {
        memberUserId: memberUserIdB,
      },
    );
  typia.assert(finalPrefsB);

  TestValidator.equals(
    "final feed preferences member user id should still be B",
    finalPrefsB.memberUser.id,
    memberUserIdB,
  );
  TestValidator.equals(
    "default_post_sort_mode must remain as set by B",
    finalPrefsB.default_post_sort_mode,
    prefsBAfterOwnUpdate.default_post_sort_mode,
  );
  TestValidator.equals(
    "show_sensitive_content must remain as set by B",
    finalPrefsB.show_sensitive_content,
    prefsBAfterOwnUpdate.show_sensitive_content,
  );
  TestValidator.equals(
    "include_recommended_feeds must remain as set by B",
    finalPrefsB.include_recommended_feeds,
    prefsBAfterOwnUpdate.include_recommended_feeds,
  );
}
