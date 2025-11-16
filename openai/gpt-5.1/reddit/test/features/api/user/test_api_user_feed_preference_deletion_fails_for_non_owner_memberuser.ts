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

export async function test_api_user_feed_preference_deletion_fails_for_non_owner_memberuser(
  connection: api.IConnection,
) {
  // 1. Platform admin setup: join and create a visibility level
  const platformAdminEmail: string = typia.random<
    string & tags.Format<"email">
  >();

  const platformAdminJoin = await api.functional.auth.platformAdmin.join(
    connection,
    {
      body: {
        username: RandomGenerator.name(1),
        email: platformAdminEmail,
        password: "AdminPass123!",
        displayName: RandomGenerator.name(),
        ip: "127.0.0.1",
        href: "https://admin.example.com/join",
        referrer: "https://admin.example.com/landing",
      } satisfies ICommunityPlatformPlatformadmin.IJoin,
    },
  );
  typia.assert(platformAdminJoin);

  const visibility =
    await api.functional.communityPlatform.platformAdmin.communityVisibilityLevels.create(
      connection,
      {
        body: {
          code: `public-${RandomGenerator.alphabets(8)}`,
          name: RandomGenerator.name(2),
          description: RandomGenerator.paragraph({ sentences: 5 }),
        } satisfies ICommunityPlatformCommunityVisibilityLevel.ICreate,
      },
    );
  typia.assert(visibility);

  // 2. Owner member user setup
  const ownerEmail: string = typia.random<string & tags.Format<"email">>();

  const ownerJoin = await api.functional.auth.memberUser.join(connection, {
    body: {
      username: RandomGenerator.name(1),
      email: ownerEmail,
      password: "OwnerPass123!",
      ip: "127.0.0.1",
      href: "https://app.example.com/join",
      referrer: "https://app.example.com/landing",
    } satisfies ICommunityPlatformMemberuser.IJoinRequest,
  });
  typia.assert(ownerJoin);

  const ownerId = ownerJoin.id;

  const community =
    await api.functional.communityPlatform.memberUser.communities.create(
      connection,
      {
        body: {
          identifier: `community-${RandomGenerator.alphabets(8)}`,
          title: RandomGenerator.name(3),
          description: RandomGenerator.paragraph({ sentences: 8 }),
          visibilityLevelCode: visibility.code,
          isNsfw: false,
          primaryTagIds: [],
        } satisfies ICommunityPlatformCommunity.ICreate,
      },
    );
  typia.assert(community);

  const ownerGenericSub =
    await api.functional.communityPlatform.memberUser.subscriptions.create(
      connection,
      {
        body: {
          community_id: community.id,
          status: "active",
        } satisfies ICommunityPlatformCommunitySubscription.ICreate,
      },
    );
  typia.assert(ownerGenericSub);

  const ownerScopedSub =
    await api.functional.communityPlatform.memberUser.memberUsers.subscriptions.create(
      connection,
      {
        memberUserId: ownerId,
        body: {
          community_id: community.id,
          status: "active",
        } satisfies ICommunityPlatformCommunitySubscription.ICreate,
      },
    );
  typia.assert(ownerScopedSub);

  const ownerMemberFeedPrefs =
    await api.functional.communityPlatform.memberUser.memberUsers.feedPreferences.create(
      connection,
      {
        memberUserId: ownerId,
        body: {
          default_post_sort_mode: "hot",
          show_sensitive_content: false,
          include_recommended_feeds: true,
        } satisfies ICommunityPlatformUserFeedPreferences.ICreate,
      },
    );
  typia.assert(ownerMemberFeedPrefs);

  const ownerUserFeedPrefs =
    await api.functional.communityPlatform.memberUser.userFeedPreferences.create(
      connection,
      {
        body: {
          default_post_sort_mode: "hot",
          show_sensitive_content: false,
          include_recommended_feeds: true,
        } satisfies ICommunityPlatformUserFeedPreferences.ICreate,
      },
    );
  typia.assert(ownerUserFeedPrefs);

  const ownerPreferenceId = ownerUserFeedPrefs.id;

  // 3. Attacker member user setup
  const attackerEmail: string = typia.random<string & tags.Format<"email">>();

  const attackerJoin = await api.functional.auth.memberUser.join(connection, {
    body: {
      username: RandomGenerator.name(1),
      email: attackerEmail,
      password: "AttackerPass123!",
      ip: "127.0.0.1",
      href: "https://app.example.com/join",
      referrer: "https://app.example.com/landing",
    } satisfies ICommunityPlatformMemberuser.IJoinRequest,
  });
  typia.assert(attackerJoin);

  await api.functional.auth.memberUser.login(connection, {
    body: {
      identifier: attackerEmail,
      password: "AttackerPass123!",
      ip: "127.0.0.1",
      href: "https://app.example.com/login",
      referrer: "https://app.example.com/landing",
    } satisfies ICommunityPlatformMemberuser.ILoginRequest,
  });

  // 4. Authorization under test: attacker tries to delete owner's preference
  await TestValidator.error(
    "non-owner cannot delete another user's feed preference",
    async () => {
      await api.functional.communityPlatform.memberUser.userFeedPreferences.erase(
        connection,
        {
          preferenceId: ownerPreferenceId,
        },
      );
    },
  );

  // 5. Positive control: owner can delete their own preference
  await api.functional.auth.memberUser.login(connection, {
    body: {
      identifier: ownerEmail,
      password: "OwnerPass123!",
      ip: "127.0.0.1",
      href: "https://app.example.com/login",
      referrer: "https://app.example.com/landing",
    } satisfies ICommunityPlatformMemberuser.ILoginRequest,
  });

  await api.functional.communityPlatform.memberUser.userFeedPreferences.erase(
    connection,
    {
      preferenceId: ownerPreferenceId,
    },
  );
}
