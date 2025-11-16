import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { ICommunityPlatformComment } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformComment";
import type { ICommunityPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunity";
import type { ICommunityPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMember";
import type { ICommunityPlatformModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformModerator";
import type { ICommunityPlatformPost } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformPost";
import type { ICommunityPlatformReport } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformReport";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageICommunityPlatformReport } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageICommunityPlatformReport";

export async function test_api_moderation_report_queue_sorting_by_creation_date_descending(
  connection: api.IConnection,
) {
  // 1. Moderator registration and authentication
  const moderator: ICommunityPlatformModerator.IAuthorized =
    await api.functional.auth.moderator.join(connection, {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        username: RandomGenerator.alphabets(10),
        password: RandomGenerator.alphaNumeric(12),
        href: "https://example.com/register",
        referrer: "https://example.com",
      } satisfies ICommunityPlatformModerator.ICreate,
    });
  typia.assert(moderator);

  // 2. Retrieve reports sorted by creation date descending
  const reportPage: IPageICommunityPlatformReport.ISummary =
    await api.functional.communityPlatform.moderator.reports.index(connection, {
      body: {
        sort_by: "created_at_desc",
        page: 1,
        limit: 50,
      } satisfies ICommunityPlatformReport.IRequest,
    });
  typia.assert(reportPage);

  // 3. Validate reports are sorted correctly by creation date (descending)
  if (reportPage.data.length > 1) {
    for (let i = 0; i < reportPage.data.length - 1; i++) {
      const current = new Date(reportPage.data[i].created_at);
      const next = new Date(reportPage.data[i + 1].created_at);

      TestValidator.predicate(
        `report at index ${i} should have later or equal creation time than report at index ${i + 1}`,
        current.getTime() >= next.getTime(),
      );
    }
  }

  // 4. Verify pagination information
  TestValidator.predicate(
    "pagination current should be at least 1",
    reportPage.pagination.current >= 1,
  );
  TestValidator.predicate(
    "pagination limit should be greater than 0",
    reportPage.pagination.limit > 0,
  );
  TestValidator.predicate(
    "pagination records should be non-negative",
    reportPage.pagination.records >= 0,
  );

  // 5. Verify data array length matches pagination
  TestValidator.predicate(
    "data length should not exceed limit",
    reportPage.data.length <= reportPage.pagination.limit,
  );

  // 6. Validate each report has required fields
  for (const report of reportPage.data) {
    TestValidator.predicate(
      `report ${report.id} should have valid id`,
      report.id !== null && report.id !== undefined,
    );
    TestValidator.predicate(
      `report ${report.id} should have created_at timestamp`,
      report.created_at !== null && report.created_at !== undefined,
    );
    TestValidator.predicate(
      `report ${report.id} should have category`,
      report.category !== null && report.category !== undefined,
    );
    TestValidator.predicate(
      `report ${report.id} should have status`,
      report.status !== null && report.status !== undefined,
    );
  }
}
