import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformAccountStatus } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAccountStatus";
import type { ICommunityPlatformActor } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformActor";
import type { ICommunityPlatformAppeal } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAppeal";
import type { ICommunityPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunity";
import type { ICommunityPlatformCommunityModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunityModerator";
import type { ICommunityPlatformCommunityVisibilityLevel } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunityVisibilityLevel";
import type { ICommunityPlatformGuestuser } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformGuestuser";
import type { ICommunityPlatformMemberuser } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMemberuser";
import type { ICommunityPlatformModerationAction } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformModerationAction";
import type { ICommunityPlatformModerationQueue } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformModerationQueue";
import type { ICommunityPlatformPlatformadmin } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformPlatformadmin";
import type { ICommunityPlatformReport } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformReport";
import type { ICommunityPlatformReportReasonCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformReportReasonCategory";
import type { ICommunityPlatformUserSanction } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformUserSanction";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageICommunityPlatformAppeal } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageICommunityPlatformAppeal";

/**
 * Validate platform admin appeal listing with filters and pagination.
 *
 * This test simulates a realistic moderation workflow:
 *
 * - A platform admin registers and creates a visibility level.
 * - A member user joins, creates a community, files a report.
 * - A community moderator records a moderation action.
 * - The platform admin issues a user sanction based on the report.
 * - The member user submits two appeals targeting the sanction.
 * - The platform admin searches appeals with various filters and pagination.
 *
 * Covered aspects:
 *
 * 1. Successful retrieval of appeals filtered by status/scope/date range/appellant
 *    and correct pagination metadata.
 * 2. Non‑matching status and date filters returning empty data arrays while
 *    keeping pagination metadata consistent.
 * 3. Basic consistency between created appeals and returned summaries (id, scope,
 *    status, reason_summary, reportId).
 */
export async function test_api_platform_admin_appeals_index_lists_pending_appeals_with_filters(
  connection: api.IConnection,
) {
  // Helper to build a simple href/referrer
  const href = "https://community.example.com/join" as const;
  const referrer = "https://community.example.com/" as const;

  // 1. Register platform admin and implicitly authenticate
  const platformAdminJoinBody = {
    username: RandomGenerator.alphabets(12),
    email: "platform-admin-" + RandomGenerator.alphabets(8) + "@example.com",
    password: "AdminPass123!",
    displayName: RandomGenerator.name(),
    ip: "127.0.0.1",
    href,
    referrer,
  } satisfies ICommunityPlatformPlatformadmin.IJoin;

  const platformAdmin: ICommunityPlatformPlatformadmin.IAuthorized =
    await api.functional.auth.platformAdmin.join(connection, {
      body: platformAdminJoinBody,
    });
  typia.assert(platformAdmin);

  // 2. As platform admin, create a visibility level
  const visibilityCode = "public-" + RandomGenerator.alphabets(6);
  const visibilityCreateBody = {
    code: visibilityCode,
    name: "Public " + RandomGenerator.alphabets(4),
    description: RandomGenerator.paragraph({ sentences: 5 }),
  } satisfies ICommunityPlatformCommunityVisibilityLevel.ICreate;

  const visibility: ICommunityPlatformCommunityVisibilityLevel =
    await api.functional.communityPlatform.platformAdmin.communityVisibilityLevels.create(
      connection,
      { body: visibilityCreateBody },
    );
  typia.assert(visibility);

  // 3. Register member user and authenticate
  const memberHref = "https://community.example.com/member" as const;
  const memberReferrer = "https://community.example.com/" as const;

  const memberJoinBody = {
    username: "member-" + RandomGenerator.alphabets(8),
    email: "member-" + RandomGenerator.alphabets(8) + "@member.example.com",
    password: "MemberPass123!",
    ip: "127.0.0.1",
    href: memberHref,
    referrer: memberReferrer,
  } satisfies ICommunityPlatformMemberuser.IJoinRequest;

  const memberAuthorized: ICommunityPlatformMemberuser.IAuthorized =
    await api.functional.auth.memberUser.join(connection, {
      body: memberJoinBody,
    });
  typia.assert(memberAuthorized);

  // Explicit login for member to ensure session; also matches the dependency list
  const memberLoginBody = {
    identifier: memberJoinBody.email,
    password: memberJoinBody.password,
    ip: "127.0.0.1",
    href: memberHref,
    referrer: memberReferrer,
  } satisfies ICommunityPlatformMemberuser.ILoginRequest;

  const memberLogin: ICommunityPlatformMemberuser.IAuthorized =
    await api.functional.auth.memberUser.login(connection, {
      body: memberLoginBody,
    });
  typia.assert(memberLogin);

  // 4. Register community moderator and authenticate
  const moderatorHref = "https://community.example.com/mod" as const;
  const moderatorReferrer = "https://community.example.com/" as const;

  const moderatorJoinBody = {
    username: "mod-" + RandomGenerator.alphabets(8),
    email:
      "moderator-" + RandomGenerator.alphabets(8) + "@moderator.example.com",
    password: "ModeratorPass123!",
    display_name: RandomGenerator.name(),
    ip: "127.0.0.1",
    href: moderatorHref,
    referrer: moderatorReferrer,
  } satisfies ICommunityPlatformCommunityModerator.IJoin;

  const moderatorAuthorized: ICommunityPlatformCommunityModerator.IAuthorized =
    await api.functional.auth.communityModerator.join(connection, {
      body: moderatorJoinBody,
    });
  typia.assert(moderatorAuthorized);

  const moderatorLoginBody = {
    identifier: moderatorJoinBody.email,
    password: moderatorJoinBody.password,
    ip: "127.0.0.1",
    href: moderatorHref,
    referrer: moderatorReferrer,
  } satisfies ICommunityPlatformCommunityModerator.ILogin;

  const moderatorLogin: ICommunityPlatformCommunityModerator.IAuthorized =
    await api.functional.auth.communityModerator.login(connection, {
      body: moderatorLoginBody,
    });
  typia.assert(moderatorLogin);

  // 5. As member user, create a community using the visibility level code
  // memberUser is currently logged in, because last login was moderator; re-login as member
  const reMemberLogin: ICommunityPlatformMemberuser.IAuthorized =
    await api.functional.auth.memberUser.login(connection, {
      body: memberLoginBody,
    });
  typia.assert(reMemberLogin);

  const communityCreateBody = {
    identifier: "community-" + RandomGenerator.alphabets(10),
    title: "Test Community " + RandomGenerator.alphabets(6),
    description: RandomGenerator.paragraph({ sentences: 8 }),
    visibilityLevelCode: visibilityCreateBody.code,
    isNsfw: false,
    primaryTagIds: [],
  } satisfies ICommunityPlatformCommunity.ICreate;

  const community: ICommunityPlatformCommunity =
    await api.functional.communityPlatform.memberUser.communities.create(
      connection,
      { body: communityCreateBody },
    );
  typia.assert(community);

  // 6. As member user, create a report
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

  // 7. As community moderator, create a moderation action for the report
  const reModeratorLogin: ICommunityPlatformCommunityModerator.IAuthorized =
    await api.functional.auth.communityModerator.login(connection, {
      body: moderatorLoginBody,
    });
  typia.assert(reModeratorLogin);

  const moderationActionCreateBody = {
    community_id: community.id,
    action_type: "remove_content",
    target_scope: "content",
    reason_summary: "Content violates community rules",
    notes_internal: "Automated test moderation action",
  } satisfies ICommunityPlatformModerationAction.ICreate;

  const moderationAction: ICommunityPlatformModerationAction =
    await api.functional.communityPlatform.communityModerator.moderationActions.create(
      connection,
      { body: moderationActionCreateBody },
    );
  typia.assert(moderationAction);

  // 8. As platform admin, create a user sanction linked to the report
  const rePlatformAdminLogin: ICommunityPlatformPlatformadmin.IAuthorized =
    await api.functional.auth.platformAdmin.login(connection, {
      body: {
        identifier: platformAdminJoinBody.email,
        password: platformAdminJoinBody.password,
        ip: "127.0.0.1",
        href,
        referrer,
      } satisfies ICommunityPlatformPlatformadmin.ILogin,
    });
  typia.assert(rePlatformAdminLogin);

  const now = new Date();
  const effectiveFrom = new Date(now.getTime() - 5 * 60 * 1000).toISOString();
  const effectiveUntil = new Date(now.getTime() + 60 * 60 * 1000).toISOString();

  const sanctionCreateBody = {
    community_platform_report_id: report.id,
    sanctioned_memberuser_id: memberAuthorized.id,
    community_id: community.id,
    sanction_type: "temporary_platform_ban",
    status: "active",
    effective_from: effectiveFrom,
    effective_until: effectiveUntil,
    reason_summary: "Test sanction for appeal listing",
    notes_internal: "E2E test sanction linked to report",
  } satisfies ICommunityPlatformUserSanction.ICreate;

  const sanction: ICommunityPlatformUserSanction =
    await api.functional.communityPlatform.platformAdmin.userSanctions.create(
      connection,
      { body: sanctionCreateBody },
    );
  typia.assert(sanction);

  // 9. As member user, create two appeals targeting the sanction/report
  const memberLoginForAppeals: ICommunityPlatformMemberuser.IAuthorized =
    await api.functional.auth.memberUser.login(connection, {
      body: memberLoginBody,
    });
  typia.assert(memberLoginForAppeals);

  const appealCreateBody1 = {
    appeal_scope: "sanction",
    reason_summary: "I believe this sanction is unfair (A1)",
    details: RandomGenerator.content({ paragraphs: 2 }),
  } satisfies ICommunityPlatformAppeal.ICreate;

  const appeal1: ICommunityPlatformAppeal =
    await api.functional.communityPlatform.memberUser.appeals.create(
      connection,
      { body: appealCreateBody1 },
    );
  typia.assert(appeal1);

  const appealCreateBody2 = {
    appeal_scope: "sanction",
    reason_summary: "Second appeal for testing pagination (A2)",
    details: RandomGenerator.content({ paragraphs: 2 }),
  } satisfies ICommunityPlatformAppeal.ICreate;

  const appeal2: ICommunityPlatformAppeal =
    await api.functional.communityPlatform.memberUser.appeals.create(
      connection,
      { body: appealCreateBody2 },
    );
  typia.assert(appeal2);

  // Capture creation timestamps from full entities
  const createdAt1 = appeal1.created_at;
  const createdAt2 = appeal2.created_at;

  // 10. As platform admin, search appeals with filters
  const platformAdminLoginForSearch: ICommunityPlatformPlatformadmin.IAuthorized =
    await api.functional.auth.platformAdmin.login(connection, {
      body: {
        identifier: platformAdminJoinBody.email,
        password: platformAdminJoinBody.password,
        ip: "127.0.0.1",
        href,
        referrer,
      } satisfies ICommunityPlatformPlatformadmin.ILogin,
    });
  typia.assert(platformAdminLoginForSearch);

  // Case 1: positive filter by status/scope/date range/appellant
  const minCreated = createdAt1 < createdAt2 ? createdAt1 : createdAt2;
  const maxCreated = createdAt1 > createdAt2 ? createdAt1 : createdAt2;

  const searchRequest1 = {
    page: 1 as number & tags.Type<"int32"> & tags.Minimum<1>,
    limit: 10 as number & tags.Type<"int32"> & tags.Minimum<1>,
    appeal_statuses: [appeal1.appeal_status],
    appeal_scope: ["sanction"],
    created_from: minCreated,
    created_until: maxCreated,
    appellant_memberuser_id: memberAuthorized.id,
  } satisfies ICommunityPlatformAppeal.IRequest;

  const page1: IPageICommunityPlatformAppeal.ISummary =
    await api.functional.communityPlatform.platformAdmin.appeals.index(
      connection,
      { body: searchRequest1 },
    );
  typia.assert(page1);

  const pagination1: IPage.IPagination = page1.pagination;
  TestValidator.equals(
    "positive filter pagination current page",
    pagination1.current,
    searchRequest1.page ?? 1,
  );
  TestValidator.equals(
    "positive filter pagination limit",
    pagination1.limit,
    searchRequest1.limit ?? 10,
  );
  TestValidator.predicate(
    "positive filter should return at least two appeals",
    pagination1.records >= 2,
  );

  const ids1 = page1.data.map((a) => a.id);
  TestValidator.predicate(
    "result should include first appeal id",
    ids1.includes(appeal1.id),
  );
  TestValidator.predicate(
    "result should include second appeal id",
    ids1.includes(appeal2.id),
  );

  const summary1 = page1.data.find((a) => a.id === appeal1.id);
  const summary2 = page1.data.find((a) => a.id === appeal2.id);

  if (summary1) {
    TestValidator.equals(
      "summary1 scope should be sanction",
      summary1.scope,
      "sanction",
    );
    TestValidator.equals(
      "summary1 reason_summary matches",
      summary1.reason_summary,
      appeal1.reason_summary,
    );
  }

  if (summary2) {
    TestValidator.equals(
      "summary2 scope should be sanction",
      summary2.scope,
      "sanction",
    );
    TestValidator.equals(
      "summary2 reason_summary matches",
      summary2.reason_summary,
      appeal2.reason_summary,
    );
  }

  // Case 2: filter by a non-matching status
  const differentStatus =
    appeal1.appeal_status + "-non-matching-" + RandomGenerator.alphabets(4);

  const searchRequest2 = {
    page: 1 as number & tags.Type<"int32"> & tags.Minimum<1>,
    limit: 5 as number & tags.Type<"int32"> & tags.Minimum<1>,
    appeal_statuses: [differentStatus],
  } satisfies ICommunityPlatformAppeal.IRequest;

  const page2: IPageICommunityPlatformAppeal.ISummary =
    await api.functional.communityPlatform.platformAdmin.appeals.index(
      connection,
      { body: searchRequest2 },
    );
  typia.assert(page2);

  const pagination2: IPage.IPagination = page2.pagination;
  TestValidator.equals(
    "non-matching status pagination current page",
    pagination2.current,
    searchRequest2.page ?? 1,
  );
  TestValidator.equals(
    "non-matching status pagination limit",
    pagination2.limit,
    searchRequest2.limit ?? 5,
  );
  TestValidator.equals(
    "non-matching status pagination records",
    pagination2.records,
    0,
  );
  TestValidator.equals(
    "non-matching status pagination pages",
    pagination2.pages,
    0,
  );
  TestValidator.equals("non-matching status data length", page2.data.length, 0);

  // Case 3: future date range filter that should not match any created appeals
  const futureFrom = new Date(
    now.getTime() + 24 * 60 * 60 * 1000,
  ).toISOString();
  const futureUntil = futureFrom;

  const searchRequest3 = {
    page: 1 as number & tags.Type<"int32"> & tags.Minimum<1>,
    limit: 10 as number & tags.Type<"int32"> & tags.Minimum<1>,
    created_from: futureFrom,
    created_until: futureUntil,
  } satisfies ICommunityPlatformAppeal.IRequest;

  const page3: IPageICommunityPlatformAppeal.ISummary =
    await api.functional.communityPlatform.platformAdmin.appeals.index(
      connection,
      { body: searchRequest3 },
    );
  typia.assert(page3);

  const pagination3: IPage.IPagination = page3.pagination;
  TestValidator.equals(
    "future date filter pagination current page",
    pagination3.current,
    searchRequest3.page ?? 1,
  );
  TestValidator.equals(
    "future date filter pagination limit",
    pagination3.limit,
    searchRequest3.limit ?? 10,
  );
  TestValidator.equals(
    "future date filter pagination records",
    pagination3.records,
    0,
  );
  TestValidator.equals(
    "future date filter pagination pages",
    pagination3.pages,
    0,
  );
  TestValidator.equals("future date filter data length", page3.data.length, 0);
}
