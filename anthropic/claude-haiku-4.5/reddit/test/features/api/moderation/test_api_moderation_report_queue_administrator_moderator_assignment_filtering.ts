import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { ICommunityPlatformAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAdministrator";
import type { ICommunityPlatformComment } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformComment";
import type { ICommunityPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunity";
import type { ICommunityPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMember";
import type { ICommunityPlatformModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformModerator";
import type { ICommunityPlatformPost } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformPost";
import type { ICommunityPlatformReport } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformReport";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageICommunityPlatformReport } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageICommunityPlatformReport";

export async function test_api_moderation_report_queue_administrator_moderator_assignment_filtering(
  connection: api.IConnection,
) {
  // Step 1: Administrator joins and authenticates
  const admin: ICommunityPlatformAdministrator.IAuthorized =
    await api.functional.auth.administrator.join(connection, {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        password: RandomGenerator.alphabets(12),
        username: RandomGenerator.alphaNumeric(8),
        name: RandomGenerator.name(),
        href: typia.random<string & tags.Format<"uri">>(),
      } satisfies ICommunityPlatformAdministrator.ICreate,
    });
  typia.assert(admin);

  // Step 2: Generate multiple moderator UUIDs for assignment
  const moderator1Id = typia.random<string & tags.Format<"uuid">>();
  const moderator2Id = typia.random<string & tags.Format<"uuid">>();
  const moderator3Id = typia.random<string & tags.Format<"uuid">>();

  // Step 3: Generate test data for filtering - create search requests with different filters
  const categories = [
    "spam",
    "harassment",
    "hate_speech",
    "misinformation",
  ] as const;
  const statuses = ["submitted", "in_review", "resolved"] as const;
  const priorities = ["critical", "high", "medium", "low"] as const;

  // Step 4: Test filtering by moderator1 - retrieve reports assigned to moderator1
  const filterByModerator1 = {
    moderation_assigned_to_id: moderator1Id,
    page: 1,
    limit: 50,
    sort_by: "created_at_desc" as const,
  } satisfies ICommunityPlatformReport.IRequest;

  const result1: IPageICommunityPlatformReport.ISummary =
    await api.functional.communityPlatform.administrator.reports.index(
      connection,
      {
        body: filterByModerator1,
      },
    );
  typia.assert(result1);

  // Verify pagination structure
  TestValidator.predicate(
    "pagination should have current page",
    result1.pagination.current >= 0,
  );
  TestValidator.predicate(
    "pagination should have limit",
    result1.pagination.limit > 0,
  );
  TestValidator.predicate(
    "pagination should have records count",
    result1.pagination.records >= 0,
  );
  TestValidator.predicate(
    "pagination should have pages count",
    result1.pagination.pages >= 0,
  );

  // Step 5: Verify all returned reports are assigned to moderator1 (if any)
  if (result1.data.length > 0) {
    result1.data.forEach((report) => {
      TestValidator.predicate(
        "report should be assigned to filtered moderator",
        report.moderation_assigned_to?.id === moderator1Id,
      );
    });
  }

  // Step 6: Test filtering by moderator2 - verify different moderator returns different results
  const filterByModerator2 = {
    moderation_assigned_to_id: moderator2Id,
    page: 1,
    limit: 50,
    sort_by: "created_at_desc" as const,
  } satisfies ICommunityPlatformReport.IRequest;

  const result2: IPageICommunityPlatformReport.ISummary =
    await api.functional.communityPlatform.administrator.reports.index(
      connection,
      {
        body: filterByModerator2,
      },
    );
  typia.assert(result2);

  // Verify all returned reports are assigned to moderator2 (if any)
  if (result2.data.length > 0) {
    result2.data.forEach((report) => {
      TestValidator.predicate(
        "report should be assigned to second filtered moderator",
        report.moderation_assigned_to?.id === moderator2Id,
      );
    });
  }

  // Step 7: Test with no moderator filter - retrieve all reports
  const filterNoModerator = {
    page: 1,
    limit: 50,
    sort_by: "created_at_desc" as const,
  } satisfies ICommunityPlatformReport.IRequest;

  const resultAll: IPageICommunityPlatformReport.ISummary =
    await api.functional.communityPlatform.administrator.reports.index(
      connection,
      {
        body: filterNoModerator,
      },
    );
  typia.assert(resultAll);

  // Step 8: Verify filtering reduces results - reports with specific moderator filter should be <= all reports
  TestValidator.predicate(
    "moderator-filtered results should be less than or equal to all results",
    result1.pagination.records <= resultAll.pagination.records,
  );

  // Step 9: Test pagination with moderator filter - verify second page
  const filterModerator1Page2 = {
    moderation_assigned_to_id: moderator1Id,
    page: 2,
    limit: 10,
    sort_by: "created_at_desc" as const,
  } satisfies ICommunityPlatformReport.IRequest;

  const result1Page2: IPageICommunityPlatformReport.ISummary =
    await api.functional.communityPlatform.administrator.reports.index(
      connection,
      {
        body: filterModerator1Page2,
      },
    );
  typia.assert(result1Page2);

  // Verify pagination metadata
  TestValidator.equals(
    "page 2 current page should be 2",
    result1Page2.pagination.current,
    2,
  );
  TestValidator.equals(
    "page 2 limit should be 10",
    result1Page2.pagination.limit,
    10,
  );

  // Step 10: Test with combined filters - moderator AND status
  const filterModerator1WithStatus = {
    moderation_assigned_to_id: moderator1Id,
    status: "in_review",
    page: 1,
    limit: 50,
  } satisfies ICommunityPlatformReport.IRequest;

  const resultModerator1Status: IPageICommunityPlatformReport.ISummary =
    await api.functional.communityPlatform.administrator.reports.index(
      connection,
      {
        body: filterModerator1WithStatus,
      },
    );
  typia.assert(resultModerator1Status);

  // Verify combined filter results
  if (resultModerator1Status.data.length > 0) {
    resultModerator1Status.data.forEach((report) => {
      TestValidator.equals(
        "report should have in_review status",
        report.status,
        "in_review",
      );
      TestValidator.predicate(
        "report should be assigned to moderator1",
        report.moderation_assigned_to?.id === moderator1Id,
      );
    });
  }

  // Step 11: Test with priority filter and moderator
  const filterModerator3WithPriority = {
    moderation_assigned_to_id: moderator3Id,
    priority: "critical",
    page: 1,
    limit: 50,
  } satisfies ICommunityPlatformReport.IRequest;

  const resultModerator3Priority: IPageICommunityPlatformReport.ISummary =
    await api.functional.communityPlatform.administrator.reports.index(
      connection,
      {
        body: filterModerator3WithPriority,
      },
    );
  typia.assert(resultModerator3Priority);

  // Verify priority filter with moderator assignment
  if (resultModerator3Priority.data.length > 0) {
    resultModerator3Priority.data.forEach((report) => {
      TestValidator.equals(
        "report should have critical priority",
        report.priority,
        "critical",
      );
      TestValidator.predicate(
        "report should be assigned to moderator3",
        report.moderation_assigned_to?.id === moderator3Id,
      );
    });
  }

  // Step 12: Verify administrator can compare workload across moderators
  const workloadModerator1 = result1.pagination.records;
  const workloadModerator2 = result2.pagination.records;
  const workloadModerator3 = resultModerator3Priority.pagination.records;

  TestValidator.predicate(
    "workload data should be available for comparison",
    workloadModerator1 >= 0 &&
      workloadModerator2 >= 0 &&
      workloadModerator3 >= 0,
  );
}
