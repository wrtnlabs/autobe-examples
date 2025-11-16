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

export async function test_api_moderation_report_queue_category_filtering(
  connection: api.IConnection,
) {
  // Authenticate as a moderator to access report filtering capabilities
  const moderator: ICommunityPlatformModerator.IAuthorized =
    await api.functional.auth.moderator.join(connection, {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        username: RandomGenerator.alphabets(8),
        password: RandomGenerator.alphaNumeric(12),
        href: "https://community.example.com/auth/register",
        referrer: "https://community.example.com",
      } satisfies ICommunityPlatformModerator.ICreate,
    });
  typia.assert(moderator);

  // Test representative categories: spam, harassment, copyright, and illegal_content
  const testCategories = [
    "spam",
    "harassment",
    "copyright",
    "illegal_content",
  ] as const;

  for (const category of testCategories) {
    const filteredReports: IPageICommunityPlatformReport.ISummary =
      await api.functional.communityPlatform.moderator.reports.index(
        connection,
        {
          body: {
            category: category,
            page: 1,
            limit: 50,
          } satisfies ICommunityPlatformReport.IRequest,
        },
      );
    typia.assert(filteredReports);

    // Validate pagination structure
    TestValidator.predicate(
      `${category} reports pagination should be valid`,
      filteredReports.pagination.current >= 1 &&
        filteredReports.pagination.limit === 50 &&
        filteredReports.pagination.records >= 0 &&
        filteredReports.pagination.pages >= 0,
    );

    // Validate that all returned reports match the filtered category
    if (filteredReports.data.length > 0) {
      TestValidator.predicate(
        `all ${category} reports should have matching category`,
        filteredReports.data.every((report) => report.category === category),
      );

      // Validate report summary structure
      const firstReport = filteredReports.data[0];
      TestValidator.predicate(
        `${category} report should have required id field`,
        firstReport.id !== undefined && firstReport.id !== null,
      );
      TestValidator.predicate(
        `${category} report should have required status field`,
        firstReport.status !== undefined && firstReport.status !== null,
      );
      TestValidator.predicate(
        `${category} report should have required priority field`,
        firstReport.priority !== undefined && firstReport.priority !== null,
      );
      TestValidator.predicate(
        `${category} report should have required created_at timestamp`,
        firstReport.created_at !== undefined && firstReport.created_at !== null,
      );
    }
  }

  // Test category=null to verify no category filtering (returns mixed categories)
  const allReports: IPageICommunityPlatformReport.ISummary =
    await api.functional.communityPlatform.moderator.reports.index(connection, {
      body: {
        category: null,
        page: 1,
        limit: 100,
      } satisfies ICommunityPlatformReport.IRequest,
    });
  typia.assert(allReports);

  // Validate that null category filtering returns valid paginated results
  TestValidator.predicate(
    "unfiltered reports should have valid pagination",
    allReports.pagination.current >= 1 &&
      allReports.pagination.limit === 100 &&
      allReports.pagination.records >= 0,
  );

  // Validate that results are properly typed with category field
  if (allReports.data.length > 0) {
    TestValidator.predicate(
      "unfiltered reports should all have category field",
      allReports.data.every(
        (report) => report.category !== undefined && report.category !== null,
      ),
    );
  }

  // Test pagination with category filtering to verify filtering works across pages
  const spamFirstPage: IPageICommunityPlatformReport.ISummary =
    await api.functional.communityPlatform.moderator.reports.index(connection, {
      body: {
        category: "spam",
        page: 1,
        limit: 10,
      } satisfies ICommunityPlatformReport.IRequest,
    });
  typia.assert(spamFirstPage);

  TestValidator.predicate(
    "spam first page should use correct limit",
    spamFirstPage.pagination.limit === 10,
  );

  // Verify category filtering enables moderator specialization by validating different categories
  const harassmentReports: IPageICommunityPlatformReport.ISummary =
    await api.functional.communityPlatform.moderator.reports.index(connection, {
      body: {
        category: "harassment",
        page: 1,
        limit: 30,
      } satisfies ICommunityPlatformReport.IRequest,
    });
  typia.assert(harassmentReports);

  if (harassmentReports.data.length > 0) {
    TestValidator.predicate(
      "harassment filtering should return only harassment reports",
      harassmentReports.data.every(
        (report) => report.category === "harassment",
      ),
    );
  }

  // Verify that category filtering works for all violation types
  const otherCategoryReports: IPageICommunityPlatformReport.ISummary =
    await api.functional.communityPlatform.moderator.reports.index(connection, {
      body: {
        category: "other",
        page: 1,
        limit: 25,
      } satisfies ICommunityPlatformReport.IRequest,
    });
  typia.assert(otherCategoryReports);

  if (otherCategoryReports.data.length > 0) {
    TestValidator.predicate(
      "other category filtering should return only other reports",
      otherCategoryReports.data.every((report) => report.category === "other"),
    );
  }

  // Validate that moderator can filter by adult_content category
  const adultContentReports: IPageICommunityPlatformReport.ISummary =
    await api.functional.communityPlatform.moderator.reports.index(connection, {
      body: {
        category: "adult_content",
        page: 1,
        limit: 20,
      } satisfies ICommunityPlatformReport.IRequest,
    });
  typia.assert(adultContentReports);

  TestValidator.predicate(
    "adult_content category pagination should be valid",
    adultContentReports.pagination.current >= 1 &&
      adultContentReports.pagination.limit === 20,
  );

  if (adultContentReports.data.length > 0) {
    TestValidator.predicate(
      "adult_content reports should all match category",
      adultContentReports.data.every(
        (report) => report.category === "adult_content",
      ),
    );
  }
}
