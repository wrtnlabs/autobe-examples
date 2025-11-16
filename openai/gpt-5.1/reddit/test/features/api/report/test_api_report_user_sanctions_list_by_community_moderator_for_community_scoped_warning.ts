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
 * List community-scoped warning user sanctions for a report as a community
 * moderator.
 *
 * Business goal: Verify that a community moderator can search and list user
 * sanctions that are:
 *
 * - Linked to a specific report,
 * - Scoped to a particular community,
 * - Of type "warning", and that the listing respects filter criteria on
 *   sanction_type, status, community_id, and effective period.
 *
 * Scenario outline:
 *
 * 1. A member user joins and becomes the reporter and future sanctioned user.
 * 2. The member creates a moderation report.
 * 3. A platformAdmin creates a community visibility level master.
 * 4. The member creates a community referencing that visibility level.
 * 5. The member subscribes to the community.
 * 6. A communityModerator joins and logs in.
 * 7. The moderator creates a community-scoped warning sanction for the member
 *    user, linked to the report and community, with an active effective window
 *    covering "now".
 * 8. The moderator lists sanctions for the report using filters matching
 *    sanction_type, status, community_id, and an effective window that includes
 *    the sanction.
 * 9. The response is validated for pagination metadata and that the single
 *    returned item matches the created sanction and links back to the correct
 *    report and community.
 * 10. A second search uses an effective window that excludes the sanction, and
 *     returns an empty page.
 */
