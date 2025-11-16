import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformAdminUserJoin } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAdminUserJoin";
import type { ICommunityPlatformAdminUserLogin } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAdminUserLogin";
import type { ICommunityPlatformAdminuser } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAdminuser";
import type { ICommunityPlatformMemberuser } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMemberuser";
import type { ICommunityPlatformModerationCase } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformModerationCase";
import type { ICommunityPlatformUserReport } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformUserReport";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageICommunityPlatformUserReport } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageICommunityPlatformUserReport";

export async function test_api_admin_user_reports_queue_filtering_by_status_and_severity(
  connection: api.IConnection,
) {
  // 1. Prepare basic URLs used in join/login bodies
  const baseHref: string & tags.Format<"uri"> =
    "https://community.example.com" as string & tags.Format<"uri">;
  const baseReferrer: string & tags.Format<"uri"> =
    "https://community.example.com/landing" as string & tags.Format<"uri">;

  // 2. Register two member users (M1, M2)
  const memberJoinBody1 = {
    username: RandomGenerator.name(1),
    email: `member1+${RandomGenerator.alphaNumeric(8)}@example.com`,
    password: RandomGenerator.alphaNumeric(12),
    ip: null,
    href: baseHref,
    referrer: baseReferrer,
  } satisfies ICommunityPlatformMemberuser.IJoin;
  const member1: ICommunityPlatformMemberuser.IAuthorized =
    await api.functional.auth.memberUser.join(connection, {
      body: memberJoinBody1,
    });
  typia.assert(member1);

  const memberJoinBody2 = {
    username: RandomGenerator.name(1),
    email: `member2+${RandomGenerator.alphaNumeric(8)}@example.com`,
    password: RandomGenerator.alphaNumeric(12),
    ip: null,
    href: baseHref,
    referrer: baseReferrer,
  } satisfies ICommunityPlatformMemberuser.IJoin;
  const member2: ICommunityPlatformMemberuser.IAuthorized =
    await api.functional.auth.memberUser.join(connection, {
      body: memberJoinBody2,
    });
  typia.assert(member2);

  // 3. Register an admin user and keep its credentials for later login
  const adminUsername = RandomGenerator.name(1);
  const adminEmail = `admin+${RandomGenerator.alphaNumeric(8)}@example.com`;
  const adminPassword = RandomGenerator.alphaNumeric(14);

  const adminJoinBody = {
    username: adminUsername,
    email: adminEmail as string & tags.Format<"email">,
    password: adminPassword as string & tags.Format<"password">,
  } satisfies ICommunityPlatformAdminUserJoin.IRequest;

  const adminAuthorized: ICommunityPlatformAdminuser.IAuthorized =
    await api.functional.auth.adminUser.join(connection, {
      body: adminJoinBody,
    });
  typia.assert(adminAuthorized);

  // At this point, the connection is authenticated as admin. We'll log in as
  // member users when creating member-side reports, then back to admin.

  // Collections of report IDs by (status, severity) bucket
  const openHighIds: string[] = [];
  const openMediumIds: string[] = [];
  const inReviewHighIds: string[] = [];
  const inReviewMediumIds: string[] = [];
  const noiseIds: string[] = [];

  // Helper to create a report as the current actor and record its ID
  const createReportAsCurrent = async (
    reportedMemberId: string & tags.Format<"uuid">,
    status: string,
    severity: string,
    bucket:
      | "openHigh"
      | "openMedium"
      | "inReviewHigh"
      | "inReviewMedium"
      | "noise",
  ): Promise<void> => {
    const body = {
      reported_memberuser_id: reportedMemberId,
      reason_category: RandomGenerator.paragraph({ sentences: 1 }),
      reason_detail: RandomGenerator.paragraph({ sentences: 3 }),
      status,
      severity,
    } satisfies ICommunityPlatformUserReport.ICreate;

    const created: ICommunityPlatformUserReport =
      await api.functional.communityPlatform.memberUser.userReports.create(
        connection,
        {
          body,
        },
      );
    typia.assert(created);

    switch (bucket) {
      case "openHigh":
        openHighIds.push(created.id);
        break;
      case "openMedium":
        openMediumIds.push(created.id);
        break;
      case "inReviewHigh":
        inReviewHighIds.push(created.id);
        break;
      case "inReviewMedium":
        inReviewMediumIds.push(created.id);
        break;
      case "noise":
        noiseIds.push(created.id);
        break;
    }
  };

  const createAdminReportAsCurrent = async (
    reportedMemberId: string & tags.Format<"uuid">,
    status: string,
    severity: string,
    bucket:
      | "openHigh"
      | "openMedium"
      | "inReviewHigh"
      | "inReviewMedium"
      | "noise",
  ): Promise<void> => {
    const body = {
      reported_memberuser_id: reportedMemberId,
      reason_category: RandomGenerator.paragraph({ sentences: 1 }),
      reason_detail: RandomGenerator.paragraph({ sentences: 2 }),
      status,
      severity,
    } satisfies ICommunityPlatformUserReport.ICreate;

    const created: ICommunityPlatformUserReport =
      await api.functional.communityPlatform.adminUser.userReports.create(
        connection,
        {
          body,
        },
      );
    typia.assert(created);

    switch (bucket) {
      case "openHigh":
        openHighIds.push(created.id);
        break;
      case "openMedium":
        openMediumIds.push(created.id);
        break;
      case "inReviewHigh":
        inReviewHighIds.push(created.id);
        break;
      case "inReviewMedium":
        inReviewMediumIds.push(created.id);
        break;
      case "noise":
        noiseIds.push(created.id);
        break;
    }
  };

  // 4. Seed reports via memberUser M1
  await api.functional.auth.memberUser.login(connection, {
    body: {
      identifier: memberJoinBody1.email,
      password: memberJoinBody1.password,
      ip: null,
      href: baseHref,
      referrer: baseReferrer,
    } satisfies ICommunityPlatformMemberuser.ILogin,
  });

  // As member1: open/high and open/medium reports against member2
  await createReportAsCurrent(member2.id, "open", "high", "openHigh");
  await createReportAsCurrent(member2.id, "open", "high", "openHigh");
  await createReportAsCurrent(member2.id, "open", "medium", "openMedium");

  // in_review/high and in_review/medium against member2
  await createReportAsCurrent(member2.id, "in_review", "high", "inReviewHigh");
  await createReportAsCurrent(
    member2.id,
    "in_review",
    "medium",
    "inReviewMedium",
  );

  // Noise: resolved/low
  await createReportAsCurrent(member2.id, "resolved", "low", "noise");

  // 5. Seed reports via adminUser
  await api.functional.auth.adminUser.login(connection, {
    body: {
      identifier: adminEmail,
      password: adminPassword,
      ip: null,
      href: baseHref,
      referrer: baseReferrer,
    } satisfies ICommunityPlatformAdminUserLogin.IRequest,
  });

  // Admin-created open/high and open/medium against member1
  await createAdminReportAsCurrent(member1.id, "open", "high", "openHigh");
  await createAdminReportAsCurrent(member1.id, "open", "medium", "openMedium");

  // Admin-created in_review/high and in_review/medium against member1
  await createAdminReportAsCurrent(
    member1.id,
    "in_review",
    "high",
    "inReviewHigh",
  );
  await createAdminReportAsCurrent(
    member1.id,
    "in_review",
    "medium",
    "inReviewMedium",
  );

  // Additional noise report
  await createAdminReportAsCurrent(member1.id, "resolved", "critical", "noise");

  // Sanity: we must have at least one ID in each primary bucket
  TestValidator.predicate(
    "seeded at least one open/high report",
    openHighIds.length > 0,
  );
  TestValidator.predicate(
    "seeded at least one in_review/medium report",
    inReviewMediumIds.length > 0,
  );

  // Helper to extract IDs from queue results
  const extractIds = (
    page: IPageICommunityPlatformUserReport.ISummary,
  ): string[] => page.data.map((r) => r.id);

  // 6. First filter: status="open", severity="high"
  const firstFilterBody = {
    page: 1 as number & tags.Type<"int32">,
    limit: 50 as number & tags.Type<"int32">,
    status: "open",
    severity: "high",
  } satisfies ICommunityPlatformUserReport.IRequest;

  const openHighPage: IPageICommunityPlatformUserReport.ISummary =
    await api.functional.communityPlatform.adminUser.reports.queues.user.index(
      connection,
      { body: firstFilterBody },
    );
  typia.assert(openHighPage);

  const openHighReturnedIds = extractIds(openHighPage);

  // All returned summaries must have status="open" (we only see status field)
  for (const summary of openHighPage.data) {
    TestValidator.equals(
      "queue item status must be 'open' for first filter",
      summary.status,
      "open",
    );
  }

  // No noise or other bucket IDs should appear
  const forbiddenInFirst = [
    ...openMediumIds,
    ...inReviewHighIds,
    ...inReviewMediumIds,
    ...noiseIds,
  ];
  for (const id of openHighReturnedIds) {
    TestValidator.predicate(
      "first filter must not include non-open/high IDs",
      forbiddenInFirst.includes(id) === false,
    );
  }

  // Ideally all openHighIds should be present when limit is large enough
  for (const id of openHighIds) {
    TestValidator.predicate(
      "first filter should include all seeded open/high reports",
      openHighReturnedIds.includes(id),
    );
  }

  // 7. Second filter: status="in_review", severity="medium"
  const secondFilterBody = {
    page: 1 as number & tags.Type<"int32">,
    limit: 50 as number & tags.Type<"int32">,
    status: "in_review",
    severity: "medium",
  } satisfies ICommunityPlatformUserReport.IRequest;

  const inReviewMediumPage: IPageICommunityPlatformUserReport.ISummary =
    await api.functional.communityPlatform.adminUser.reports.queues.user.index(
      connection,
      { body: secondFilterBody },
    );
  typia.assert(inReviewMediumPage);

  const inReviewMediumReturnedIds = extractIds(inReviewMediumPage);

  // All returned summaries must have status="in_review"
  for (const summary of inReviewMediumPage.data) {
    TestValidator.equals(
      "queue item status must be 'in_review' for second filter",
      summary.status,
      "in_review",
    );
  }

  // Ensure at least one result for this filter
  TestValidator.predicate(
    "second filter should return at least one in_review/medium report",
    inReviewMediumReturnedIds.length > 0,
  );

  // No unrelated bucket IDs should appear
  const forbiddenInSecond = [
    ...openHighIds,
    ...openMediumIds,
    ...inReviewHighIds,
    ...noiseIds,
  ];
  for (const id of inReviewMediumReturnedIds) {
    TestValidator.predicate(
      "second filter must not include reports from other buckets",
      forbiddenInSecond.includes(id) === false,
    );
  }

  // All inReviewMediumIds should be present
  for (const id of inReviewMediumIds) {
    TestValidator.predicate(
      "second filter should include all seeded in_review/medium reports",
      inReviewMediumReturnedIds.includes(id),
    );
  }
}
