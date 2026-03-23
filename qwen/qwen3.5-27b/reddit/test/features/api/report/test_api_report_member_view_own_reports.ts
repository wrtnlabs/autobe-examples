import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIRedditCloneReport } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIRedditCloneReport";
import type { IRedditCloneComment } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneComment";
import type { IRedditCloneCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneCommunity";
import type { IRedditCloneMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneMember";
import type { IRedditClonePost } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditClonePost";
import type { IRedditClonePostImage } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditClonePostImage";
import type { IRedditCloneReport } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneReport";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";
import { generate_random_reddit_clone_member_communities_create } from "../../../generate/generate_random_reddit_clone_member_communities_create";
import { generate_random_reddit_clone_member_posts_create } from "../../../generate/generate_random_reddit_clone_member_posts_create";
import { generate_random_reddit_clone_member_reports_create } from "../../../generate/generate_random_reddit_clone_member_reports_create";
import { prepare_random_reddit_clone_community } from "../../../prepare/prepare_random_reddit_clone_community";
import { prepare_random_reddit_clone_post } from "../../../prepare/prepare_random_reddit_clone_post";
import { prepare_random_reddit_clone_report } from "../../../prepare/prepare_random_reddit_clone_report";

/**
 * Test that a regular authenticated member can retrieve a paginated list of content reports they personally submitted.
 * This test verifies the member can view their own reports with filtering and pagination support.
 */
export async function test_api_report_member_view_own_reports(
  connection: api.IConnection,
): Promise<void> {
  // 1. Setup: Register and authenticate as a member user
  const memberConnection: api.IConnection = { host: connection.host };
  const memberAuth = await authorize_member_join(memberConnection, {
    body: undefined,
  });
  typia.assert(memberAuth);
  // 2. Setup: Create a community
  const community =
    await generate_random_reddit_clone_member_communities_create(
      memberConnection,
      { body: undefined },
    );
  typia.assert(community);
  // 3. Setup: Create a post in the community
  const post = await generate_random_reddit_clone_member_posts_create(
    memberConnection,
    {
      body: {
        communityId: community.id,
        postType: "text",
        title: typia.random<string & tags.MinLength<1> & tags.MaxLength<500>>(),
        content: typia.random<string & tags.MaxLength<10000>>(),
      } satisfies IRedditClonePost.ICreate,
    },
  );
  typia.assert(post);
  // 4. Setup: Submit a report on the post
  const report1 = await generate_random_reddit_clone_member_reports_create(
    memberConnection,
    {
      body: {
        content_type: "post",
        post_id: post.id,
        reason: "This content violates community guidelines",
      } satisfies IRedditCloneReport.ICreate,
    },
  );
  typia.assert(report1);
  // 5. Setup: Create another post and report for pagination testing
  const post2 = await generate_random_reddit_clone_member_posts_create(
    memberConnection,
    {
      body: {
        communityId: community.id,
        postType: "text",
        title: typia.random<string & tags.MinLength<1> & tags.MaxLength<500>>(),
        content: typia.random<string & tags.MaxLength<10000>>(),
      } satisfies IRedditClonePost.ICreate,
    },
  );
  typia.assert(post2);
  const report2 = await generate_random_reddit_clone_member_reports_create(
    memberConnection,
    {
      body: {
        content_type: "post",
        post_id: post2.id,
        reason: "Spam content detected",
      } satisfies IRedditCloneReport.ICreate,
    },
  );
  typia.assert(report2);
  // 6. Test: Retrieve all own reports with empty filter
  const allReports = await api.functional.redditClone.member.reports.index(
    memberConnection,
    {
      body: {} satisfies IRedditCloneReport.IRequest,
    },
  );
  typia.assert(allReports);
  // Verify pagination metadata
  TestValidator.equals(
    "pagination current page",
    allReports.pagination.current,
    1,
  );
  TestValidator.equals("pagination limit", allReports.pagination.limit, 100);
  TestValidator.predicate(
    "pagination records count matches data length",
    allReports.pagination.records === allReports.data.length,
  );
  TestValidator.predicate(
    "pagination pages calculated correctly",
    allReports.pagination.pages >= 1,
  );
  // Verify all reports belong to current member
  await ArrayUtil.asyncForEach(allReports.data, async (report) => {
    TestValidator.equals(
      "reporter id matches member id",
      report.reporter.id,
      memberAuth.id,
    );
    TestValidator.equals("report status is pending", report.status, "pending");
    TestValidator.equals("content type is post", report.contentType, "post");
    TestValidator.predicate(
      "reportedPost exists for post reports",
      report.reportedPost !== null,
    );
    TestValidator.predicate(
      "reportedComment is null for post reports",
      report.reportedComment === null,
    );
  });
  // Verify reports are sorted by createdAt descending
  if (allReports.data.length >= 2) {
    TestValidator.predicate(
      "reports sorted by createdAt descending",
      new Date(allReports.data[0].createdAt) >=
        new Date(allReports.data[1].createdAt),
    );
  }
  // 7. Test: Filter by status='pending'
  const pendingReports = await api.functional.redditClone.member.reports.index(
    memberConnection,
    {
      body: {
        status: "pending",
      } satisfies IRedditCloneReport.IRequest,
    },
  );
  typia.assert(pendingReports);
  TestValidator.predicate(
    "pending filter returns reports",
    pendingReports.data.length > 0,
  );
  await ArrayUtil.asyncForEach(pendingReports.data, async (report) => {
    TestValidator.equals(
      "filtered report status is pending",
      report.status,
      "pending",
    );
  });
  // 8. Test: Filter by content_type='post'
  const postReports = await api.functional.redditClone.member.reports.index(
    memberConnection,
    {
      body: {
        content_type: "post",
      } satisfies IRedditCloneReport.IRequest,
    },
  );
  typia.assert(postReports);
  TestValidator.predicate(
    "content_type filter returns reports",
    postReports.data.length > 0,
  );
  await ArrayUtil.asyncForEach(postReports.data, async (report) => {
    TestValidator.equals(
      "filtered report content type is post",
      report.contentType,
      "post",
    );
  });
  // 9. Test: Combined filters (status='pending' AND content_type='post')
  const combinedFilterReports =
    await api.functional.redditClone.member.reports.index(memberConnection, {
      body: {
        status: "pending",
        content_type: "post",
      } satisfies IRedditCloneReport.IRequest,
    });
  typia.assert(combinedFilterReports);
  TestValidator.predicate(
    "combined filter returns reports",
    combinedFilterReports.data.length > 0,
  );
  await ArrayUtil.asyncForEach(combinedFilterReports.data, async (report) => {
    TestValidator.equals(
      "combined filter status is pending",
      report.status,
      "pending",
    );
    TestValidator.equals(
      "combined filter content type is post",
      report.contentType,
      "post",
    );
  });
  // 10. Test: Pagination with page=1, limit=1
  const paginatedReports =
    await api.functional.redditClone.member.reports.index(memberConnection, {
      body: {
        page: 1,
        limit: 1,
      } satisfies IRedditCloneReport.IRequest,
    });
  typia.assert(paginatedReports);
  TestValidator.equals(
    "pagination current page",
    paginatedReports.pagination.current,
    1,
  );
  TestValidator.equals(
    "pagination limit",
    paginatedReports.pagination.limit,
    1,
  );
  TestValidator.equals(
    "pagination data length matches limit",
    paginatedReports.data.length,
    1,
  );
  TestValidator.predicate(
    "pagination records matches total",
    paginatedReports.pagination.records === allReports.pagination.records,
  );
  // 11. Test: Pagination with page=2, limit=1
  const secondPageReports =
    await api.functional.redditClone.member.reports.index(memberConnection, {
      body: {
        page: 2,
        limit: 1,
      } satisfies IRedditCloneReport.IRequest,
    });
  typia.assert(secondPageReports);
  TestValidator.equals(
    "second page current",
    secondPageReports.pagination.current,
    2,
  );
  TestValidator.equals(
    "second page limit",
    secondPageReports.pagination.limit,
    1,
  );
  // 12. Test: Filter by status='approved' (should return empty)
  const approvedReports = await api.functional.redditClone.member.reports.index(
    memberConnection,
    {
      body: {
        status: "approved",
      } satisfies IRedditCloneReport.IRequest,
    },
  );
  typia.assert(approvedReports);
  TestValidator.equals(
    "approved filter returns empty",
    approvedReports.data.length,
    0,
  );
  TestValidator.equals(
    "approved filter records is 0",
    approvedReports.pagination.records,
    0,
  );
  // 13. Test: Filter by status='dismissed' (should return empty)
  const dismissedReports =
    await api.functional.redditClone.member.reports.index(memberConnection, {
      body: {
        status: "dismissed",
      } satisfies IRedditCloneReport.IRequest,
    });
  typia.assert(dismissedReports);
  TestValidator.equals(
    "dismissed filter returns empty",
    dismissedReports.data.length,
    0,
  );
  TestValidator.equals(
    "dismissed filter records is 0",
    dismissedReports.pagination.records,
    0,
  );
  // 14. Test: Filter by content_type='comment' (should return empty)
  const commentReports = await api.functional.redditClone.member.reports.index(
    memberConnection,
    {
      body: {
        content_type: "comment",
      } satisfies IRedditCloneReport.IRequest,
    },
  );
  typia.assert(commentReports);
  TestValidator.equals(
    "comment filter returns empty",
    commentReports.data.length,
    0,
  );
  TestValidator.equals(
    "comment filter records is 0",
    commentReports.pagination.records,
    0,
  );
}
