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

export async function test_api_moderation_report_queue_administrator_reported_type_filtering(
  connection: api.IConnection,
) {
  // Step 1: Create and authenticate as administrator
  const administrator: ICommunityPlatformAdministrator.IAuthorized =
    await api.functional.auth.administrator.join(connection, {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        password: RandomGenerator.alphabets(12),
        username: RandomGenerator.alphaNumeric(8),
        name: RandomGenerator.name(),
        href: typia.random<string & tags.Format<"uri">>(),
      } satisfies ICommunityPlatformAdministrator.ICreate,
    });
  typia.assert(administrator);

  // Step 2: Retrieve and verify reports filtered by "post" type
  const postReportsPage: IPageICommunityPlatformReport.ISummary =
    await api.functional.communityPlatform.administrator.reports.index(
      connection,
      {
        body: {
          reported_type: "post",
          page: 1,
          limit: 50,
        } satisfies ICommunityPlatformReport.IRequest,
      },
    );
  typia.assert(postReportsPage);
  TestValidator.predicate(
    "post reports page should be valid",
    postReportsPage.data.length >= 0,
  );

  // Verify all results have post type
  for (const report of postReportsPage.data) {
    TestValidator.predicate(
      "report should have reported_post_id when filtered by post type",
      report.reported_post_id !== null && report.reported_post_id !== undefined,
    );
    TestValidator.predicate(
      "report should not have reported_comment_id when filtered by post type",
      report.reported_comment_id === null ||
        report.reported_comment_id === undefined,
    );
    TestValidator.predicate(
      "report should not have reported_member_id when filtered by post type",
      report.reported_member_id === null ||
        report.reported_member_id === undefined,
    );
  }

  // Step 3: Retrieve and verify reports filtered by "comment" type
  const commentReportsPage: IPageICommunityPlatformReport.ISummary =
    await api.functional.communityPlatform.administrator.reports.index(
      connection,
      {
        body: {
          reported_type: "comment",
          page: 1,
          limit: 50,
        } satisfies ICommunityPlatformReport.IRequest,
      },
    );
  typia.assert(commentReportsPage);
  TestValidator.predicate(
    "comment reports page should be valid",
    commentReportsPage.data.length >= 0,
  );

  // Verify all results have comment type
  for (const report of commentReportsPage.data) {
    TestValidator.predicate(
      "report should have reported_comment_id when filtered by comment type",
      report.reported_comment_id !== null &&
        report.reported_comment_id !== undefined,
    );
    TestValidator.predicate(
      "report should not have reported_post_id when filtered by comment type",
      report.reported_post_id === null || report.reported_post_id === undefined,
    );
    TestValidator.predicate(
      "report should not have reported_member_id when filtered by comment type",
      report.reported_member_id === null ||
        report.reported_member_id === undefined,
    );
  }

  // Step 4: Retrieve and verify reports filtered by "member" type
  const memberReportsPage: IPageICommunityPlatformReport.ISummary =
    await api.functional.communityPlatform.administrator.reports.index(
      connection,
      {
        body: {
          reported_type: "member",
          page: 1,
          limit: 50,
        } satisfies ICommunityPlatformReport.IRequest,
      },
    );
  typia.assert(memberReportsPage);
  TestValidator.predicate(
    "member reports page should be valid",
    memberReportsPage.data.length >= 0,
  );

  // Verify all results have member type
  for (const report of memberReportsPage.data) {
    TestValidator.predicate(
      "report should have reported_member_id when filtered by member type",
      report.reported_member_id !== null &&
        report.reported_member_id !== undefined,
    );
    TestValidator.predicate(
      "report should not have reported_post_id when filtered by member type",
      report.reported_post_id === null || report.reported_post_id === undefined,
    );
    TestValidator.predicate(
      "report should not have reported_comment_id when filtered by member type",
      report.reported_comment_id === null ||
        report.reported_comment_id === undefined,
    );
  }

  // Step 5: Retrieve all reports without type filter to compare
  const allReportsPage: IPageICommunityPlatformReport.ISummary =
    await api.functional.communityPlatform.administrator.reports.index(
      connection,
      {
        body: {
          page: 1,
          limit: 50,
        } satisfies ICommunityPlatformReport.IRequest,
      },
    );
  typia.assert(allReportsPage);

  // Verify pagination information is consistent
  TestValidator.predicate(
    "pagination should have valid current page",
    allReportsPage.pagination.current > 0,
  );
  TestValidator.predicate(
    "pagination should have valid limit",
    allReportsPage.pagination.limit > 0,
  );
  TestValidator.predicate(
    "pagination should have valid records count",
    allReportsPage.pagination.records >= 0,
  );
  TestValidator.predicate(
    "pagination should have valid pages count",
    allReportsPage.pagination.pages >= 0,
  );

  // Step 6: Verify filtered counts are less than or equal to total
  const postCount = postReportsPage.pagination.records;
  const commentCount = commentReportsPage.pagination.records;
  const memberCount = memberReportsPage.pagination.records;
  const totalCount = allReportsPage.pagination.records;

  TestValidator.predicate(
    "post report count should be less than or equal to total",
    postCount <= totalCount,
  );
  TestValidator.predicate(
    "comment report count should be less than or equal to total",
    commentCount <= totalCount,
  );
  TestValidator.predicate(
    "member report count should be less than or equal to total",
    memberCount <= totalCount,
  );
}
