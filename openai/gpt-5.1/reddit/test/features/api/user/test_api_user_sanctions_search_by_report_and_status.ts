import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformAccountStatus } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAccountStatus";
import type { ICommunityPlatformActor } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformActor";
import type { ICommunityPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunity";
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
 * Validate that platformAdmin can search user sanctions by contextual filters.
 *
 * This scenario ensures that a sanction created by a platform administrator for
 * a specific member user, report, and community is immediately discoverable via
 * the flexible PATCH /communityPlatform/platformAdmin/userSanctions search
 * endpoint when filtering by status, community, and sanctioned member.
 *
 * Steps:
 *
 * 1. Register a platformAdmin and rely on join to authenticate that actor.
 * 2. Register a memberUser who will own the community and be the sanction subject.
 * 3. As platformAdmin, create a community visibility level master record.
 * 4. As memberUser, create a community using the created visibility level.
 * 5. As memberUser, create a moderation report linked to that community.
 * 6. As platformAdmin, create a user sanction tied to the report, community, and
 *    memberUser, with a concrete sanction_type and status.
 * 7. As platformAdmin, search sanctions with
 *    ICommunityPlatformUserSanction.IRequest filtering by status, community_id,
 *    and sanctioned_memberuser_id.
 * 8. Assert the created sanction appears in pagination.data and that its summary
 *    fields (sanctionType, status, reportId, community scope) match the created
 *    record.
 * 9. Perform a negative search with a different status filter and assert that the
 *    created sanction is not returned.
 */
export async function test_api_user_sanctions_search_by_report_and_status(
  connection: api.IConnection,
) {
  // 1. Register & authenticate platform admin
  const platformAdminJoinBody = {
    username: RandomGenerator.alphabets(12),
    email: typia.random<string & tags.Format<"email">>(),
    password: "AdminPassw0rd!",
    displayName: RandomGenerator.name(),
    ip: "127.0.0.1",
    href: "https://admin.example.com/join",
    referrer: "https://admin.example.com/landing",
  } satisfies ICommunityPlatformPlatformadmin.IJoin;

  const platformAdminAuthorized: ICommunityPlatformPlatformadmin.IAuthorized =
    await api.functional.auth.platformAdmin.join(connection, {
      body: platformAdminJoinBody,
    });
  typia.assert(platformAdminAuthorized);

  // 2. Register memberUser (will be sanctioned subject and community owner)
  const memberUserJoinBody = {
    username: RandomGenerator.alphabets(10),
    email: typia.random<string & tags.Format<"email">>(),
    password: "MemberPassw0rd!",
    ip: "127.0.0.1",
    href: "https://community.example.com/join",
    referrer: "https://community.example.com/home",
  } satisfies ICommunityPlatformMemberuser.IJoinRequest;

  const memberUserAuthorized: ICommunityPlatformMemberuser.IAuthorized =
    await api.functional.auth.memberUser.join(connection, {
      body: memberUserJoinBody,
    });
  typia.assert(memberUserAuthorized);

  const sanctionedMemberUserId = memberUserAuthorized.id;

  // 3. Switch back to platformAdmin explicitly via login to ensure actor context
  const platformAdminLoginBody = {
    identifier: platformAdminJoinBody.email,
    password: platformAdminJoinBody.password,
    ip: "127.0.0.1",
    href: "https://admin.example.com/login",
    referrer: "https://admin.example.com/landing",
  } satisfies ICommunityPlatformPlatformadmin.ILogin;

  const platformAdminLoginAuthorized: ICommunityPlatformPlatformadmin.IAuthorized =
    await api.functional.auth.platformAdmin.login(connection, {
      body: platformAdminLoginBody,
    });
  typia.assert(platformAdminLoginAuthorized);

  // 4. Create a visibility level as platformAdmin
  const visibilityCode = `vis_${RandomGenerator.alphaNumeric(8)}`;
  const visibilityLevelCreateBody = {
    code: visibilityCode,
    name: `Visibility ${RandomGenerator.name(1)}`,
    description: RandomGenerator.paragraph({ sentences: 5 }),
  } satisfies ICommunityPlatformCommunityVisibilityLevel.ICreate;

  const visibilityLevel: ICommunityPlatformCommunityVisibilityLevel =
    await api.functional.communityPlatform.platformAdmin.communityVisibilityLevels.create(
      connection,
      {
        body: visibilityLevelCreateBody,
      },
    );
  typia.assert(visibilityLevel);

  // 5. Switch to memberUser via login for community & report creation
  const memberUserLoginBody = {
    identifier: memberUserJoinBody.email,
    password: memberUserJoinBody.password,
    ip: "127.0.0.1",
    href: "https://community.example.com/login",
    referrer: "https://community.example.com/home",
  } satisfies ICommunityPlatformMemberuser.ILoginRequest;

  const memberUserLoginAuthorized: ICommunityPlatformMemberuser.IAuthorized =
    await api.functional.auth.memberUser.login(connection, {
      body: memberUserLoginBody,
    });
  typia.assert(memberUserLoginAuthorized);

  // 6. Create a community as memberUser
  const communityCreateBody = {
    identifier: `community_${RandomGenerator.alphaNumeric(8)}`,
    title: RandomGenerator.paragraph({ sentences: 3 }),
    description: RandomGenerator.paragraph({ sentences: 8 }),
    visibilityLevelCode: visibilityLevel.code,
    isNsfw: false,
    // primaryTagIds omitted by leaving undefined
  } satisfies ICommunityPlatformCommunity.ICreate;

  const community: ICommunityPlatformCommunity =
    await api.functional.communityPlatform.memberUser.communities.create(
      connection,
      {
        body: communityCreateBody,
      },
    );
  typia.assert(community);

  const communityId = community.id;

  // 7. Create a report as memberUser, scoped to the community
  const reportCreateBody = {
    reporter_type: "member",
    report_reason_category_id: typia.random<string & tags.Format<"uuid">>(),
    community_id: communityId,
    severity: "medium",
    description: RandomGenerator.paragraph({ sentences: 10 }),
  } satisfies ICommunityPlatformReport.ICreate;

  const report: ICommunityPlatformReport =
    await api.functional.communityPlatform.memberUser.reports.create(
      connection,
      {
        body: reportCreateBody,
      },
    );
  typia.assert(report);

  const reportId = report.id;

  // 8. Switch back to platformAdmin before creating the sanction
  const platformAdminLoginAuthorizedAgain: ICommunityPlatformPlatformadmin.IAuthorized =
    await api.functional.auth.platformAdmin.login(connection, {
      body: platformAdminLoginBody,
    });
  typia.assert(platformAdminLoginAuthorizedAgain);

  // 9. Create a user sanction linked to report and community
  const now = new Date();
  const effectiveFrom = now.toISOString();
  const effectiveUntil = new Date(
    now.getTime() + 7 * 24 * 60 * 60 * 1000,
  ).toISOString();

  const sanctionType = "temporary_community_ban";
  const sanctionStatus = "active";

  const sanctionCreateBody = {
    community_platform_report_id: reportId,
    sanctioned_memberuser_id: sanctionedMemberUserId,
    community_id: communityId,
    sanction_type: sanctionType,
    status: sanctionStatus,
    effective_from: effectiveFrom,
    effective_until: effectiveUntil,
    reason_summary: "Violation reported in the community.",
    notes_internal: "Applied by automated test scenario.",
  } satisfies ICommunityPlatformUserSanction.ICreate;

  const createdSanction: ICommunityPlatformUserSanction =
    await api.functional.communityPlatform.platformAdmin.userSanctions.create(
      connection,
      {
        body: sanctionCreateBody,
      },
    );
  typia.assert(createdSanction);

  const createdSanctionId = createdSanction.id;

  // 10. Search sanctions using filters (status, community, sanctioned member)
  const searchRequestBody = {
    page: 1,
    limit: 20,
    sanction_type: null,
    status: sanctionStatus,
    community_id: communityId,
    sanctioned_memberuser_id: sanctionedMemberUserId,
    effective_from_from: null,
    effective_from_to: null,
    effective_until_from: null,
    effective_until_to: null,
    order_by: "created_at",
    order_direction: "desc",
  } satisfies ICommunityPlatformUserSanction.IRequest;

  const searchResult: IPageICommunityPlatformUserSanction.ISummary =
    await api.functional.communityPlatform.platformAdmin.userSanctions.index(
      connection,
      {
        body: searchRequestBody,
      },
    );
  typia.assert(searchResult);

  const sanctions = searchResult.data;

  const matched = sanctions.find((s) => s.id === createdSanctionId);

  TestValidator.predicate(
    "created sanction should appear in search results",
    matched !== undefined,
  );

  if (matched) {
    TestValidator.equals(
      "sanctionType should match created value",
      matched.sanctionType,
      sanctionType,
    );
    TestValidator.equals(
      "status should match created value",
      matched.status,
      sanctionStatus,
    );
    TestValidator.equals(
      "reportId should match originating report",
      matched.reportId,
      reportId,
    );
    if (matched.community) {
      TestValidator.equals(
        "community scope id should match community id",
        matched.community.id,
        communityId,
      );
    }
  }

  // 11. Negative search by different status to ensure filtering works
  const negativeSearchRequestBody = {
    page: 1,
    limit: 20,
    sanction_type: null,
    status: "expired",
    community_id: communityId,
    sanctioned_memberuser_id: sanctionedMemberUserId,
    effective_from_from: null,
    effective_from_to: null,
    effective_until_from: null,
    effective_until_to: null,
    order_by: "created_at",
    order_direction: "desc",
  } satisfies ICommunityPlatformUserSanction.IRequest;

  const negativeSearchResult: IPageICommunityPlatformUserSanction.ISummary =
    await api.functional.communityPlatform.platformAdmin.userSanctions.index(
      connection,
      {
        body: negativeSearchRequestBody,
      },
    );
  typia.assert(negativeSearchResult);

  const negativeMatched = negativeSearchResult.data.find(
    (s) => s.id === createdSanctionId,
  );

  TestValidator.predicate(
    "created sanction should not appear when filtering by different status",
    negativeMatched === undefined,
  );
}
