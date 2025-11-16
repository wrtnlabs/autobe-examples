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
 * Verify platform admin appeal listing with filters, pagination, and
 * authorization.
 *
 * Business flow:
 *
 * 1. Member joins and logs in.
 * 2. Member creates a report.
 * 3. Member creates multiple appeals for that report.
 * 4. Platform admin joins (and implicitly is authenticated).
 * 5. Platform admin updates one appeal to a different status to create
 *    heterogeneous data.
 * 6. Platform admin lists appeals for the report with a filter targeting only one
 *    status, with page/limit and sort options.
 * 7. Validate pagination metadata and that all items match reportId and selected
 *    status, and ordering is consistent with sort configuration.
 * 8. Change filter criteria (different status or created window) and ensure
 *    excluded items disappear and pagination shrinks accordingly.
 * 9. Attempt to list appeals while authenticated only as member user and ensure
 *    authorization error.
 */
export async function test_api_platform_admin_list_appeals_for_report_with_filters_and_pagination(
  connection: api.IConnection,
) {
  // 1. Member joins
  const memberJoinBody = {
    username: RandomGenerator.name(1),
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(12),
    ip: null,
    href: "https://member.example.com/join",
    referrer: "https://member.example.com/landing",
  } satisfies ICommunityPlatformMemberuser.IJoinRequest;

  const memberAuthorized: ICommunityPlatformMemberuser.IAuthorized =
    await api.functional.auth.memberUser.join(connection, {
      body: memberJoinBody,
    });
  typia.assert(memberAuthorized);

  // After join, connection is authenticated as member due to SDK behavior.

  // 2. Member creates a report
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

  // 3. Member creates multiple appeals for that report
  const baseAppealCount = 3;
  const appealPayloads: ICommunityPlatformAppeal.ICreate[] = ArrayUtil.repeat(
    baseAppealCount,
    () =>
      ({
        appeal_scope: RandomGenerator.pick([
          "content",
          "sanction",
          "account_status",
          "other",
        ] as const),
        reason_summary: RandomGenerator.paragraph({ sentences: 3 }),
        details: RandomGenerator.content({ paragraphs: 2 }),
      }) satisfies ICommunityPlatformAppeal.ICreate,
  );

  const createdAppeals: ICommunityPlatformAppeal[] = [];
  for (const body of appealPayloads) {
    const appeal: ICommunityPlatformAppeal =
      await api.functional.communityPlatform.memberUser.reports.appeals.create(
        connection,
        {
          reportId,
          body,
        },
      );
    typia.assert(appeal);
    createdAppeals.push(appeal);
  }

  TestValidator.equals(
    "created appeals count",
    createdAppeals.length,
    baseAppealCount,
  );

  // Capture initial created_at timestamps for time window filters
  const createdTimes: (string & tags.Format<"date-time">)[] =
    createdAppeals.map((a) => a.created_at);

  // 4. Platform admin joins (implicitly logs in)
  const adminJoinBody = {
    username: RandomGenerator.name(1),
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(16),
    displayName: RandomGenerator.name(2),
    ip: undefined,
    href: "https://admin.example.com/join",
    referrer: "https://admin.example.com/landing",
  } satisfies ICommunityPlatformPlatformadmin.IJoin;

  const platformAdmin: ICommunityPlatformPlatformadmin.IAuthorized =
    await api.functional.auth.platformAdmin.join(connection, {
      body: adminJoinBody,
    });
  typia.assert(platformAdmin);

  // After join, connection is authenticated as platformAdmin.

  // 5. Platform admin updates one appeal to a different status
  const targetAppealForUpdate: ICommunityPlatformAppeal = createdAppeals[0];

  const updatedStatus = "accepted";

  const updateBody = {
    appeal_status: updatedStatus,
    appeal_scope: targetAppealForUpdate.appeal_scope,
    reason_summary: targetAppealForUpdate.reason_summary,
    details: targetAppealForUpdate.details ?? null,
    outcome_summary: "decision_upheld",
    resolved_at: new Date().toISOString(),
  } satisfies ICommunityPlatformAppeal.IUpdate;

  const updatedAppeal: ICommunityPlatformAppeal =
    await api.functional.communityPlatform.platformAdmin.reports.appeals.update(
      connection,
      {
        reportId,
        appealId: targetAppealForUpdate.id,
        body: updateBody,
      },
    );
  typia.assert(updatedAppeal);

  TestValidator.equals(
    "appeal status updated to accepted",
    updatedAppeal.appeal_status,
    updatedStatus,
  );

  // 6. Platform admin lists appeals with filters & pagination
  const page = 1 as number & tags.Type<"int32"> & tags.Minimum<1>;
  const limit = 2 as number & tags.Type<"int32"> & tags.Minimum<1>;

  const createdFrom: string & tags.Format<"date-time"> = createdTimes[0];
  const createdUntil: string & tags.Format<"date-time"> =
    createdTimes[createdTimes.length - 1];

  const listRequestBody = {
    page,
    limit,
    appeal_statuses: [updatedStatus],
    appeal_scope: undefined,
    created_from: createdFrom,
    created_until: createdUntil,
    appellant_memberuser_id: null,
    communitymoderator_id: null,
    platformadmin_id: null,
    sort_key: "created_at",
    sort_direction: "desc",
  } satisfies ICommunityPlatformAppeal.IRequest;

  const pageResult: IPageICommunityPlatformAppeal.ISummary =
    await api.functional.communityPlatform.platformAdmin.reports.appeals.index(
      connection,
      {
        reportId,
        body: listRequestBody,
      },
    );
  typia.assert(pageResult);

  const pagination: IPage.IPagination = pageResult.pagination;
  typia.assert(pagination);

  TestValidator.equals("pagination current page", pagination.current, page);
  TestValidator.equals("pagination limit", pagination.limit, limit);

  const filteredAppeals: ICommunityPlatformAppeal.ISummary[] = pageResult.data;

  // All returned appeals should have reportId and status matching filter
  for (const summary of filteredAppeals) {
    typia.assert(summary);

    if (summary.reportId !== undefined) {
      TestValidator.equals(
        "summary reportId matches filter reportId",
        summary.reportId,
        reportId,
      );
    }

    TestValidator.equals(
      "summary status equals updatedStatus",
      summary.status,
      updatedStatus,
    );
  }

  // Verify sort order: desc by created_at
  for (let i = 1; i < filteredAppeals.length; i++) {
    const prev = filteredAppeals[i - 1];
    const curr = filteredAppeals[i];
    TestValidator.predicate(
      "appeals sorted by created_at desc",
      prev.created_at >= curr.created_at,
    );
  }

  // 7. Call again with different status filter (none should match accepted)
  const differentStatus = "rejected";

  const secondRequestBody = {
    page,
    limit,
    appeal_statuses: [differentStatus],
    appeal_scope: undefined,
    created_from: createdFrom,
    created_until: createdUntil,
    appellant_memberuser_id: null,
    communitymoderator_id: null,
    platformadmin_id: null,
    sort_key: "created_at",
    sort_direction: "desc",
  } satisfies ICommunityPlatformAppeal.IRequest;

  const secondResult: IPageICommunityPlatformAppeal.ISummary =
    await api.functional.communityPlatform.platformAdmin.reports.appeals.index(
      connection,
      {
        reportId,
        body: secondRequestBody,
      },
    );
  typia.assert(secondResult);

  // All returned items, if any, must not have the accepted status
  for (const summary of secondResult.data) {
    TestValidator.notEquals(
      "secondResult should not contain accepted status",
      summary.status,
      updatedStatus,
    );
  }

  // 8. Negative authorization test: member user cannot list appeals via admin endpoint
  // Re-authenticate as member user
  const memberLoginBody = {
    identifier: memberJoinBody.email,
    password: memberJoinBody.password,
    ip: null,
    href: "https://member.example.com/login",
    referrer: "https://member.example.com/home",
  } satisfies ICommunityPlatformMemberuser.ILoginRequest;

  const memberLogin: ICommunityPlatformMemberuser.IAuthorized =
    await api.functional.auth.memberUser.login(connection, {
      body: memberLoginBody,
    });
  typia.assert(memberLogin);

  // Now connection has member token; platformAdmin-only index should fail
  await TestValidator.error(
    "member user must not access platformAdmin appeals index",
    async () => {
      await api.functional.communityPlatform.platformAdmin.reports.appeals.index(
        connection,
        {
          reportId,
          body: listRequestBody,
        },
      );
    },
  );
}
