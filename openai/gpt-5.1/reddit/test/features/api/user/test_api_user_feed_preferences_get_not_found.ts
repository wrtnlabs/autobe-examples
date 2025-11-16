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

export async function test_api_user_feed_preferences_get_not_found(
  connection: api.IConnection,
) {
  // 1. Register and login a platform admin to create a visibility level
  const platformAdminEmail: string & tags.Format<"email"> = typia.random<
    string & tags.Format<"email">
  >();

  const platformAdminJoin: ICommunityPlatformPlatformadmin.IAuthorized =
    await api.functional.auth.platformAdmin.join(connection, {
      body: {
        username: RandomGenerator.name(1),
        email: platformAdminEmail,
        password: RandomGenerator.alphaNumeric(12),
        displayName: RandomGenerator.name(2),
        ip: undefined,
        href: "https://admin.example.com/register" as string &
          tags.Format<"uri">,
        referrer: "https://admin.example.com/landing" as string &
          tags.Format<"uri">,
      } satisfies ICommunityPlatformPlatformadmin.IJoin,
    });
  typia.assert(platformAdminJoin);

  // 2. Create at least one community visibility level as platformAdmin
  const visibilityLevel: ICommunityPlatformCommunityVisibilityLevel =
    await api.functional.communityPlatform.platformAdmin.communityVisibilityLevels.create(
      connection,
      {
        body: {
          code: `public-${RandomGenerator.alphaNumeric(8)}`,
          name: "Public",
          description: RandomGenerator.paragraph({ sentences: 3 }),
        } satisfies ICommunityPlatformCommunityVisibilityLevel.ICreate,
      },
    );
  typia.assert(visibilityLevel);

  // 3. Register a member user via /auth/memberUser/join
  const memberUserEmail: string & tags.Format<"email"> = typia.random<
    string & tags.Format<"email">
  >();
  const memberUserPassword: string = RandomGenerator.alphaNumeric(12);

  const memberUserJoin: ICommunityPlatformMemberuser.IAuthorized =
    await api.functional.auth.memberUser.join(connection, {
      body: {
        username: RandomGenerator.name(1),
        email: memberUserEmail,
        password: memberUserPassword,
        ip: undefined,
        href: "https://app.example.com/join" as string & tags.Format<"uri">,
        referrer: "https://app.example.com/landing" as string &
          tags.Format<"uri">,
      } satisfies ICommunityPlatformMemberuser.IJoinRequest,
    });
  typia.assert(memberUserJoin);

  const memberUserId: string & tags.Format<"uuid"> = memberUserJoin.id;

  // 4. Optionally re-login the member user to simulate normal login flow
  const memberUserLogin: ICommunityPlatformMemberuser.IAuthorized =
    await api.functional.auth.memberUser.login(connection, {
      body: {
        identifier: memberUserEmail,
        password: memberUserPassword,
        ip: undefined,
        href: "https://app.example.com/login" as string & tags.Format<"uri">,
        referrer: "https://app.example.com/landing" as string &
          tags.Format<"uri">,
      } satisfies ICommunityPlatformMemberuser.ILoginRequest,
    });
  typia.assert(memberUserLogin);

  // 5. As memberUser, create at least one community
  const community: ICommunityPlatformCommunity =
    await api.functional.communityPlatform.memberUser.communities.create(
      connection,
      {
        body: {
          identifier: `community-${RandomGenerator.alphaNumeric(8)}`,
          title: RandomGenerator.paragraph({ sentences: 2 }),
          description: RandomGenerator.paragraph({ sentences: 5 }),
          visibilityLevelCode: visibilityLevel.code,
          isNsfw: false,
          primaryTagIds: [],
        } satisfies ICommunityPlatformCommunity.ICreate,
      },
    );
  typia.assert(community);

  // 6. Create a baseline community subscription via collection-level POST
  const subscription1: ICommunityPlatformCommunitySubscription =
    await api.functional.communityPlatform.memberUser.subscriptions.create(
      connection,
      {
        body: {
          community_id: community.id,
          status: "active",
        } satisfies ICommunityPlatformCommunitySubscription.ICreate,
      },
    );
  typia.assert(subscription1);

  // 7. Create a memberUser-scoped subscription via memberUsers/{memberUserId}/subscriptions
  const subscription2: ICommunityPlatformCommunitySubscription =
    await api.functional.communityPlatform.memberUser.memberUsers.subscriptions.create(
      connection,
      {
        memberUserId,
        body: {
          community_id: community.id,
          status: "active",
        } satisfies ICommunityPlatformCommunitySubscription.ICreate,
      },
    );
  typia.assert(subscription2);

  // 8. Create at least one feed preference for this member user
  const preferences: ICommunityPlatformUserFeedPreferences =
    await api.functional.communityPlatform.memberUser.memberUsers.feedPreferences.create(
      connection,
      {
        memberUserId,
        body: {
          default_post_sort_mode: "hot",
          show_sensitive_content: false,
          include_recommended_feeds: true,
        } satisfies ICommunityPlatformUserFeedPreferences.ICreate,
      },
    );
  typia.assert(preferences);

  // 9. Construct a UUID that is guaranteed (with negligible collision risk)
  // to be different from the created preference id.
  let nonExistentPreferenceId: string & tags.Format<"uuid"> = typia.random<
    string & tags.Format<"uuid">
  >();
  if (nonExistentPreferenceId === preferences.id) {
    nonExistentPreferenceId = typia.random<string & tags.Format<"uuid">>();
  }

  // 10. Call GET /communityPlatform/memberUser/userFeedPreferences/{preferenceId}
  // with the non-existent ID and assert that an HttpError is thrown.
  await TestValidator.error(
    "non-existent user feed preference should surface an HttpError",
    async () => {
      await api.functional.communityPlatform.memberUser.userFeedPreferences.at(
        connection,
        {
          preferenceId: nonExistentPreferenceId,
        },
      );
    },
  );
}
