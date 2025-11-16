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

/**
 * Validate that a platform administrator can delete a user feed preference
 * record even when the owning member user would be considered deactivated,
 * ensuring orphaned or stale preferences can be safely cleaned up.
 *
 * Business flow covered:
 *
 * 1. Platform admin joins the platform.
 * 2. Member user joins the platform.
 * 3. Platform admin creates a visibility level used by user communities.
 * 4. Member user creates a community bound to that visibility level.
 * 5. Member user creates generic and member-scoped subscriptions to that
 *    community.
 * 6. Member user configures feed preferences in both member-scoped and generic
 *    forms.
 * 7. Platform admin deletes the concrete user feed preference record by id.
 * 8. Attempting to delete the same id again fails, proving cleanup occurred.
 */
export async function test_api_user_feed_preference_deletion_by_platform_admin_after_member_user_deactivation(
  connection: api.IConnection,
) {
  // 1. Register platform admin (also authenticates as platformAdmin)
  const adminEmail: string & tags.Format<"email"> = typia.random<
    string & tags.Format<"email">
  >();

  const adminHref: string & tags.Format<"uri"> =
    "https://admin.example.com/join" as string & tags.Format<"uri">;
  const adminReferrer: string & tags.Format<"uri"> =
    "https://admin.example.com/landing" as string & tags.Format<"uri">;

  const adminJoin: ICommunityPlatformPlatformadmin.IAuthorized =
    await api.functional.auth.platformAdmin.join(connection, {
      body: {
        username: RandomGenerator.name(1),
        email: adminEmail,
        password: "AdminPassw0rd!",
        displayName: RandomGenerator.name(),
        ip: "127.0.0.1",
        href: adminHref,
        referrer: adminReferrer,
      } satisfies ICommunityPlatformPlatformadmin.IJoin,
    });
  typia.assert(adminJoin);

  // 2. Register member user (SDK will switch Authorization to memberUser)
  const memberEmail: string & tags.Format<"email"> = typia.random<
    string & tags.Format<"email">
  >();
  const memberHref: string & tags.Format<"uri"> =
    "https://app.example.com/join" as string & tags.Format<"uri">;
  const memberReferrer: string & tags.Format<"uri"> =
    "https://app.example.com/landing" as string & tags.Format<"uri">;

  const memberJoin: ICommunityPlatformMemberuser.IAuthorized =
    await api.functional.auth.memberUser.join(connection, {
      body: {
        username: RandomGenerator.name(1),
        email: memberEmail,
        password: "MemberPassw0rd!",
        ip: "127.0.0.1",
        href: memberHref,
        referrer: memberReferrer,
      } satisfies ICommunityPlatformMemberuser.IJoinRequest,
    });
  typia.assert(memberJoin);

  const memberId: string & tags.Format<"uuid"> = memberJoin.id;

  // 3. Switch back to platform admin and create a visibility level
  const adminLoginHref: string & tags.Format<"uri"> =
    "https://admin.example.com/login" as string & tags.Format<"uri">;
  const adminLoginReferrer: string & tags.Format<"uri"> =
    "https://admin.example.com" as string & tags.Format<"uri">;

  const adminLogin: ICommunityPlatformPlatformadmin.IAuthorized =
    await api.functional.auth.platformAdmin.login(connection, {
      body: {
        identifier: adminEmail,
        password: "AdminPassw0rd!",
        ip: "127.0.0.1",
        href: adminLoginHref,
        referrer: adminLoginReferrer,
      } satisfies ICommunityPlatformPlatformadmin.ILogin,
    });
  typia.assert(adminLogin);

  const visibilityCode = "public-auto-test";

  const visibilityLevel: ICommunityPlatformCommunityVisibilityLevel =
    await api.functional.communityPlatform.platformAdmin.communityVisibilityLevels.create(
      connection,
      {
        body: {
          code: visibilityCode,
          name: "Public Auto Test",
          description:
            "Auto-generated visibility level for feed preference tests",
        } satisfies ICommunityPlatformCommunityVisibilityLevel.ICreate,
      },
    );
  typia.assert(visibilityLevel);

  // 4. Switch back to member user and create a community using that visibility level
  const memberLoginHref: string & tags.Format<"uri"> =
    "https://app.example.com/login" as string & tags.Format<"uri">;
  const memberLoginReferrer: string & tags.Format<"uri"> =
    "https://app.example.com" as string & tags.Format<"uri">;

  const memberLogin: ICommunityPlatformMemberuser.IAuthorized =
    await api.functional.auth.memberUser.login(connection, {
      body: {
        identifier: memberEmail,
        password: "MemberPassw0rd!",
        ip: "127.0.0.1",
        href: memberLoginHref,
        referrer: memberLoginReferrer,
      } satisfies ICommunityPlatformMemberuser.ILoginRequest,
    });
  typia.assert(memberLogin);

  const communityIdentifier = `auto-test-${RandomGenerator.alphabets(8)}`;

  const community: ICommunityPlatformCommunity =
    await api.functional.communityPlatform.memberUser.communities.create(
      connection,
      {
        body: {
          identifier: communityIdentifier,
          title: "Auto Test Community",
          description: RandomGenerator.paragraph({
            sentences: 5,
            wordMin: 4,
            wordMax: 10,
          }),
          visibilityLevelCode: visibilityCode,
          isNsfw: false,
          primaryTagIds: [],
        } satisfies ICommunityPlatformCommunity.ICreate,
      },
    );
  typia.assert(community);

  const communityId: string & tags.Format<"uuid"> = community.id;

  // 5. Member user creates a generic subscription to the community
  const genericSubscription: ICommunityPlatformCommunitySubscription =
    await api.functional.communityPlatform.memberUser.subscriptions.create(
      connection,
      {
        body: {
          community_id: communityId,
          status: "active",
        } satisfies ICommunityPlatformCommunitySubscription.ICreate,
      },
    );
  typia.assert(genericSubscription);

  // 6. Member user creates a memberUser-scoped subscription to the same community
  const scopedSubscription: ICommunityPlatformCommunitySubscription =
    await api.functional.communityPlatform.memberUser.memberUsers.subscriptions.create(
      connection,
      {
        memberUserId: memberId,
        body: {
          community_id: communityId,
          status: "active",
        } satisfies ICommunityPlatformCommunitySubscription.ICreate,
      },
    );
  typia.assert(scopedSubscription);

  // 7. Member user creates/updates member-scoped feed preferences
  const memberScopedPreferences: ICommunityPlatformUserFeedPreferences =
    await api.functional.communityPlatform.memberUser.memberUsers.feedPreferences.create(
      connection,
      {
        memberUserId: memberId,
        body: {
          default_post_sort_mode: "hot",
          show_sensitive_content: false,
          include_recommended_feeds: true,
        } satisfies ICommunityPlatformUserFeedPreferences.ICreate,
      },
    );
  typia.assert(memberScopedPreferences);

  // 8. Member user creates a concrete user feed preference record (collection endpoint)
  const concretePreferences: ICommunityPlatformUserFeedPreferences =
    await api.functional.communityPlatform.memberUser.userFeedPreferences.create(
      connection,
      {
        body: {
          default_post_sort_mode: "new",
          show_sensitive_content: false,
          include_recommended_feeds: true,
        } satisfies ICommunityPlatformUserFeedPreferences.ICreate,
      },
    );
  typia.assert(concretePreferences);

  const preferenceId: string & tags.Format<"uuid"> = concretePreferences.id;

  // 9. Simulated member deactivation: no-op in this test; we rely on admin authority.

  // 10. Switch back to platform admin
  const adminLoginAgain: ICommunityPlatformPlatformadmin.IAuthorized =
    await api.functional.auth.platformAdmin.login(connection, {
      body: {
        identifier: adminEmail,
        password: "AdminPassw0rd!",
        ip: "127.0.0.1",
        href: adminLoginHref,
        referrer: adminLoginReferrer,
      } satisfies ICommunityPlatformPlatformadmin.ILogin,
    });
  typia.assert(adminLoginAgain);

  // 11. Admin deletes the user feed preference record by id
  await api.functional.communityPlatform.platformAdmin.userFeedPreferences.erase(
    connection,
    {
      preferenceId,
    },
  );

  // 12. Deleting the same preference again should fail, proving the first delete worked
  await TestValidator.error(
    "second deletion of the same user feed preference id should fail",
    async () => {
      await api.functional.communityPlatform.platformAdmin.userFeedPreferences.erase(
        connection,
        {
          preferenceId,
        },
      );
    },
  );
}
