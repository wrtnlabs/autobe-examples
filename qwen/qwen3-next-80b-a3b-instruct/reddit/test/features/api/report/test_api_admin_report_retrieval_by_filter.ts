import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";
import api from "@ORGANIZATION/PROJECT-api";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityBbsAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityBbsAdmin";
import type { ICommunityBbsComment } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityBbsComment";
import type { ICommunityBbsCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityBbsCommunity";
import type { ICommunityBbsMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityBbsMember";
import type { ICommunityBbsPost } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityBbsPost";
import type { ICommunityBbsPostReport } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityBbsPostReport";
import type { ICommunityBbsReport } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityBbsReport";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageICommunityBbsReport } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageICommunityBbsReport";
import { prepare_random_community_bbs_post_report } from "../../../prepare/prepare_random_community_bbs_post_report";
import { prepare_random_community_bbs_post } from "../../../prepare/prepare_random_community_bbs_post";
import { prepare_random_community_bbs_comment } from "../../../prepare/prepare_random_community_bbs_comment";
import { generate_random_community_bbs_member_posts_create } from "../../../generate/generate_random_community_bbs_member_posts_create";
import { generate_random_community_bbs_member_comments_create } from "../../../generate/generate_random_community_bbs_member_comments_create";
import { generate_random_community_bbs_member_post_reports_create } from "../../../generate/generate_random_community_bbs_member_post_reports_create";
import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";
import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";
export async function test_api_admin_report_retrieval_by_filter(
  connection: api.IConnection,
): Promise<void> {
  // Step 1: Create admin account for report retrieval
  const adminConnection: api.IConnection = { host: connection.host };
  const admin: ICommunityBbsAdmin.IAuthorized = await authorize_admin_join(
    adminConnection,
    {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        password: RandomGenerator.alphaNumeric(16),
      },
    },
  );
  // Step 2: Create member account to submit reports
  const memberConnection: api.IConnection = { host: connection.host };
  const member: ICommunityBbsMember.IAuthorized = await authorize_member_join(
    memberConnection,
    {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        password: RandomGenerator.alphaNumeric(16),
      },
    },
  );
  // Step 3: Create posts for the member to report
  const post1 = await generate_random_community_bbs_member_posts_create(
    memberConnection,
    {
      body: {
        title: RandomGenerator.paragraph({ sentences: 1 }),
        community_id: typia.random<string & tags.Format<"uuid">>(),
        post_type: "text",
      },
    },
  );
  const post2 = await generate_random_community_bbs_member_posts_create(
    memberConnection,
    {
      body: {
        title: RandomGenerator.paragraph({ sentences: 1 }),
        community_id: typia.random<string & tags.Format<"uuid">>(),
        post_type: "text",
      },
    },
  );
  // Step 4: Submit post report with violation_category_code 'spam'
  // Use a specific UUID that represents the 'spam' violation category (assumed to exist in system)
  const spamCategoryId = "11111111-1111-1111-1111-111111111111";
  const spamReport =
    await generate_random_community_bbs_member_post_reports_create(
      memberConnection,
      {
        body: {
          target_post_id: post1.id,
          selected_violation_category_id: spamCategoryId,
        },
      },
    );
  // Step 5: Submit post report with violation_category_code 'harassment'
  // Use a specific UUID that represents the 'harassment' violation category (assumed to exist in system)
  const harassmentCategoryId = "22222222-2222-2222-2222-222222222222";
  const harassmentReport =
    await generate_random_community_bbs_member_post_reports_create(
      memberConnection,
      {
        body: {
          target_post_id: post2.id,
          selected_violation_category_id: harassmentCategoryId,
        },
      },
    );
  // Step 6: Create a comment for reporting - Note: No comment report endpoint exists in API, so skip
  // Step 7: Submit a post report with status 'under_review' - Note: status is determined by system, not set by user
  // We'll create a third report for more data
  const post3 = await generate_random_community_bbs_member_posts_create(
    memberConnection,
    {
      body: {
        title: RandomGenerator.paragraph({ sentences: 1 }),
        community_id: typia.random<string & tags.Format<"uuid">>(),
        post_type: "text",
      },
    },
  );
  const underReviewReport =
    await generate_random_community_bbs_member_post_reports_create(
      memberConnection,
      {
        body: {
          target_post_id: post3.id,
          selected_violation_category_id: spamCategoryId,
        },
      },
    );
  // Step 8: Authenticate as admin for report retrieval
  // adminConnection already has token from authorize_admin_join
  // Step 9: Test reporting filter by status: 'pending'
  // We assume 'pending' is a valid status value
  const pendingReportsResult =
    await api.functional.communityBbs.admin.users.reports.index(
      adminConnection,
      {
        body: {
          filterByStatus: "pending",
        },
      },
    );
  typia.assert(pendingReportsResult);
  // We can't assert the content because we don't know how many reports are still pending
  // Step 10: Test reporting filter by status: 'under_review'
  const underReviewReportsResult =
    await api.functional.communityBbs.admin.users.reports.index(
      adminConnection,
      {
        body: {
          filterByStatus: "under_review",
        },
      },
    );
  typia.assert(underReviewReportsResult);
  // We can't assert specific content because we don't know which reports have which status
  // Step 11: Test reporting filter by violation_category_code
  // We assume 'spam' is a valid violation category code based on system design
  const spamReportsResult =
    await api.functional.communityBbs.admin.users.reports.index(
      adminConnection,
      {
        body: {
          filterByViolationCategoryCode: "spam",
        },
      },
    );
  typia.assert(spamReportsResult);
  // We need to verify that at least one report matches
  TestValidator.predicate(
    "at least one spam report found",
    spamReportsResult.data.length > 0,
  );
  // Step 12: Test reporting filter by violation_category_code: 'harassment'
  const harassmentReportsResult =
    await api.functional.communityBbs.admin.users.reports.index(
      adminConnection,
      {
        body: {
          filterByViolationCategoryCode: "harassment",
        },
      },
    );
  typia.assert(harassmentReportsResult);
  TestValidator.predicate(
    "at least one harassment report found",
    harassmentReportsResult.data.length > 0,
  );
  // Step 13: Test filtering by reporter_id
  const reporterReportsResult =
    await api.functional.communityBbs.admin.users.reports.index(
      adminConnection,
      {
        body: {
          filterByReporterId: member.id,
        },
      },
    );
  typia.assert(reporterReportsResult);
  // Verify that all reports in result have our member.id as reporter_id
  TestValidator.predicate(
    "all reports have correct reporter_id",
    reporterReportsResult.data.every(
      (report) => report.reporter_id === member.id,
    ),
  );
  // Step 14: Test date range filtering on created_at
  const now = new Date().toISOString();
  const past = new Date(Date.now() - 1000 * 60 * 60 * 24).toISOString(); // 24 hours ago
  const dateRangeReportsResult =
    await api.functional.communityBbs.admin.users.reports.index(
      adminConnection,
      {
        body: {
          filterByCreatedAtMin: past,
          filterByCreatedAtMax: now,
        },
      },
    );
  typia.assert(dateRangeReportsResult);
  // Verify all reports are within date range
  TestValidator.predicate(
    "all reports within date range",
    dateRangeReportsResult.data.every(
      (report) => report.created_at >= past && report.created_at <= now,
    ),
  );
  // Step 15: Test pagination with limit
  const limitedReportsResult =
    await api.functional.communityBbs.admin.users.reports.index(
      adminConnection,
      {
        body: {
          pageLimit: 2,
        },
      },
    );
  typia.assert(limitedReportsResult);
  TestValidator.equals(
    "limit of 2 should return 2 records",
    limitedReportsResult.data.length,
    2,
  );
  TestValidator.equals(
    "pagination limit matches request",
    limitedReportsResult.pagination.limit,
    2,
  );
  // Step 17: Test that unauthenticated access is denied
  // Create an unauthenticated connection
  const unauthenticatedConnection: api.IConnection = { host: connection.host };
  await TestValidator.error(
    "unauthenticated admin access should be denied",
    async () => {
      await api.functional.communityBbs.admin.users.reports.index(
        unauthenticatedConnection,
        {
          body: {
            filterByStatus: "pending",
          },
        },
      );
    },
  );
}
