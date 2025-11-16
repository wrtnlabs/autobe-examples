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
 * Verify that a community moderator can view full details of an active
 * community-level ban.
 *
 * Business workflow:
 *
 * 1. Platform admin joins and logs in to configure master data (account status,
 *    visibility level, platform setting, content policy category, report reason
 *    category).
 * 2. Member user joins and logs in.
 * 3. Member user creates a community using the configured visibility level.
 * 4. Community moderator joins and logs in.
 * 5. Platform admin creates a community-level ban for the member user in the
 *    created community, with started_at at (or near) now and expires_at in the
 *    future.
 * 6. Community moderator logs in.
 * 7. Community moderator calls the GET ban detail endpoint.
 * 8. Validate that the response structure matches ICommunityPlatformCommunityBan,
 *    that is_active is true, started_at is in the past, expires_at is in the
 *    future, deleted_at is null, the community and memberUser summaries match
 *    the prepared entities, and issuedByPlatformAdmin is populated while
 *    issuedByCommunityModerator is null.
 */
export async function test_api_community_moderator_views_active_ban_detail(
  connection: api.IConnection,
) {
  // 1. Platform admin joins
  const platformAdminJoinHref: string & tags.Format<"uri"> =
    "https://platform.example.com/admin/join" as string & tags.Format<"uri">;
  const platformAdminJoinReferrer: string & tags.Format<"uri"> =
    "https://platform.example.com/landing" as string & tags.Format<"uri">;

  const platformAdminJoinBody = {
    username: RandomGenerator.alphabets(12),
    email: `${RandomGenerator.alphabets(8)}@admin.example.com` as string &
      tags.Format<"email">,
    password: "P@ssw0rd!",
    displayName: RandomGenerator.name(),
    ip: "127.0.0.1",
    href: platformAdminJoinHref,
    referrer: platformAdminJoinReferrer,
  } satisfies ICommunityPlatformPlatformadmin.IJoin;

  const platformAdmin: ICommunityPlatformPlatformadmin.IAuthorized =
    await api.functional.auth.platformAdmin.join(connection, {
      body: platformAdminJoinBody,
    });
  typia.assert(platformAdmin);

  // 2. Create master data as platform admin
  // 2-1. Account status (ACTIVE)
  const accountStatusBody = {
    key: "ACTIVE",
    label: "Active",
    description: "Active account status for all actors",
    isLoginAllowed: true,
    isPostingAllowed: true,
    isVotingAllowed: true,
    requiresManualReview: false,
  } satisfies ICommunityPlatformAccountStatus.ICreate;

  const accountStatus: ICommunityPlatformAccountStatus =
    await api.functional.communityPlatform.platformAdmin.accountStatuses.create(
      connection,
      { body: accountStatusBody },
    );
  typia.assert(accountStatus);

  // 2-2. Community visibility level (public)
  const visibilityLevelCode = "public";
  const visibilityLevelBody = {
    code: visibilityLevelCode,
    name: "Public",
    description: "Publicly visible community",
  } satisfies ICommunityPlatformCommunityVisibilityLevel.ICreate;

  const visibilityLevel: ICommunityPlatformCommunityVisibilityLevel =
    await api.functional.communityPlatform.platformAdmin.communityVisibilityLevels.create(
      connection,
      { body: visibilityLevelBody },
    );
  typia.assert(visibilityLevel);

  // 2-3. Platform setting related to bans (e.g., max duration)
  const platformSettingKey = "ban.max_duration_days";
  const platformSettingBody = {
    key: platformSettingKey,
    value: "30",
    description:
      "Maximum allowed duration in days for community-level bans created by admins.",
    is_active: true,
  } satisfies ICommunityPlatformPlatformSetting.ICreate;

  const platformSetting: ICommunityPlatformPlatformSetting =
    await api.functional.communityPlatform.platformAdmin.platformSettings.create(
      connection,
      { body: platformSettingBody },
    );
  typia.assert(platformSetting);

  // 2-4. Content policy category
  const contentPolicyCode = "harassment";
  const contentPolicyBody = {
    code: contentPolicyCode,
    name: "Harassment",
    description: "Harassment and bullying policy category",
    isActive: true,
    isDefault: true,
  } satisfies ICommunityPlatformContentPolicyCategory.ICreate;

  const contentPolicyCategory: ICommunityPlatformContentPolicyCategory =
    await api.functional.communityPlatform.platformAdmin.contentPolicyCategories.create(
      connection,
      { body: contentPolicyBody },
    );
  typia.assert(contentPolicyCategory);

  // 2-5. Report reason category
  const reportReasonCode = "harassment_reports";
  const reportReasonBody = {
    code: reportReasonCode,
    name: "Harassment reports",
    description: "Reports related to harassment or bullying",
    is_user_visible: true,
    is_active: true,
  } satisfies ICommunityPlatformReportReasonCategory.ICreate;

  const reportReasonCategory: ICommunityPlatformReportReasonCategory =
    await api.functional.communityPlatform.platformAdmin.reportReasonCategories.create(
      connection,
      { body: reportReasonBody },
    );
  typia.assert(reportReasonCategory);

  // 3. Member user joins
  const memberJoinHref: string & tags.Format<"uri"> =
    "https://platform.example.com/join" as string & tags.Format<"uri">;
  const memberJoinReferrer: string & tags.Format<"uri"> =
    "https://platform.example.com/marketing" as string & tags.Format<"uri">;

  const memberUsername = RandomGenerator.alphabets(10);
  const memberEmail =
    `${RandomGenerator.alphabets(8)}@member.example.com` as string &
      tags.Format<"email">;

  const memberJoinBody = {
    username: memberUsername,
    email: memberEmail,
    password: "P@ssw0rd!",
    ip: "127.0.0.1",
    href: memberJoinHref,
    referrer: memberJoinReferrer,
  } satisfies ICommunityPlatformMemberuser.IJoinRequest;

  const memberAuthorized: ICommunityPlatformMemberuser.IAuthorized =
    await api.functional.auth.memberUser.join(connection, {
      body: memberJoinBody,
    });
  typia.assert(memberAuthorized);

  const memberId = memberAuthorized.id;

  // 4. Member user creates a community (memberUser auth is already active
  //    because join endpoint sets Authorization header via token.access)
  const communityIdentifier = RandomGenerator.alphabets(12);
  const communityTitle = RandomGenerator.paragraph({ sentences: 3 });

  const communityBody = {
    identifier: communityIdentifier,
    title: communityTitle,
    description: RandomGenerator.paragraph({ sentences: 5 }),
    visibilityLevelCode,
    isNsfw: false,
    primaryTagIds: [],
  } satisfies ICommunityPlatformCommunity.ICreate;

  const community: ICommunityPlatformCommunity =
    await api.functional.communityPlatform.memberUser.communities.create(
      connection,
      { body: communityBody },
    );
  typia.assert(community);

  TestValidator.equals(
    "community identifier should match creation payload",
    community.identifier,
    communityIdentifier,
  );

  // 5. Platform admin logs in again (explicit login sequence)
  const platformAdminLoginBody = {
    identifier: platformAdmin.email,
    password: "P@ssw0rd!",
    ip: "127.0.0.1",
    href: "https://platform.example.com/admin/login" as string &
      tags.Format<"uri">,
    referrer: "https://platform.example.com/admin" as string &
      tags.Format<"uri">,
  } satisfies ICommunityPlatformPlatformadmin.ILogin;

  const platformAdminLogin: ICommunityPlatformPlatformadmin.IAuthorized =
    await api.functional.auth.platformAdmin.login(connection, {
      body: platformAdminLoginBody,
    });
  typia.assert(platformAdminLogin);

  // 6. Community moderator joins
  const communityModeratorJoinHref: string & tags.Format<"uri"> =
    "https://platform.example.com/moderator/join" as string &
      tags.Format<"uri">;
  const communityModeratorJoinReferrer: string & tags.Format<"uri"> =
    "https://platform.example.com" as string & tags.Format<"uri">;

  const moderatorUsername = RandomGenerator.alphabets(10);
  const moderatorEmail =
    `${RandomGenerator.alphabets(8)}@moderator.example.com` as string &
      tags.Format<"email">;

  const communityModeratorJoinBody = {
    username: moderatorUsername,
    email: moderatorEmail,
    password: "P@ssw0rd!",
    display_name: RandomGenerator.name(),
    ip: "127.0.0.1",
    href: communityModeratorJoinHref,
    referrer: communityModeratorJoinReferrer,
  } satisfies ICommunityPlatformCommunityModerator.IJoin;

  const communityModeratorAuthorized: ICommunityPlatformCommunityModerator.IAuthorized =
    await api.functional.auth.communityModerator.join(connection, {
      body: communityModeratorJoinBody,
    });
  typia.assert(communityModeratorAuthorized);

  // 7. Create a community-level ban as platform admin for the member user
  const now = new Date();
  const startedAt = now.toISOString();
  const expiresAt = new Date(
    now.getTime() + 7 * 24 * 60 * 60 * 1000,
  ).toISOString();

  const banCreateBody = {
    memberuser_id: memberId,
    reason: "Repeated harassment in threads",
    policy_category: contentPolicyCode,
    started_at: startedAt,
    expires_at: expiresAt,
  } satisfies ICommunityPlatformCommunityBan.ICreate;

  const createdBan: ICommunityPlatformCommunityBan =
    await api.functional.communityPlatform.platformAdmin.communities.bans.create(
      connection,
      {
        communityIdentifier,
        body: banCreateBody,
      },
    );
  typia.assert(createdBan);

  TestValidator.equals(
    "ban community id should match created community id",
    createdBan.community.id,
    community.id,
  );

  TestValidator.equals(
    "ban member user id should match target member",
    createdBan.memberUser.id,
    memberId,
  );

  // 8. Community moderator logs in
  const communityModeratorLoginBody = {
    identifier: moderatorEmail,
    password: "P@ssw0rd!",
    ip: "127.0.0.1",
    href: "https://platform.example.com/moderator/login" as string &
      tags.Format<"uri">,
    referrer: "https://platform.example.com" as string & tags.Format<"uri">,
  } satisfies ICommunityPlatformCommunityModerator.ILogin;

  const communityModeratorLogin: ICommunityPlatformCommunityModerator.IAuthorized =
    await api.functional.auth.communityModerator.login(connection, {
      body: communityModeratorLoginBody,
    });
  typia.assert(communityModeratorLogin);

  // 9. Community moderator fetches ban detail
  const fetchedBan: ICommunityPlatformCommunityBan =
    await api.functional.communityPlatform.communityModerator.communities.bans.at(
      connection,
      {
        communityIdentifier,
        banId: createdBan.id,
      },
    );
  typia.assert(fetchedBan);

  // 10. Business validations
  TestValidator.equals(
    "fetched ban id should match created ban id",
    fetchedBan.id,
    createdBan.id,
  );

  TestValidator.equals(
    "fetched community id should match created community id",
    fetchedBan.community.id,
    community.id,
  );

  TestValidator.equals(
    "fetched member user id should match target member id",
    fetchedBan.memberUser.id,
    memberId,
  );

  TestValidator.predicate(
    "ban should be active",
    fetchedBan.is_active === true,
  );

  const nowAfterFetch = new Date();
  const startedAtDate = new Date(fetchedBan.started_at);
  const expiresAtDate = fetchedBan.expires_at
    ? new Date(fetchedBan.expires_at)
    : null;

  TestValidator.predicate(
    "ban started_at should be at or before now",
    startedAtDate.getTime() <= nowAfterFetch.getTime(),
  );

  if (expiresAtDate !== null) {
    TestValidator.predicate(
      "ban expires_at should be in the future",
      expiresAtDate.getTime() > nowAfterFetch.getTime(),
    );
  }

  TestValidator.equals(
    "ban deleted_at should be null for active ban",
    fetchedBan.deleted_at ?? null,
    null,
  );

  TestValidator.predicate(
    "ban issuedByPlatformAdmin should be defined",
    fetchedBan.issuedByPlatformAdmin !== null &&
      fetchedBan.issuedByPlatformAdmin !== undefined,
  );

  TestValidator.equals(
    "ban issuedByCommunityModerator should be null when created by platform admin",
    fetchedBan.issuedByCommunityModerator ?? null,
    null,
  );
}
