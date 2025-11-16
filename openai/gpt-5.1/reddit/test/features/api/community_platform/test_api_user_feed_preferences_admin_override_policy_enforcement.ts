import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformAccountStatus } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAccountStatus";
import type { ICommunityPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunity";
import type { ICommunityPlatformCommunitySubscription } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunitySubscription";
import type { ICommunityPlatformCommunityVisibilityLevel } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunityVisibilityLevel";
import type { ICommunityPlatformMemberuser } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMemberuser";
import type { ICommunityPlatformPlatformadmin } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformPlatformadmin";
import type { ICommunityPlatformUserFeedPreferences } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformUserFeedPreferences";

export async function test_api_user_feed_preferences_admin_override_policy_enforcement(
  connection: api.IConnection,
) {
  // 1. Register member user
  const joinMemberInput = {
    username: RandomGenerator.name(1),
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(12),
    href: "https://member.example.com/join",
    referrer: "https://member.example.com/landing",
  } satisfies ICommunityPlatformMemberuser.IJoinRequest;

  const memberAuthorized = await api.functional.auth.memberUser.join(
    connection,
    {
      body: joinMemberInput,
    },
  );
  typia.assert(memberAuthorized);

  const memberUserId = memberAuthorized.id;

  // 2. Create a community visibility level as platform admin
  const adminJoinInput = {
    username: RandomGenerator.name(1),
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(12),
    displayName: RandomGenerator.name(2),
    href: "https://admin.example.com/join",
    referrer: "https://admin.example.com/landing",
  } satisfies ICommunityPlatformPlatformadmin.IJoin;

  const adminAuthorized = await api.functional.auth.platformAdmin.join(
    connection,
    {
      body: adminJoinInput,
    },
  );
  typia.assert(adminAuthorized);

  const visibilityCreateInput = {
    code: `public-${RandomGenerator.alphaNumeric(6)}`,
    name: "Public",
    description: "Publicly visible community",
  } satisfies ICommunityPlatformCommunityVisibilityLevel.ICreate;

  const visibilityLevel =
    await api.functional.communityPlatform.platformAdmin.communityVisibilityLevels.create(
      connection,
      {
        body: visibilityCreateInput,
      },
    );
  typia.assert(visibilityLevel);

  // 3. Switch to member user context (login)
  const memberLoginInput = {
    identifier: joinMemberInput.email,
    password: joinMemberInput.password,
    href: "https://member.example.com/login",
    referrer: "https://member.example.com/landing",
  } satisfies ICommunityPlatformMemberuser.ILoginRequest;

  const memberLoginAuthorized = await api.functional.auth.memberUser.login(
    connection,
    {
      body: memberLoginInput,
    },
  );
  typia.assert(memberLoginAuthorized);

  // 4. Create community as member
  const communityCreateInput = {
    identifier: `community-${RandomGenerator.alphaNumeric(8)}`,
    title: RandomGenerator.paragraph({ sentences: 2 }),
    description: RandomGenerator.paragraph({ sentences: 5 }),
    visibilityLevelCode: visibilityLevel.code,
    isNsfw: false,
    primaryTagIds: [],
  } satisfies ICommunityPlatformCommunity.ICreate;

  const community =
    await api.functional.communityPlatform.memberUser.communities.create(
      connection,
      {
        body: communityCreateInput,
      },
    );
  typia.assert(community);

  // 5. Create generic subscription as member
  const genericSubscriptionInput = {
    community_id: community.id,
    status: "active",
  } satisfies ICommunityPlatformCommunitySubscription.ICreate;

  const genericSubscription =
    await api.functional.communityPlatform.memberUser.subscriptions.create(
      connection,
      {
        body: genericSubscriptionInput,
      },
    );
  typia.assert(genericSubscription);

  // 6. Create member-specific subscription via memberUsers/{memberUserId}/subscriptions
  const memberSubscriptionInput = {
    community_id: community.id,
    status: "active",
  } satisfies ICommunityPlatformCommunitySubscription.ICreate;

  const memberSubscription =
    await api.functional.communityPlatform.memberUser.memberUsers.subscriptions.create(
      connection,
      {
        memberUserId,
        body: memberSubscriptionInput,
      },
    );
  typia.assert(memberSubscription);

  // 7. Initialize feed preferences for the member user via memberUsers/{memberUserId}/feedPreferences
  const initialPreferencesCreateInput = {
    default_post_sort_mode: "hot",
    show_sensitive_content: false,
    include_recommended_feeds: true,
  } satisfies ICommunityPlatformUserFeedPreferences.ICreate;

  const initialPreferences =
    await api.functional.communityPlatform.memberUser.memberUsers.feedPreferences.create(
      connection,
      {
        memberUserId,
        body: initialPreferencesCreateInput,
      },
    );
  typia.assert(initialPreferences);

  const preferenceId = initialPreferences.id;

  // 8. Optionally create an additional feed preference row via memberUser/userFeedPreferences
  const extraPreferencesCreateInput = {
    default_post_sort_mode: "new",
    show_sensitive_content: false,
    include_recommended_feeds: true,
  } satisfies ICommunityPlatformUserFeedPreferences.ICreate;

  const extraPreferences =
    await api.functional.communityPlatform.memberUser.userFeedPreferences.create(
      connection,
      {
        body: extraPreferencesCreateInput,
      },
    );
  typia.assert(extraPreferences);

  // 9. Switch back to platform admin for override tests (login)
  const adminLoginInput = {
    identifier: adminJoinInput.email,
    password: adminJoinInput.password,
    href: "https://admin.example.com/login",
    referrer: "https://admin.example.com/landing",
  } satisfies ICommunityPlatformPlatformadmin.ILogin;

  const adminLoginAuthorized = await api.functional.auth.platformAdmin.login(
    connection,
    {
      body: adminLoginInput,
    },
  );
  typia.assert(adminLoginAuthorized);

  // 10. Admin update attempt to enable sensitive content and recommended feeds
  const riskyUpdateInput = {
    show_sensitive_content: true,
    include_recommended_feeds: true,
  } satisfies ICommunityPlatformUserFeedPreferences.IUpdate;

  const riskyUpdatedPreferences =
    await api.functional.communityPlatform.platformAdmin.userFeedPreferences.update(
      connection,
      {
        preferenceId,
        body: riskyUpdateInput,
      },
    );
  typia.assert(riskyUpdatedPreferences);

  TestValidator.equals(
    "preference id remains stable after risky admin update",
    riskyUpdatedPreferences.id,
    preferenceId,
  );
  TestValidator.equals(
    "show_sensitive_content is enabled by risky admin update",
    riskyUpdatedPreferences.show_sensitive_content,
    true,
  );
  TestValidator.equals(
    "include_recommended_feeds is enabled by risky admin update",
    riskyUpdatedPreferences.include_recommended_feeds,
    true,
  );
  TestValidator.equals(
    "default_post_sort_mode remains unchanged when omitted",
    riskyUpdatedPreferences.default_post_sort_mode,
    initialPreferences.default_post_sort_mode,
  );

  // 11. Admin conservative override: enforce safe settings and top sorting
  const conservativeUpdateInput = {
    default_post_sort_mode: "top",
    show_sensitive_content: false,
    include_recommended_feeds: false,
  } satisfies ICommunityPlatformUserFeedPreferences.IUpdate;

  const conservativeUpdatedPreferences =
    await api.functional.communityPlatform.platformAdmin.userFeedPreferences.update(
      connection,
      {
        preferenceId,
        body: conservativeUpdateInput,
      },
    );
  typia.assert(conservativeUpdatedPreferences);

  TestValidator.equals(
    "preference id remains stable after conservative admin update",
    conservativeUpdatedPreferences.id,
    preferenceId,
  );
  TestValidator.equals(
    "show_sensitive_content is disabled by conservative admin override",
    conservativeUpdatedPreferences.show_sensitive_content,
    false,
  );
  TestValidator.equals(
    "include_recommended_feeds is disabled by conservative admin override",
    conservativeUpdatedPreferences.include_recommended_feeds,
    false,
  );
  TestValidator.equals(
    "default_post_sort_mode switched to top by admin override",
    conservativeUpdatedPreferences.default_post_sort_mode,
    "top",
  );

  // 12. Authorization boundary: member user cannot call admin endpoint
  const memberReLogin = await api.functional.auth.memberUser.login(connection, {
    body: memberLoginInput,
  });
  typia.assert(memberReLogin);

  await TestValidator.error(
    "member user must not be able to call platformAdmin.userFeedPreferences.update",
    async () => {
      const memberUpdateAttemptInput = {
        show_sensitive_content: true,
        include_recommended_feeds: true,
      } satisfies ICommunityPlatformUserFeedPreferences.IUpdate;

      await api.functional.communityPlatform.platformAdmin.userFeedPreferences.update(
        connection,
        {
          preferenceId,
          body: memberUpdateAttemptInput,
        },
      );
    },
  );

  // 13. Final sanity check: last successful admin response reflects enforced state
  TestValidator.equals(
    "final enforced preferences reflect conservative admin override (show_sensitive_content)",
    conservativeUpdatedPreferences.show_sensitive_content,
    false,
  );
  TestValidator.equals(
    "final enforced preferences reflect conservative admin override (include_recommended_feeds)",
    conservativeUpdatedPreferences.include_recommended_feeds,
    false,
  );
  TestValidator.equals(
    "final enforced preferences reflect conservative admin override (default_post_sort_mode)",
    conservativeUpdatedPreferences.default_post_sort_mode,
    "top",
  );
}
