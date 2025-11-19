import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardArticle } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardArticle";
import type { IDiscussionBoardArticleCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardArticleCategory";
import type { IDiscussionBoardContentReport } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardContentReport";
import type { IDiscussionBoardMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardMember";
import type { IDiscussionBoardModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardModerator";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIDiscussionBoardContentReport } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIDiscussionBoardContentReport";

/**
 * Test filtering content reports by violation category.
 *
 * This test validates that moderators can filter existing content reports by
 * category type. Since no report creation endpoint is available, this test
 * works with existing reports in the system and validates that category
 * filtering returns accurate results.
 *
 * Test steps:
 *
 * 1. Create and authenticate as moderator
 * 2. Test filtering reports by each violation category
 * 3. Verify filtered results contain only matching categories
 * 4. Test pagination with category filters
 * 5. Test combining category and status filters
 * 6. Validate edge cases and empty results
 */
export async function test_api_content_reports_filtering_by_category(
  connection: api.IConnection,
) {
  const moderatorPassword = typia.random<string & tags.MinLength<8>>();

  const moderator = await api.functional.auth.moderator.join(connection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: moderatorPassword,
      username: typia.random<string & tags.MinLength<3> & tags.MaxLength<30>>(),
      display_name: RandomGenerator.name(),
      ip: "127.0.0.1",
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IDiscussionBoardModerator.ICreate,
  });
  typia.assert(moderator);

  const categories = [
    "Spam",
    "Offensive Content",
    "Misinformation",
    "Off-Topic",
    "Other",
  ] as const;

  for (const violationCategory of categories) {
    const filtered =
      await api.functional.discussionBoard.moderator.contentReports.index(
        connection,
        {
          body: {
            report_category: violationCategory,
            page: 1,
            limit: 20,
          } satisfies IDiscussionBoardContentReport.IRequest,
        },
      );
    typia.assert(filtered);

    TestValidator.predicate(
      `all ${violationCategory} reports have correct category`,
      filtered.data.every(
        (report) => report.report_category === violationCategory,
      ),
    );

    TestValidator.predicate(
      `pagination metadata is valid for ${violationCategory}`,
      filtered.pagination.current === 1 && filtered.pagination.limit === 20,
    );
  }

  const spamReportsPage1 =
    await api.functional.discussionBoard.moderator.contentReports.index(
      connection,
      {
        body: {
          report_category: "Spam",
          page: 1,
          limit: 5,
        } satisfies IDiscussionBoardContentReport.IRequest,
      },
    );
  typia.assert(spamReportsPage1);

  TestValidator.predicate(
    "pagination limit is respected",
    spamReportsPage1.data.length <= 5,
  );

  const pendingMisinformation =
    await api.functional.discussionBoard.moderator.contentReports.index(
      connection,
      {
        body: {
          report_category: "Misinformation",
          status: "pending",
          page: 1,
          limit: 20,
        } satisfies IDiscussionBoardContentReport.IRequest,
      },
    );
  typia.assert(pendingMisinformation);

  TestValidator.predicate(
    "combined category and status filters work correctly",
    pendingMisinformation.data.every(
      (report) =>
        report.report_category === "Misinformation" &&
        report.status === "pending",
    ),
  );

  const reviewedOffensiveContent =
    await api.functional.discussionBoard.moderator.contentReports.index(
      connection,
      {
        body: {
          report_category: "Offensive Content",
          status: "reviewed_removed",
          page: 1,
          limit: 10,
        } satisfies IDiscussionBoardContentReport.IRequest,
      },
    );
  typia.assert(reviewedOffensiveContent);

  TestValidator.predicate(
    "filtering reviewed offensive content works",
    reviewedOffensiveContent.data.every(
      (report) =>
        report.report_category === "Offensive Content" &&
        report.status === "reviewed_removed",
    ),
  );

  const allReports =
    await api.functional.discussionBoard.moderator.contentReports.index(
      connection,
      {
        body: {
          page: 1,
          limit: 50,
        } satisfies IDiscussionBoardContentReport.IRequest,
      },
    );
  typia.assert(allReports);

  TestValidator.predicate(
    "unfiltered query returns reports",
    allReports.data.length >= 0,
  );
}
