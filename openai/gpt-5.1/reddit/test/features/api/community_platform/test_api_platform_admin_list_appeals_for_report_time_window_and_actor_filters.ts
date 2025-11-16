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
 * Validate platform admin report-scoped appeals listing with time-window and
 * actor filters.
 *
 * Business goals:
 *
 * - Ensure PATCH /communityPlatform/platformAdmin/reports/{reportId}/appeals
 *   correctly filters by appeal creation time and appellant/platform admin
 *   actors for a single report.
 * - Confirm pagination metadata is consistent with the filtered result set.
 * - Validate that invalid time windows (created_until earlier than created_from)
 *   surface as errors rather than silently returning an empty success.
 *
 * Steps:
 *
 * 1. Register a platform admin (Admin A) via /auth/platformAdmin/join and keep its
 *    id/credentials.
 * 2. Register a member user (Member M) via /auth/memberUser/join and keep its
 *    id/credentials.
 * 3. As Member M, create a report via /communityPlatform/memberUser/reports and
 *    capture report.id.
 * 4. As Member M, create two appeals for that report via
 *    /communityPlatform/memberUser/reports/{reportId}/appeals:
 *
 *    - Appeal A1 created first.
 *    - Appeal A2 created second.
 * 5. As platform admin (Admin A), list appeals for the report with a narrow time
 *    window (created_from = created_until = later appeal's created_at) and
 *    appellant_memberuser_id filter so only the later appeal should match.
 *    Assert pagination.records === 1 and only that appeal is returned.
 * 6. As platform admin, update the first appeal via PUT
 *    /communityPlatform/platformAdmin/reports/{reportId}/appeals/{appealId} to
 *    set a new appeal_status and outcome_summary (simulating handling by
 *    platform admin).
 * 7. As platform admin, list appeals for the report filtering by platformadmin_id
 *    = Admin A.id and assert that at least the updated appeal appears in the
 *    result set.
 * 8. As platform admin, call listing with an invalid time window (created_from
 *    later than created_until) and assert that the call throws an error.
 * 9. As platform admin, list appeals for the report with a broad window and no
 *    actor filters and assert that both appeals appear in the result set.
 */
export async function test_api_platform_admin_list_appeals_for_report_time_window_and_actor_filters(
  connection: api.IConnection,
) {
  // 1. Register a platform admin (Admin A) via join
  const adminJoinBody = {
    username: RandomGenerator.alphabets(12),
    email: `${RandomGenerator.alphabets(8)}@example.com`,
    password: RandomGenerator.alphabets(16),
    displayName: RandomGenerator.name(),
    ip: undefined,
    href: "https://admin.example.com/join",
    referrer: "https://admin.example.com/landing",
  } satisfies ICommunityPlatformPlatformadmin.IJoin;

  const adminAuthorized: ICommunityPlatformPlatformadmin.IAuthorized =
    await api.functional.auth.platformAdmin.join(connection, {
      body: adminJoinBody,
    });
  typia.assert(adminAuthorized);

  const adminId: string & tags.Format<"uuid"> = adminAuthorized.id;
  const adminIdentifier = adminAuthorized.email;
  const adminPassword = adminJoinBody.password;

  // 2. Register a member user (Member M) via join
  const memberJoinBody = {
    username: RandomGenerator.alphabets(10),
    email: `${RandomGenerator.alphabets(8)}@member.test`,
    password: RandomGenerator.alphabets(16),
    ip: null,
    href: "https://community.example.com/join",
    referrer: "https://community.example.com/home",
  } satisfies ICommunityPlatformMemberuser.IJoinRequest;

  const memberAuthorized: ICommunityPlatformMemberuser.IAuthorized =
    await api.functional.auth.memberUser.join(connection, {
      body: memberJoinBody,
    });
  typia.assert(memberAuthorized);
  const memberId: string & tags.Format<"uuid"> = memberAuthorized.id;

  // 3. As Member M, create a report
  const reportCreateBody = {
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
        body: reportCreateBody,
      },
    );
  typia.assert(report);
  const reportId: string & tags.Format<"uuid"> = report.id;

  // 4. As Member M, create two appeals for that report
  const appealCreateBody1 = {
    appeal_scope: "content",
    reason_summary: RandomGenerator.paragraph({ sentences: 2 }),
    details: RandomGenerator.paragraph({ sentences: 8 }),
  } satisfies ICommunityPlatformAppeal.ICreate;

  const appeal1: ICommunityPlatformAppeal =
    await api.functional.communityPlatform.memberUser.reports.appeals.create(
      connection,
      {
        reportId,
        body: appealCreateBody1,
      },
    );
  typia.assert(appeal1);

  const appealCreateBody2 = {
    appeal_scope: "content",
    reason_summary: RandomGenerator.paragraph({ sentences: 2 }),
    details: RandomGenerator.paragraph({ sentences: 8 }),
  } satisfies ICommunityPlatformAppeal.ICreate;

  const appeal2: ICommunityPlatformAppeal =
    await api.functional.communityPlatform.memberUser.reports.appeals.create(
      connection,
      {
        reportId,
        body: appealCreateBody2,
      },
    );
  typia.assert(appeal2);

  const appeal1Id: string & tags.Format<"uuid"> = appeal1.id;
  const appeal2Id: string & tags.Format<"uuid"> = appeal2.id;

  const created1 = appeal1.created_at;
  const created2 = appeal2.created_at;

  const laterCreatedAt = created1 >= created2 ? created1 : created2;
  const laterAppealId = created1 >= created2 ? appeal1Id : appeal2Id;

  // 5. Switch to platform admin by logging in using login endpoint
  const adminLoginBody = {
    identifier: adminIdentifier,
    password: adminPassword,
    ip: null,
    href: "https://admin.example.com/login",
    referrer: "https://admin.example.com/landing",
  } satisfies ICommunityPlatformPlatformadmin.ILogin;

  const adminLoginResult: ICommunityPlatformPlatformadmin.IAuthorized =
    await api.functional.auth.platformAdmin.login(connection, {
      body: adminLoginBody,
    });
  typia.assert(adminLoginResult);

  // 6. Narrow time-window listing for the later appeal and appellant filter
  const narrowRequestBody = {
    page: 1 as number & tags.Type<"int32"> & tags.Minimum<1>,
    limit: 10 as number & tags.Type<"int32"> & tags.Minimum<1>,
    appeal_statuses: undefined,
    appeal_scope: undefined,
    created_from: laterCreatedAt,
    created_until: laterCreatedAt,
    appellant_memberuser_id: memberId,
    communitymoderator_id: null,
    platformadmin_id: null,
    sort_key: "created_at",
    sort_direction: "desc",
  } satisfies ICommunityPlatformAppeal.IRequest;

  const narrowPage: IPageICommunityPlatformAppeal.ISummary =
    await api.functional.communityPlatform.platformAdmin.reports.appeals.index(
      connection,
      {
        reportId,
        body: narrowRequestBody,
      },
    );
  typia.assert(narrowPage);

  const narrowData = narrowPage.data;
  const narrowPagination = narrowPage.pagination;

  TestValidator.equals(
    "narrow time window records match data length",
    narrowPagination.records,
    narrowData.length,
  );

  TestValidator.equals(
    "narrow time window should return one appeal",
    1,
    narrowData.length,
  );

  const narrowAppeal = narrowData[0];

  TestValidator.equals(
    "narrow listing returns expected appeal id",
    narrowAppeal.id,
    laterAppealId,
  );

  if (narrowAppeal.appellant !== undefined) {
    TestValidator.equals(
      "narrow listing appellant matches member user",
      narrowAppeal.appellant.id,
      memberId,
    );
  }

  if (narrowAppeal.reportId !== undefined) {
    TestValidator.equals(
      "narrow listing reportId matches report",
      narrowAppeal.reportId,
      reportId,
    );
  }

  // 7. Update the first appeal (appeal1) as handled by platform admin
  const updateBodyForAppeal1 = {
    appeal_status: "accepted",
    appeal_scope: undefined,
    reason_summary: null,
    details: null,
    outcome_summary: "handled by platform admin",
    resolved_at: new Date().toISOString(),
  } satisfies ICommunityPlatformAppeal.IUpdate;

  const updatedAppeal1: ICommunityPlatformAppeal =
    await api.functional.communityPlatform.platformAdmin.reports.appeals.update(
      connection,
      {
        reportId,
        appealId: appeal1Id,
        body: updateBodyForAppeal1,
      },
    );
  typia.assert(updatedAppeal1);

  // 8. List appeals filtered by platformadmin_id = Admin A
  const platformAdminFilterBody = {
    page: 1 as number & tags.Type<"int32"> & tags.Minimum<1>,
    limit: 10 as number & tags.Type<"int32"> & tags.Minimum<1>,
    appeal_statuses: undefined,
    appeal_scope: undefined,
    created_from: null,
    created_until: null,
    appellant_memberuser_id: null,
    communitymoderator_id: null,
    platformadmin_id: adminId,
    sort_key: "created_at",
    sort_direction: "desc",
  } satisfies ICommunityPlatformAppeal.IRequest;

  const byAdminPage: IPageICommunityPlatformAppeal.ISummary =
    await api.functional.communityPlatform.platformAdmin.reports.appeals.index(
      connection,
      {
        reportId,
        body: platformAdminFilterBody,
      },
    );
  typia.assert(byAdminPage);

  const byAdminData = byAdminPage.data;

  TestValidator.predicate(
    "platformadmin_id filter should return at least one appeal",
    byAdminData.length > 0,
  );

  const hasAppeal1ForAdmin = byAdminData.some((a) => a.id === appeal1Id);
  TestValidator.predicate(
    "platformadmin_id filter includes updated appeal1",
    hasAppeal1ForAdmin,
  );

  // 9. Invalid time window (created_from later than created_until) should error
  const invalidWindowBody = {
    page: 1 as number & tags.Type<"int32"> & tags.Minimum<1>,
    limit: 10 as number & tags.Type<"int32"> & tags.Minimum<1>,
    appeal_statuses: undefined,
    appeal_scope: undefined,
    created_from: created2,
    created_until: created1,
    appellant_memberuser_id: memberId,
    communitymoderator_id: null,
    platformadmin_id: null,
    sort_key: "created_at",
    sort_direction: "desc",
  } satisfies ICommunityPlatformAppeal.IRequest;

  await TestValidator.error("invalid time window should fail", async () => {
    await api.functional.communityPlatform.platformAdmin.reports.appeals.index(
      connection,
      {
        reportId,
        body: invalidWindowBody,
      },
    );
  });

  // 10. Broad listing with no actor filters should include both appeals
  const broadBody = {
    page: 1 as number & tags.Type<"int32"> & tags.Minimum<1>,
    limit: 10 as number & tags.Type<"int32"> & tags.Minimum<1>,
    appeal_statuses: undefined,
    appeal_scope: undefined,
    created_from: null,
    created_until: null,
    appellant_memberuser_id: null,
    communitymoderator_id: null,
    platformadmin_id: null,
    sort_key: "created_at",
    sort_direction: "desc",
  } satisfies ICommunityPlatformAppeal.IRequest;

  const broadPage: IPageICommunityPlatformAppeal.ISummary =
    await api.functional.communityPlatform.platformAdmin.reports.appeals.index(
      connection,
      {
        reportId,
        body: broadBody,
      },
    );
  typia.assert(broadPage);

  const broadData = broadPage.data;
  const appealIds = broadData.map((a) => a.id);

  const hasAppeal1 = appealIds.includes(appeal1Id);
  const hasAppeal2 = appealIds.includes(appeal2Id);

  TestValidator.predicate("broad listing includes appeal1", hasAppeal1);

  TestValidator.predicate("broad listing includes appeal2", hasAppeal2);
}
