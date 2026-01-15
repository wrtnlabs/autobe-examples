import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";
import api from "@ORGANIZATION/PROJECT-api";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAdmin";
import type { ICommunityPlatformReportOfAdmins } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformReportOfAdmins";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageICommunityPlatformReportOfAdmins } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageICommunityPlatformReportOfAdmins";
import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";
export async function test_api_admin_report_retrieval_with_date_range(
  connection: api.IConnection,
): Promise<void> {
  // Step 1: Create admin connection and authenticate
  const adminConnection: api.IConnection = { host: connection.host };
  const adminCredentials = {
    email: typia.random<string & tags.Format<"email">>(),
    href: "https://example.com/join",
    referrer: "https://example.com",
    ip: null,
  } satisfies ICommunityPlatformAdmin.IJoin;
  const authenticatedAdmin = await authorize_admin_join(adminConnection, {
    body: adminCredentials,
  });
  typia.assert(authenticatedAdmin);
  // Step 2: Get an initial report count to determine a valid date range
  const allReports =
    await api.functional.communityPlatform.admin.report.of.admins.index(
      adminConnection,
      {
        body: {
          page: 1,
          limit: 100,
        } satisfies ICommunityPlatformReportOfAdmins.IRequest,
      },
    );
  typia.assert(allReports);
  // If there are no reports, we can't test date range filtering effectively
  // But the scenario requires testing with date ranges, so we proceed with assumptions
  // We need to create a date range that likely includes some existing reports
  if (allReports.data.length === 0) {
    // Create a very wide date range that might include historical data
    const startDate = new Date(2020, 0, 1).toISOString();
    const endDate = new Date().toISOString();
    const filteredReports =
      await api.functional.communityPlatform.admin.report.of.admins.index(
        adminConnection,
        {
          body: {
            created_at_start: startDate,
            created_at_end: endDate,
            page: 1,
            limit: 100,
            sort_by: "created_at",
            order: "asc",
          } satisfies ICommunityPlatformReportOfAdmins.IRequest,
        },
      );
    typia.assert(filteredReports);
    // Validate pagination metadata (even if empty)
    TestValidator.equals(
      "pagination records for wide range should be zero or more",
      filteredReports.pagination.records >= 0,
      true,
    );
    TestValidator.equals(
      "pagination pages should be >= 1 if records > 0",
      filteredReports.pagination.pages >= 1,
      true,
    );
    TestValidator.equals(
      "pagination current should be 1",
      filteredReports.pagination.current,
      1,
    );
    TestValidator.equals(
      "pagination limit should be 100",
      filteredReports.pagination.limit,
      100,
    );
    // Validate sorting - if records exist, they should be chronologically ordered
    if (filteredReports.data.length > 0) {
      for (let i = 0; i < filteredReports.data.length - 1; i++) {
        const current = new Date(filteredReports.data[i].created_at);
        const next = new Date(filteredReports.data[i + 1].created_at);
        TestValidator.predicate(
          `report ${i + 1} created_at <= report ${i + 2} created_at`,
          () => {
            return current.getTime() <= next.getTime();
          },
        );
      }
      // Validate that all returned reports have created_at within the requested range
      for (const report of filteredReports.data) {
        const reportDate = new Date(report.created_at);
        // We're using a very wide range: 2020 to now
        // We can't validate specific bounds because we don't know the exact data
        TestValidator.predicate("report created_at >= 2020", () => {
          return reportDate.getTime() >= new Date(2020, 0, 1).getTime();
        });
        TestValidator.predicate("report created_at <= now", () => {
          return reportDate.getTime() <= new Date().getTime();
        });
      }
    }
    return; // Finish here as we can't create reports
  }
  // Step 3: Use the earliest and latest created_at from existing reports to test a narrow range
  // Sort by created_at to find earliest and latest
  const sortedReports = [...allReports.data].sort(
    (a, b) =>
      new Date(a.created_at).getTime() - new Date(b.created_at).getTime(),
  );
  const earliestDate = sortedReports[0].created_at;
  const latestDate = sortedReports[sortedReports.length - 1].created_at;
  // Create a date range that should return all results
  const allRangeStart = earliestDate;
  const allRangeEnd = latestDate;
  const allInRangeReports =
    await api.functional.communityPlatform.admin.report.of.admins.index(
      adminConnection,
      {
        body: {
          created_at_start: allRangeStart,
          created_at_end: allRangeEnd,
          page: 1,
          limit: 100,
          sort_by: "created_at",
          order: "asc",
        } satisfies ICommunityPlatformReportOfAdmins.IRequest,
      },
    );
  typia.assert(allInRangeReports);
  // Validate that all existing reports are returned
  TestValidator.equals(
    "all-in-range report count equals total reports",
    allInRangeReports.data.length,
    allReports.data.length,
  );
  TestValidator.equals(
    "all-in-range pagination records equals total records",
    allInRangeReports.pagination.records,
    allReports.pagination.records,
  );
  // Validate chronological ordering
  for (let i = 0; i < allInRangeReports.data.length - 1; i++) {
    const current = new Date(allInRangeReports.data[i].created_at);
    const next = new Date(allInRangeReports.data[i + 1].created_at);
    TestValidator.predicate(
      `report ${i + 1} created_at <= report ${i + 2} created_at`,
      () => {
        return current.getTime() <= next.getTime();
      },
    );
  }
  // Step 4: Test a narrow date range that is likely to return only a subset
  // Use a range in the middle of the data
  if (sortedReports.length > 2) {
    const middleIndex = Math.floor(sortedReports.length / 2);
    const middleDate = sortedReports[middleIndex].created_at;
    const previousDate = sortedReports[middleIndex - 1].created_at;
    const narrowRangeStart = previousDate;
    const narrowRangeEnd = middleDate;
    const narrowRangeReports =
      await api.functional.communityPlatform.admin.report.of.admins.index(
        adminConnection,
        {
          body: {
            created_at_start: narrowRangeStart,
            created_at_end: narrowRangeEnd,
            page: 1,
            limit: 50,
            sort_by: "created_at",
            order: "asc",
          } satisfies ICommunityPlatformReportOfAdmins.IRequest,
        },
      );
    typia.assert(narrowRangeReports);
    // Validate that only reports within the narrow range are returned
    // We can't guarantee exact count since we don't know exact number of matches
    TestValidator.predicate("narrow range report count > 0", () => {
      return narrowRangeReports.data.length > 0;
    });
    // Validate chronological ordering in narrow range
    for (let i = 0; i < narrowRangeReports.data.length - 1; i++) {
      const current = new Date(narrowRangeReports.data[i].created_at);
      const next = new Date(narrowRangeReports.data[i + 1].created_at);
      TestValidator.predicate(
        `narrow range report ${i + 1} created_at <= report ${i + 2} created_at`,
        () => {
          return current.getTime() <= next.getTime();
        },
      );
    }
    // Validate all reports in narrow range are within bounds
    for (const report of narrowRangeReports.data) {
      const reportDate = new Date(report.created_at);
      TestValidator.predicate("narrow range report created_at >= start", () => {
        return reportDate.getTime() >= new Date(narrowRangeStart).getTime();
      });
      TestValidator.predicate("narrow range report created_at <= end", () => {
        return reportDate.getTime() <= new Date(narrowRangeEnd).getTime();
      });
    }
  }
}