export async function test_api_report_user_sanctions_list_by_community_moderator_for_community_scoped_warning(
  connection: api.IConnection,
) {
  // 1. Member user joins
  const memberJoinBody = {
    username: RandomGenerator.name(1),
    email: typia.random<string & tags.Format<"email">>(),
    password: "password-1234",
    ip: null,
    href: "https://member.example.com/join",
    referrer: "https://member.example.com/landing",
  } satisfies ICommunityPlatformMemberuser.IJoinRequest;

  const memberAuthorized: ICommunityPlatformMemberuser.IAuthorized =
    await api.functional.auth.memberUser.join(connection, {
      body: memberJoinBody,
    });
  typia.assert(memberAuthorized);

  // Keep core member info
  const memberId: string & tags.Format<"uuid"> = memberAuthorized.id;

  // 2. Member creates a report
  const reportBody = {
    reporter_type: "member",
    report_reason_category_id: typia.random<string & tags.Format<"uuid">>(),
    community_id: null,
    severity: null,
    description: RandomGenerator.paragraph({ sentences: 5 }),
  } satisfies ICommunityPlatformReport.ICreate;

  const report: ICommunityPlatformReport =
    await api.functional.communityPlatform.memberUser.reports.create(
      connection,
      {
        body: reportBody,
      },
    );
  typia.assert(report);

  const reportId: string & tags.Format<"uuid"> = report.id;

  // 3. PlatformAdmin joins and creates a visibility level
  const platformAdminJoinBody = {
    username: RandomGenerator.name(1),
    email: typia.random<string & tags.Format<"email">>(),
    password: "password-1234",
    displayName: RandomGenerator.name(2),
    ip: "203.0.113.10",
    href: "https://admin.example.com/join",
    referrer: "https://admin.example.com/landing",
  } satisfies ICommunityPlatformPlatformadmin.IJoin;

  const platformAdminAuth: ICommunityPlatformPlatformadmin.IAuthorized =
    await api.functional.auth.platformAdmin.join(connection, {
      body: platformAdminJoinBody,
    });
  typia.assert(platformAdminAuth);

  const visibilityCode = RandomGenerator.alphabets(8);

  const visibilityCreateBody = {
    code: visibilityCode,
    name: "Public Visibility",
    description: RandomGenerator.paragraph({ sentences: 3 }),
  } satisfies ICommunityPlatformCommunityVisibilityLevel.ICreate;

  const visibilityLevel: ICommunityPlatformCommunityVisibilityLevel =
    await api.functional.communityPlatform.platformAdmin.communityVisibilityLevels.create(
      connection,
      {
        body: visibilityCreateBody,
      },
    );
  typia.assert(visibilityLevel);

  // 4. Switch back to member user via login
  const memberLoginBody = {
    identifier: memberJoinBody.email,
    password: memberJoinBody.password,
    ip: "198.51.100.5",
    href: "https://member.example.com/login",
    referrer: "https://member.example.com/home",
  } satisfies ICommunityPlatformMemberuser.ILoginRequest;

  const memberLoginAuth: ICommunityPlatformMemberuser.IAuthorized =
    await api.functional.auth.memberUser.login(connection, {
      body: memberLoginBody,
    });
  typia.assert(memberLoginAuth);

  // 5. Member creates a community referencing the visibility level code
  const communityCreateBody = {
    identifier: RandomGenerator.alphabets(10),
    title: RandomGenerator.paragraph({ sentences: 2 }),
    description: RandomGenerator.paragraph({ sentences: 6 }),
    visibilityLevelCode: visibilityLevel.code,
    isNsfw: false,
    primaryTagIds: [],
  } satisfies ICommunityPlatformCommunity.ICreate;

  const community: ICommunityPlatformCommunity =
    await api.functional.communityPlatform.memberUser.communities.create(
      connection,
      {
        body: communityCreateBody,
      },
    );
  typia.assert(community);

  const communityId: string & tags.Format<"uuid"> = community.id;

  // 6. Member subscribes to the community
  const subscriptionCreateBody = {
    community_id: communityId,
    status: "active",
  } satisfies ICommunityPlatformCommunitySubscription.ICreate;

  const subscription: ICommunityPlatformCommunitySubscription =
    await api.functional.communityPlatform.memberUser.communities.subscriptions.create(
      connection,
      {
        communityId,
        body: subscriptionCreateBody,
      },
    );
  typia.assert(subscription);

  TestValidator.equals(
    "subscription community id matches",
    subscription.community_id,
    communityId,
  );

  // 7. CommunityModerator joins and logs in
  const moderatorJoinBody = {
    username: RandomGenerator.name(1),
    email: typia.random<string & tags.Format<"email">>(),
    password: "password-1234",
    display_name: RandomGenerator.name(2),
    ip: "192.0.2.10",
    href: "https://moderator.example.com/join",
    referrer: "https://moderator.example.com/landing",
  } satisfies ICommunityPlatformCommunityModerator.IJoin;

  const moderatorAuth: ICommunityPlatformCommunityModerator.IAuthorized =
    await api.functional.auth.communityModerator.join(connection, {
      body: moderatorJoinBody,
    });
  typia.assert(moderatorAuth);

  const moderatorLoginBody = {
    identifier: moderatorJoinBody.email,
    password: moderatorJoinBody.password,
    ip: "192.0.2.20",
    href: "https://moderator.example.com/login",
    referrer: "https://moderator.example.com/dashboard",
  } satisfies ICommunityPlatformCommunityModerator.ILogin;

  const moderatorLoginAuth: ICommunityPlatformCommunityModerator.IAuthorized =
    await api.functional.auth.communityModerator.login(connection, {
      body: moderatorLoginBody,
    });
  typia.assert(moderatorLoginAuth);

  // 8. Moderator creates a community-scoped warning sanction for the member user
  const now = new Date();
  const effectiveFrom = new Date(now.getTime() - 5 * 60 * 1000); // 5 minutes ago
  const effectiveUntil = new Date(now.getTime() + 55 * 60 * 1000); // 55 minutes later

  const sanctionCreateBody = {
    community_platform_report_id: reportId,
    sanctioned_memberuser_id: memberId,
    community_id: communityId,
    sanction_type: "warning",
    status: "active",
    effective_from: effectiveFrom.toISOString(),
    effective_until: effectiveUntil.toISOString(),
    reason_summary: RandomGenerator.paragraph({ sentences: 3 }),
    notes_internal: RandomGenerator.paragraph({ sentences: 4 }),
  } satisfies ICommunityPlatformUserSanction.ICreate;

  const createdSanction: ICommunityPlatformUserSanction =
    await api.functional.communityPlatform.communityModerator.reports.userSanctions.create(
      connection,
      {
        reportId,
        body: sanctionCreateBody,
      },
    );
  typia.assert(createdSanction);

  TestValidator.equals(
    "created sanction type is warning",
    createdSanction.sanction_type,
    "warning",
  );
  TestValidator.equals(
    "created sanction status is active",
    createdSanction.status,
    "active",
  );

  // 9. Moderator lists sanctions for the report with filters including the created sanction
  const windowStart = new Date(effectiveFrom.getTime() - 60 * 1000);
  const windowEnd = new Date(effectiveUntil.getTime() + 60 * 1000);

  const searchRequest = {
    page: 1 as number & tags.Type<"int32">,
    limit: 10 as number & tags.Type<"int32">,
    sanction_type: "warning",
    status: "active",
    community_id: communityId,
    sanctioned_memberuser_id: memberId,
    effective_from_from: windowStart.toISOString(),
    effective_from_to: windowEnd.toISOString(),
    effective_until_from: null,
    effective_until_to: null,
    order_by: "created_at",
    order_direction: "desc",
  } satisfies ICommunityPlatformUserSanction.IRequest;

  const page: IPageICommunityPlatformUserSanction.ISummary =
    await api.functional.communityPlatform.communityModerator.reports.userSanctions.index(
      connection,
      {
        reportId,
        body: searchRequest,
      },
    );
  typia.assert(page);

  const pagination = page.pagination;
  TestValidator.equals("pagination.records is 1", pagination.records, 1);
  TestValidator.equals("pagination.pages is 1", pagination.pages, 1);
  TestValidator.equals("pagination.current is 1", pagination.current, 1);
  TestValidator.equals("pagination.limit is 10", pagination.limit, 10);
  TestValidator.equals("data length is 1", page.data.length, 1);

  const summary: ICommunityPlatformUserSanction.ISummary = page.data[0];
  typia.assert(summary);

  TestValidator.equals(
    "summary sanctionType is warning",
    summary.sanctionType,
    "warning",
  );
  TestValidator.equals("summary status is active", summary.status, "active");
  TestValidator.equals(
    "summary reportId matches report.id",
    summary.reportId,
    reportId,
  );

  if (summary.community !== undefined) {
    TestValidator.equals(
      "summary community id matches community.id",
      summary.community.id,
      communityId,
    );
  }

  // 10. Search with a time window that excludes the sanction
  const futureStart = new Date(effectiveUntil.getTime() + 24 * 60 * 60 * 1000);
  const futureEnd = new Date(futureStart.getTime() + 60 * 60 * 1000);

  const excludingSearchRequest = {
    page: 1 as number & tags.Type<"int32">,
    limit: 10 as number & tags.Type<"int32">,
    sanction_type: "warning",
    status: "active",
    community_id: communityId,
    sanctioned_memberuser_id: memberId,
    effective_from_from: futureStart.toISOString(),
    effective_from_to: futureEnd.toISOString(),
    effective_until_from: futureStart.toISOString(),
    effective_until_to: futureEnd.toISOString(),
    order_by: "created_at",
    order_direction: "desc",
  } satisfies ICommunityPlatformUserSanction.IRequest;

  const excludingPage: IPageICommunityPlatformUserSanction.ISummary =
    await api.functional.communityPlatform.communityModerator.reports.userSanctions.index(
      connection,
      {
        reportId,
        body: excludingSearchRequest,
      },
    );
  typia.assert(excludingPage);

  TestValidator.equals(
    "excluding search records is 0",
    excludingPage.pagination.records,
    0,
  );
  TestValidator.equals(
    "excluding search data length is 0",
    excludingPage.data.length,
    0,
  );
}
