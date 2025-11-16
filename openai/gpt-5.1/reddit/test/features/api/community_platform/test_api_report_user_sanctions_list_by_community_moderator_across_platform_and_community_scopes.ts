import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformAccountStatus } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAccountStatus";
import type { ICommunityPlatformActor } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformActor";
import type { ICommunityPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunity";
import type { ICommunityPlatformCommunityModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunityModerator";
import type { ICommunityPlatformCommunitySubscription } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunitySubscription";
import type { ICommunityPlatformCommunityVisibilityLevel } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunityVisibilityLevel";
import type { ICommunityPlatformGuestuser } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformGuestuser";
import type { ICommunityPlatformMemberuser } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMemberuser";
import type { ICommunityPlatformPlatformadmin } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformPlatformadmin";
import type { ICommunityPlatformReport } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformReport";
import type { ICommunityPlatformReportReasonCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformReportReasonCategory";
import type { ICommunityPlatformUserSanction } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformUserSanction";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageICommunityPlatformUserSanction } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageICommunityPlatformUserSanction";

/**
 * Verify that community moderator user sanction listing correctly distinguishes
 * platform-wide vs community-scoped sanctions using the community_id filter.
 *
 * Business flow:
 *
 * 1. Member user joins and logs in.
 * 2. Platform admin joins and logs in, and creates a visibility level.
 * 3. Member user creates a community using that visibility level.
 * 4. Member user subscribes to that community.
 * 5. Member user creates a report within that community.
 * 6. Community moderator joins and logs in.
 * 7. Moderator creates two sanctions for the same report: one platform-wide
 *    (community_id null) and one community-scoped (community_id =
 *    community.id).
 * 8. Moderator lists sanctions for the report with community_id null and sees only
 *    the platform-wide sanction.
 * 9. Moderator lists sanctions for the report with community_id = community.id and
 *    sees only the community-scoped sanction.
 * 10. Moderator lists sanctions without community_id filter and sees both
 *     sanctions, and summary DTO reflects scope correctly via the community
 *     field.
 */
export async function test_api_report_user_sanctions_list_by_community_moderator_across_platform_and_community_scopes(
  connection: api.IConnection,
) {
  // 1. Member user joins
  const memberPassword = "Member#" + RandomGenerator.alphaNumeric(8);
  const memberJoinBody = {
    username: `member_${RandomGenerator.alphaNumeric(8)}`,
    email: typia.random<string & tags.Format<"email">>(),
    password: memberPassword,
    ip: null,
    href: "https://example.com/join/member",
    referrer: "https://example.com/landing",
  } satisfies ICommunityPlatformMemberuser.IJoinRequest;

  const memberAuthorized: ICommunityPlatformMemberuser.IAuthorized =
    await api.functional.auth.memberUser.join(connection, {
      body: memberJoinBody,
    });
  typia.assert(memberAuthorized);

  // Explicit login to ensure login endpoint is covered
  const memberLoginBody = {
    identifier: memberJoinBody.email,
    password: memberPassword,
    ip: null,
    href: "https://example.com/login/member",
    referrer: "https://example.com/landing",
  } satisfies ICommunityPlatformMemberuser.ILoginRequest;

  const memberLoginAuthorized: ICommunityPlatformMemberuser.IAuthorized =
    await api.functional.auth.memberUser.login(connection, {
      body: memberLoginBody,
    });
  typia.assert(memberLoginAuthorized);

  // 2. Platform admin joins and logs in, then creates a visibility level
  const adminPassword = "Admin#" + RandomGenerator.alphaNumeric(8);
  const visibilityCode = `vis_${RandomGenerator.alphaNumeric(6)}`;

  const platformAdminJoinBody = {
    username: `admin_${RandomGenerator.alphaNumeric(8)}`,
    email: typia.random<string & tags.Format<"email">>(),
    password: adminPassword,
    displayName: RandomGenerator.name(),
    ip: undefined,
    href: "https://example.com/join/admin",
    referrer: "https://example.com/landing",
  } satisfies ICommunityPlatformPlatformadmin.IJoin;

  const platformAdminAuthorized: ICommunityPlatformPlatformadmin.IAuthorized =
    await api.functional.auth.platformAdmin.join(connection, {
      body: platformAdminJoinBody,
    });
  typia.assert(platformAdminAuthorized);

  const platformAdminLoginBody = {
    identifier: platformAdminJoinBody.email,
    password: adminPassword,
    ip: null,
    href: "https://example.com/login/admin",
    referrer: "https://example.com/landing",
  } satisfies ICommunityPlatformPlatformadmin.ILogin;

  const platformAdminLoginAuthorized: ICommunityPlatformPlatformadmin.IAuthorized =
    await api.functional.auth.platformAdmin.login(connection, {
      body: platformAdminLoginBody,
    });
  typia.assert(platformAdminLoginAuthorized);

  const visibilityCreateBody = {
    code: visibilityCode,
    name: `Visibility ${RandomGenerator.alphabets(5)}`,
    description: RandomGenerator.paragraph({ sentences: 5 }),
  } satisfies ICommunityPlatformCommunityVisibilityLevel.ICreate;

  const visibilityLevel: ICommunityPlatformCommunityVisibilityLevel =
    await api.functional.communityPlatform.platformAdmin.communityVisibilityLevels.create(
      connection,
      { body: visibilityCreateBody },
    );
  typia.assert(visibilityLevel);

  // 3. Switch back to member user (login again to ensure correct actor)
  const memberReloginAuthorized: ICommunityPlatformMemberuser.IAuthorized =
    await api.functional.auth.memberUser.login(connection, {
      body: memberLoginBody,
    });
  typia.assert(memberReloginAuthorized);

  // 3. Member creates a community using the created visibility level
  const communityCreateBody = {
    identifier: `community_${RandomGenerator.alphaNumeric(8)}`,
    title: RandomGenerator.paragraph({ sentences: 3 }),
    description: RandomGenerator.paragraph({ sentences: 5 }),
    visibilityLevelCode: visibilityLevel.code,
    isNsfw: false,
    primaryTagIds: [],
  } satisfies ICommunityPlatformCommunity.ICreate;

  const community: ICommunityPlatformCommunity =
    await api.functional.communityPlatform.memberUser.communities.create(
      connection,
      { body: communityCreateBody },
    );
  typia.assert(community);

  // 4. Member subscribes to community
  const subscriptionCreateBody = {
    community_id: community.id,
    status: "active",
  } satisfies ICommunityPlatformCommunitySubscription.ICreate;

  const subscription: ICommunityPlatformCommunitySubscription =
    await api.functional.communityPlatform.memberUser.communities.subscriptions.create(
      connection,
      {
        communityId: community.id,
        body: subscriptionCreateBody,
      },
    );
  typia.assert(subscription);

  // 5. Member creates a report in the context of the community
  const reportCreateBody = {
    reporter_type: "member",
    report_reason_category_id: typia.random<string & tags.Format<"uuid">>(),
    community_id: community.id,
    severity: "medium",
    description: RandomGenerator.paragraph({ sentences: 6 }),
  } satisfies ICommunityPlatformReport.ICreate;

  const report: ICommunityPlatformReport =
    await api.functional.communityPlatform.memberUser.reports.create(
      connection,
      { body: reportCreateBody },
    );
  typia.assert(report);

  // 6. Community moderator joins and logs in
  const moderatorPassword = "Mod#" + RandomGenerator.alphaNumeric(8);
  const moderatorJoinBody = {
    username: `mod_${RandomGenerator.alphaNumeric(8)}`,
    email: typia.random<string & tags.Format<"email">>(),
    password: moderatorPassword,
    display_name: RandomGenerator.name(),
    ip: null,
    href: "https://example.com/join/moderator",
    referrer: "https://example.com/landing",
  } satisfies ICommunityPlatformCommunityModerator.IJoin;

  const moderatorAuthorized: ICommunityPlatformCommunityModerator.IAuthorized =
    await api.functional.auth.communityModerator.join(connection, {
      body: moderatorJoinBody,
    });
  typia.assert(moderatorAuthorized);

  const moderatorLoginBody = {
    identifier: moderatorJoinBody.email,
    password: moderatorPassword,
    ip: null,
    href: "https://example.com/login/moderator",
    referrer: "https://example.com/landing",
  } satisfies ICommunityPlatformCommunityModerator.ILogin;

  const moderatorLoginAuthorized: ICommunityPlatformCommunityModerator.IAuthorized =
    await api.functional.auth.communityModerator.login(connection, {
      body: moderatorLoginBody,
    });
  typia.assert(moderatorLoginAuthorized);

  // 7. Moderator creates two sanctions against the member based on the report
  const now = new Date();
  const future = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);

  const platformSanctionCreateBody = {
    community_platform_report_id: report.id,
    sanctioned_memberuser_id: memberAuthorized.id,
    community_id: null,
    sanction_type: "temporary_platform_ban_platform_scope_test",
    status: "active",
    effective_from: now.toISOString(),
    effective_until: future.toISOString(),
    reason_summary: "Platform-wide sanction for testing scope filtering",
    notes_internal: "Internal note: platform-wide test sanction",
  } satisfies ICommunityPlatformUserSanction.ICreate;

  const platformSanction: ICommunityPlatformUserSanction =
    await api.functional.communityPlatform.communityModerator.reports.userSanctions.create(
      connection,
      {
        reportId: report.id,
        body: platformSanctionCreateBody,
      },
    );
  typia.assert(platformSanction);

  const communitySanctionCreateBody = {
    community_platform_report_id: report.id,
    sanctioned_memberuser_id: memberAuthorized.id,
    community_id: community.id,
    sanction_type: "temporary_community_ban_community_scope_test",
    status: "active",
    effective_from: now.toISOString(),
    effective_until: future.toISOString(),
    reason_summary: "Community-scoped sanction for testing scope filtering",
    notes_internal: "Internal note: community-scoped test sanction",
  } satisfies ICommunityPlatformUserSanction.ICreate;

  const communitySanction: ICommunityPlatformUserSanction =
    await api.functional.communityPlatform.communityModerator.reports.userSanctions.create(
      connection,
      {
        reportId: report.id,
        body: communitySanctionCreateBody,
      },
    );
  typia.assert(communitySanction);

  // 8. List sanctions with community_id null => expect only platform-wide sanction
  const listPlatformOnlyBody = {
    page: 1 as number & tags.Type<"int32">,
    limit: 10 as number & tags.Type<"int32">,
    sanction_type: null,
    status: null,
    community_id: null,
    sanctioned_memberuser_id: null,
    effective_from_from: null,
    effective_from_to: null,
    effective_until_from: null,
    effective_until_to: null,
    order_by: null,
    order_direction: null,
  } satisfies ICommunityPlatformUserSanction.IRequest;

  const platformOnlyPage: IPageICommunityPlatformUserSanction.ISummary =
    await api.functional.communityPlatform.communityModerator.reports.userSanctions.index(
      connection,
      {
        reportId: report.id,
        body: listPlatformOnlyBody,
      },
    );
  typia.assert(platformOnlyPage);

  TestValidator.predicate(
    "platform-only listing returns exactly one sanction",
    platformOnlyPage.data.length === 1,
  );

  const platformSummary = platformOnlyPage.data[0];

  TestValidator.equals(
    "platform-only summary id matches created platform sanction",
    platformSummary.id,
    platformSanction.id,
  );

  TestValidator.equals(
    "platform-only summary sanctionType matches platform sanction",
    platformSummary.sanctionType,
    platformSanction.sanction_type,
  );

  TestValidator.predicate(
    "platform-only summary community is undefined or null (platform-wide)",
    platformSummary.community === undefined ||
      platformSummary.community === null,
  );

  // 9. List sanctions with community_id = community.id => expect only community-scoped sanction
  const listCommunityOnlyBody = {
    page: 1 as number & tags.Type<"int32">,
    limit: 10 as number & tags.Type<"int32">,
    sanction_type: null,
    status: null,
    community_id: community.id,
    sanctioned_memberuser_id: null,
    effective_from_from: null,
    effective_from_to: null,
    effective_until_from: null,
    effective_until_to: null,
    order_by: null,
    order_direction: null,
  } satisfies ICommunityPlatformUserSanction.IRequest;

  const communityOnlyPage: IPageICommunityPlatformUserSanction.ISummary =
    await api.functional.communityPlatform.communityModerator.reports.userSanctions.index(
      connection,
      {
        reportId: report.id,
        body: listCommunityOnlyBody,
      },
    );
  typia.assert(communityOnlyPage);

  TestValidator.predicate(
    "community-only listing returns exactly one sanction",
    communityOnlyPage.data.length === 1,
  );

  const communitySummary = communityOnlyPage.data[0];

  TestValidator.equals(
    "community-only summary id matches created community sanction",
    communitySummary.id,
    communitySanction.id,
  );

  TestValidator.equals(
    "community-only summary sanctionType matches community sanction",
    communitySummary.sanctionType,
    communitySanction.sanction_type,
  );

  TestValidator.predicate(
    "community-only summary has community object defined",
    communitySummary.community !== undefined &&
      communitySummary.community !== null,
  );

  if (
    communitySummary.community !== undefined &&
    communitySummary.community !== null
  ) {
    TestValidator.equals(
      "community-only summary community id matches community",
      communitySummary.community.id,
      community.id,
    );
  }

  // 10. List sanctions without community_id filter => expect both sanctions present
  const listAllBody = {
    page: 1 as number & tags.Type<"int32">,
    limit: 10 as number & tags.Type<"int32">,
    sanction_type: null,
    status: null,
    community_id: undefined,
    sanctioned_memberuser_id: null,
    effective_from_from: null,
    effective_from_to: null,
    effective_until_from: null,
    effective_until_to: null,
    order_by: null,
    order_direction: null,
  } satisfies ICommunityPlatformUserSanction.IRequest;

  const allPage: IPageICommunityPlatformUserSanction.ISummary =
    await api.functional.communityPlatform.communityModerator.reports.userSanctions.index(
      connection,
      {
        reportId: report.id,
        body: listAllBody,
      },
    );
  typia.assert(allPage);

  TestValidator.predicate(
    "combined listing returns at least two sanctions",
    allPage.data.length >= 2,
  );

  const allIds = allPage.data.map((s) => s.id);

  TestValidator.predicate(
    "combined listing includes platform sanction id",
    allIds.includes(platformSanction.id),
  );

  TestValidator.predicate(
    "combined listing includes community sanction id",
    allIds.includes(communitySanction.id),
  );

  const foundPlatformSummary = allPage.data.find(
    (s) => s.id === platformSanction.id,
  );
  const foundCommunitySummary = allPage.data.find(
    (s) => s.id === communitySanction.id,
  );

  TestValidator.predicate(
    "platform sanction summary found in combined listing",
    foundPlatformSummary !== undefined,
  );

  TestValidator.predicate(
    "community sanction summary found in combined listing",
    foundCommunitySummary !== undefined,
  );

  if (foundPlatformSummary !== undefined) {
    TestValidator.predicate(
      "platform sanction summary community is undefined or null in combined listing",
      foundPlatformSummary.community === undefined ||
        foundPlatformSummary.community === null,
    );
  }

  if (foundCommunitySummary !== undefined) {
    TestValidator.predicate(
      "community sanction summary has community in combined listing",
      foundCommunitySummary.community !== undefined &&
        foundCommunitySummary.community !== null,
    );

    if (
      foundCommunitySummary.community !== undefined &&
      foundCommunitySummary.community !== null
    ) {
      TestValidator.equals(
        "community sanction summary community id matches community in combined listing",
        foundCommunitySummary.community.id,
        community.id,
      );
    }
  }
}
