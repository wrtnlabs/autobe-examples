import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformAdminUserJoin } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAdminUserJoin";
import type { ICommunityPlatformAdminuser } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAdminuser";
import type { ICommunityPlatformMemberuser } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMemberuser";
import type { ICommunityPlatformModerationCase } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformModerationCase";
import type { ICommunityPlatformModerationCaseMetadata } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformModerationCaseMetadata";
import type { ICommunityPlatformModerationCaseReport } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformModerationCaseReport";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageICommunityPlatformModerationCaseReport } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageICommunityPlatformModerationCaseReport";

export async function test_api_moderation_case_reports_filtering_and_pagination(
  connection: api.IConnection,
) {
  // 1. Join as a fresh adminUser to obtain an authorized context.
  const joinBody = {
    username: RandomGenerator.name(1),
    email: `${RandomGenerator.alphabets(8)}@example.com`,
    password: "Password123!",
  } satisfies ICommunityPlatformAdminUserJoin.IRequest;

  const adminAuthorized: ICommunityPlatformAdminuser.IAuthorized =
    await api.functional.auth.adminUser.join(connection, {
      body: joinBody,
    });
  typia.assert(adminAuthorized);

  // 2. Create a moderation case to query reports from.
  const caseKey = `case-${RandomGenerator.alphaNumeric(12)}`;
  const createCaseBody = {
    case_key: caseKey,
    title: RandomGenerator.paragraph({ sentences: 3 }),
    description: RandomGenerator.paragraph({ sentences: 8 }),
    status: "open",
    priority: "high",
    assigned_adminuser_id: null,
  } satisfies ICommunityPlatformModerationCase.ICreate;

  const moderationCase: ICommunityPlatformModerationCase =
    await api.functional.communityPlatform.adminUser.moderationCases.create(
      connection,
      { body: createCaseBody },
    );
  typia.assert(moderationCase);

  TestValidator.equals(
    "created moderation case should have requested case_key",
    moderationCase.case_key,
    caseKey,
  );

  // 3. Initial unfiltered reports listing on page 1.
  const page = 1;
  const limit = 10;
  const initialRequest = {
    page,
    limit,
  } satisfies ICommunityPlatformModerationCaseReport.IRequest;

  const initialPage: IPageICommunityPlatformModerationCaseReport.ISummary =
    await api.functional.communityPlatform.adminUser.moderationCases.reports.index(
      connection,
      {
        caseKey,
        body: initialRequest,
      },
    );
  typia.assert(initialPage);

  const initialPagination = initialPage.pagination;
  TestValidator.equals(
    "initial page current index should be 1",
    initialPagination.current,
    page,
  );
  TestValidator.equals(
    "initial page limit should equal requested limit",
    initialPagination.limit,
    limit,
  );

  const initialData = initialPage.data;

  // 4. Derive filters from first report if available and validate filtered results.
  if (initialData.length > 0) {
    const sampleReport: ICommunityPlatformModerationCaseReport.ISummary =
      initialData[0];

    const filterReportType = sampleReport.report_type;
    const filterReporterKey = sampleReport.reporter.username;

    // Build a small time window around created_at.
    const createdAtDate = new Date(sampleReport.created_at);
    const windowMillis = 5 * 60 * 1000; // ± 5 minutes
    const fromDate = new Date(createdAtDate.getTime() - windowMillis);
    const toDate = new Date(createdAtDate.getTime() + windowMillis);

    const createdFrom = fromDate.toISOString() as string &
      tags.Format<"date-time">;
    const createdTo = toDate.toISOString() as string & tags.Format<"date-time">;

    const filteredRequest = {
      page: 1,
      limit,
      reportType: filterReportType,
      reporterMemberUserKey: filterReporterKey,
      createdFrom,
      createdTo,
    } satisfies ICommunityPlatformModerationCaseReport.IRequest;

    const filteredPage: IPageICommunityPlatformModerationCaseReport.ISummary =
      await api.functional.communityPlatform.adminUser.moderationCases.reports.index(
        connection,
        {
          caseKey,
          body: filteredRequest,
        },
      );
    typia.assert(filteredPage);

    const filteredData = filteredPage.data;

    // All returned reports must respect the filters.
    for (const report of filteredData) {
      TestValidator.equals(
        "filtered report_type should equal requested reportType",
        report.report_type,
        filterReportType,
      );
      TestValidator.equals(
        "filtered reporter username should equal requested reporterMemberUserKey",
        report.reporter.username,
        filterReporterKey,
      );
      TestValidator.predicate(
        "filtered report created_at should be within [createdFrom, createdTo] range",
        () => {
          const ts = new Date(report.created_at).getTime();
          return (
            ts >= new Date(createdFrom).getTime() &&
            ts <= new Date(createdTo).getTime()
          );
        },
      );
    }
  }

  // 5. Pagination behavior: if multiple pages exist, verify page 2 is coherent.
  if (initialPagination.pages >= 2 && initialPagination.records > limit) {
    const secondPageRequest = {
      page: 2,
      limit,
    } satisfies ICommunityPlatformModerationCaseReport.IRequest;

    const secondPage: IPageICommunityPlatformModerationCaseReport.ISummary =
      await api.functional.communityPlatform.adminUser.moderationCases.reports.index(
        connection,
        {
          caseKey,
          body: secondPageRequest,
        },
      );
    typia.assert(secondPage);

    const secondPagination = secondPage.pagination;
    TestValidator.equals(
      "second page current index should be 2",
      secondPagination.current,
      2,
    );
    TestValidator.equals(
      "second page limit should equal requested limit",
      secondPagination.limit,
      limit,
    );

    const secondData = secondPage.data;

    if (initialData.length > 0 && secondData.length > 0) {
      const firstIds = initialData.map((r) => r.id);
      const secondIds = secondData.map((r) => r.id);

      const hasOverlap = ArrayUtil.has(secondIds, (id) =>
        firstIds.includes(id),
      );

      TestValidator.predicate(
        "ids of reports on page 1 and page 2 should not overlap when both pages have data",
        () => hasOverlap === false,
      );
    }
  } else {
    // Even if there is only one page, calling a non-existent page index should still be safe.
    const nextPageIndex = initialPagination.current + 1;
    const nextPageRequest = {
      page: nextPageIndex,
      limit,
    } satisfies ICommunityPlatformModerationCaseReport.IRequest;

    const nextPage: IPageICommunityPlatformModerationCaseReport.ISummary =
      await api.functional.communityPlatform.adminUser.moderationCases.reports.index(
        connection,
        {
          caseKey,
          body: nextPageRequest,
        },
      );
    typia.assert(nextPage);

    TestValidator.equals(
      "next page current index should match requested page even if beyond available pages",
      nextPage.pagination.current,
      nextPageIndex,
    );
  }
}
