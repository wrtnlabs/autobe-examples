import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformAccountStatus } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAccountStatus";
import type { ICommunityPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunity";
import type { ICommunityPlatformCommunityBan } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunityBan";
import type { ICommunityPlatformCommunityModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunityModerator";
import type { ICommunityPlatformCommunityVisibilityLevel } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunityVisibilityLevel";
import type { ICommunityPlatformContentPolicyCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformContentPolicyCategory";
import type { ICommunityPlatformMemberuser } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMemberuser";
import type { ICommunityPlatformPlatformSetting } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformPlatformSetting";
import type { ICommunityPlatformPlatformadmin } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformPlatformadmin";
import type { ICommunityPlatformReportReasonCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformReportReasonCategory";

/**
 * Verify that a platform administrator can view individual community bans
 * across multiple distinct communities.
 *
 * Business flow:
 *
 * 1. A platform admin joins and seeds basic master data:
 *
 *    - A platform setting
 *    - An account status
 *    - A community visibility level
 *    - A content policy category
 *    - A report reason category
 * 2. Two different member users join (member A and member B).
 * 3. While authenticated as member A, create Community X using the previously
 *    created visibility level.
 * 4. Switch to member B (login) and create Community Y using the same visibility
 *    level.
 * 5. A community moderator joins and, as that moderator, creates:
 *
 *    - A ban in Community X targeting member A
 *    - A ban in Community Y targeting member B
 * 6. Switch back to the platform admin (login) and call the platform-admin-only
 *    GET endpoint for each ban:
 *
 *    - GET /communityPlatform/platformAdmin/communities/{communityIdentifier}/bans/{banId}
 * 7. Validate that:
 *
 *    - The fetched bans match the originally created bans by id
 *    - Each ban’s community matches the expected community (X or Y)
 *    - Each ban’s memberUser matches the banned member
 *    - Both bans are active and demonstrate that the same platform admin can see
 *         bans from different communities with consistent detail.
 */
export async function test_api_platform_admin_views_ban_across_communities(
  connection: api.IConnection,
) {
  // 1. Platform admin joins and is authenticated
  const platformAdminEmail: string = typia.random<
    string & tags.Format<"email">
  >();
  const platformAdminPassword: string = RandomGenerator.alphaNumeric(12);

  const platformAdminJoin: ICommunityPlatformPlatformadmin.IAuthorized =
    await api.functional.auth.platformAdmin.join(connection, {
      body: {
        username: RandomGenerator.alphabets(8),
        email: platformAdminEmail,
        password: platformAdminPassword,
        displayName: RandomGenerator.name(),
        ip: "127.0.0.1",
        href: "https://platform.example.com/admin/join",
        referrer: "https://platform.example.com/",
      } satisfies ICommunityPlatformPlatformadmin.IJoin,
    });
  typia.assert(platformAdminJoin);

  // 1-1. Create a platform setting related to bans
  const setting: ICommunityPlatformPlatformSetting =
    await api.functional.communityPlatform.platformAdmin.platformSettings.create(
      connection,
      {
        body: {
          key: `ban_policy_${RandomGenerator.alphaNumeric(8)}`,
          value: '{"maxTemporaryBanDays":30,"requireReason":true}',
          description: RandomGenerator.paragraph({ sentences: 5 }),
          is_active: true,
        } satisfies ICommunityPlatformPlatformSetting.ICreate,
      },
    );
  typia.assert(setting);

  // 1-2. Create an account status (e.g., ACTIVE)
  const accountStatus: ICommunityPlatformAccountStatus =
    await api.functional.communityPlatform.platformAdmin.accountStatuses.create(
      connection,
      {
        body: {
          key: `ACTIVE_${RandomGenerator.alphaNumeric(4)}`,
          label: "Active",
          description: RandomGenerator.paragraph({ sentences: 4 }),
          isLoginAllowed: true,
          isPostingAllowed: true,
          isVotingAllowed: true,
          requiresManualReview: false,
        } satisfies ICommunityPlatformAccountStatus.ICreate,
      },
    );
  typia.assert(accountStatus);

  // 1-3. Create a community visibility level used by both communities
  const visibilityCode: string = `public_${RandomGenerator.alphaNumeric(6)}`;
  const visibilityLevel: ICommunityPlatformCommunityVisibilityLevel =
    await api.functional.communityPlatform.platformAdmin.communityVisibilityLevels.create(
      connection,
      {
        body: {
          code: visibilityCode,
          name: "Public",
          description: RandomGenerator.paragraph({ sentences: 3 }),
        } satisfies ICommunityPlatformCommunityVisibilityLevel.ICreate,
      },
    );
  typia.assert(visibilityLevel);

  // 1-4. Content policy category and report reason category
  const policyCode: string = `harassment_${RandomGenerator.alphaNumeric(4)}`;
  const contentPolicyCategory: ICommunityPlatformContentPolicyCategory =
    await api.functional.communityPlatform.platformAdmin.contentPolicyCategories.create(
      connection,
      {
        body: {
          code: policyCode,
          name: "Harassment",
          description: RandomGenerator.paragraph({ sentences: 5 }),
          isActive: true,
          isDefault: true,
        } satisfies ICommunityPlatformContentPolicyCategory.ICreate,
      },
    );
  typia.assert(contentPolicyCategory);

  const reportReasonCode: string = `abuse_${RandomGenerator.alphaNumeric(4)}`;
  const reportReasonCategory: ICommunityPlatformReportReasonCategory =
    await api.functional.communityPlatform.platformAdmin.reportReasonCategories.create(
      connection,
      {
        body: {
          code: reportReasonCode,
          name: "Abusive behavior",
          description: RandomGenerator.paragraph({ sentences: 4 }),
          is_user_visible: true,
          is_active: true,
        } satisfies ICommunityPlatformReportReasonCategory.ICreate,
      },
    );
  typia.assert(reportReasonCategory);

  // 2. Register two member users
  const memberUserAEmail: string = typia.random<
    string & tags.Format<"email">
  >();
  const memberUserAPassword: string = RandomGenerator.alphaNumeric(10);

  const memberUserA: ICommunityPlatformMemberuser.IAuthorized =
    await api.functional.auth.memberUser.join(connection, {
      body: {
        username: `userA_${RandomGenerator.alphabets(6)}`,
        email: memberUserAEmail,
        password: memberUserAPassword,
        ip: "127.0.0.1",
        href: "https://platform.example.com/join/memberA",
        referrer: "https://platform.example.com/",
      } satisfies ICommunityPlatformMemberuser.IJoinRequest,
    });
  typia.assert(memberUserA);

  const memberUserBEmail: string = typia.random<
    string & tags.Format<"email">
  >();
  const memberUserBPassword: string = RandomGenerator.alphaNumeric(10);

  const memberUserB: ICommunityPlatformMemberuser.IAuthorized =
    await api.functional.auth.memberUser.join(connection, {
      body: {
        username: `userB_${RandomGenerator.alphabets(6)}`,
        email: memberUserBEmail,
        password: memberUserBPassword,
        ip: "127.0.0.1",
        href: "https://platform.example.com/join/memberB",
        referrer: "https://platform.example.com/",
      } satisfies ICommunityPlatformMemberuser.IJoinRequest,
    });
  typia.assert(memberUserB);

  // 3. While authenticated as member A, create Community X
  const communityXIdentifier: string = `community_x_${RandomGenerator.alphaNumeric(6)}`;
  const communityX: ICommunityPlatformCommunity =
    await api.functional.communityPlatform.memberUser.communities.create(
      connection,
      {
        body: {
          identifier: communityXIdentifier,
          title: `Community X ${RandomGenerator.name(2)}`,
          description: RandomGenerator.paragraph({ sentences: 6 }),
          visibilityLevelCode: visibilityCode,
          isNsfw: false,
          primaryTagIds: [],
        } satisfies ICommunityPlatformCommunity.ICreate,
      },
    );
  typia.assert(communityX);

  // 4. Switch to member B and create Community Y
  const loginMemberB: ICommunityPlatformMemberuser.IAuthorized =
    await api.functional.auth.memberUser.login(connection, {
      body: {
        identifier: memberUserBEmail,
        password: memberUserBPassword,
        ip: "127.0.0.1",
        href: "https://platform.example.com/login/memberB",
        referrer: "https://platform.example.com/",
      } satisfies ICommunityPlatformMemberuser.ILoginRequest,
    });
  typia.assert(loginMemberB);

  const communityYIdentifier: string = `community_y_${RandomGenerator.alphaNumeric(6)}`;
  const communityY: ICommunityPlatformCommunity =
    await api.functional.communityPlatform.memberUser.communities.create(
      connection,
      {
        body: {
          identifier: communityYIdentifier,
          title: `Community Y ${RandomGenerator.name(2)}`,
          description: RandomGenerator.paragraph({ sentences: 6 }),
          visibilityLevelCode: visibilityCode,
          isNsfw: false,
          primaryTagIds: [],
        } satisfies ICommunityPlatformCommunity.ICreate,
      },
    );
  typia.assert(communityY);

  // 5. Join a community moderator (actor used to create bans)
  const moderatorEmail: string = typia.random<string & tags.Format<"email">>();
  const moderatorPassword: string = RandomGenerator.alphaNumeric(10);

  const moderatorJoin: ICommunityPlatformCommunityModerator.IAuthorized =
    await api.functional.auth.communityModerator.join(connection, {
      body: {
        username: `mod_${RandomGenerator.alphabets(6)}`,
        email: moderatorEmail,
        password: moderatorPassword,
        display_name: RandomGenerator.name(),
        ip: "127.0.0.1",
        href: "https://platform.example.com/join/moderator",
        referrer: "https://platform.example.com/",
      } satisfies ICommunityPlatformCommunityModerator.IJoin,
    });
  typia.assert(moderatorJoin);

  // 6. Moderator creates a ban in Community X targeting memberUserA
  const startedAtX: string = new Date().toISOString();
  const banX: ICommunityPlatformCommunityBan =
    await api.functional.communityPlatform.communityModerator.communities.bans.create(
      connection,
      {
        communityIdentifier: communityX.identifier,
        body: {
          memberuser_id: memberUserA.id,
          reason: RandomGenerator.paragraph({ sentences: 3 }),
          policy_category: policyCode,
          started_at: startedAtX,
          expires_at: null,
        } satisfies ICommunityPlatformCommunityBan.ICreate,
      },
    );
  typia.assert(banX);

  // 7. Moderator creates a ban in Community Y targeting memberUserB
  const startedAtY: string = new Date().toISOString();
  const banY: ICommunityPlatformCommunityBan =
    await api.functional.communityPlatform.communityModerator.communities.bans.create(
      connection,
      {
        communityIdentifier: communityY.identifier,
        body: {
          memberuser_id: memberUserB.id,
          reason: RandomGenerator.paragraph({ sentences: 3 }),
          policy_category: policyCode,
          started_at: startedAtY,
          expires_at: null,
        } satisfies ICommunityPlatformCommunityBan.ICreate,
      },
    );
  typia.assert(banY);

  // 8. Switch back to platform admin using login
  const platformAdminLogin: ICommunityPlatformPlatformadmin.IAuthorized =
    await api.functional.auth.platformAdmin.login(connection, {
      body: {
        identifier: platformAdminEmail,
        password: platformAdminPassword,
        ip: "127.0.0.1",
        href: "https://platform.example.com/login/platformAdmin",
        referrer: "https://platform.example.com/",
      } satisfies ICommunityPlatformPlatformadmin.ILogin,
    });
  typia.assert(platformAdminLogin);

  // 9. Platform admin retrieves banX in Community X
  const fetchedBanX: ICommunityPlatformCommunityBan =
    await api.functional.communityPlatform.platformAdmin.communities.bans.at(
      connection,
      {
        communityIdentifier: communityX.identifier,
        banId: banX.id,
      },
    );
  typia.assert(fetchedBanX);

  // 10. Platform admin retrieves banY in Community Y
  const fetchedBanY: ICommunityPlatformCommunityBan =
    await api.functional.communityPlatform.platformAdmin.communities.bans.at(
      connection,
      {
        communityIdentifier: communityY.identifier,
        banId: banY.id,
      },
    );
  typia.assert(fetchedBanY);

  // 11. Assertions for ban X
  TestValidator.equals(
    "platform admin sees correct ban id for community X",
    fetchedBanX.id,
    banX.id,
  );
  TestValidator.equals(
    "platform admin sees correct community for ban X",
    fetchedBanX.community.id,
    communityX.id,
  );
  TestValidator.equals(
    "platform admin sees correct member for ban X",
    fetchedBanX.memberUser.id,
    memberUserA.id,
  );
  TestValidator.predicate("ban X is active", fetchedBanX.is_active === true);

  // 12. Assertions for ban Y
  TestValidator.equals(
    "platform admin sees correct ban id for community Y",
    fetchedBanY.id,
    banY.id,
  );
  TestValidator.equals(
    "platform admin sees correct community for ban Y",
    fetchedBanY.community.id,
    communityY.id,
  );
  TestValidator.equals(
    "platform admin sees correct member for ban Y",
    fetchedBanY.memberUser.id,
    memberUserB.id,
  );
  TestValidator.predicate("ban Y is active", fetchedBanY.is_active === true);

  // 13. Ensure similar structural detail and cross-community visibility
  TestValidator.predicate(
    "both bans have community and member summaries",
    fetchedBanX.community.id !== undefined &&
      fetchedBanY.community.id !== undefined &&
      fetchedBanX.memberUser.id !== undefined &&
      fetchedBanY.memberUser.id !== undefined,
  );

  TestValidator.predicate(
    "platform admin has global visibility across different communities",
    fetchedBanX.community.id !== fetchedBanY.community.id &&
      fetchedBanX.memberUser.id !== fetchedBanY.memberUser.id,
  );
}
