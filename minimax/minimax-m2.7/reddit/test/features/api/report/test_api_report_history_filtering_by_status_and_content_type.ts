import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIRedditCloneReport } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIRedditCloneReport";
import type { IRedditCloneComment } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneComment";
import type { IRedditCloneCommunityBan } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneCommunityBan";
import type { IRedditCloneFile } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneFile";
import type { IRedditCloneFileAssociation } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneFileAssociation";
import type { IRedditCloneMemberSession } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneMemberSession";
import type { IRedditClonePostLink } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditClonePostLink";
import type { IRedditCloneReport } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneReport";
import type { IRedditCloneUserKarma } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneUserKarma";
import type { IRedditCloneUserProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneUserProfile";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";
import { generate_random_reddit_clone_member_communities_create } from "../../../generate/generate_random_reddit_clone_member_communities_create";
import { generate_random_reddit_clone_member_communities_reports_create } from "../../../generate/generate_random_reddit_clone_member_communities_reports_create";
import { generate_random_reddit_clone_member_posts_comments_create } from "../../../generate/generate_random_reddit_clone_member_posts_comments_create";
import { generate_random_reddit_clone_member_posts_create } from "../../../generate/generate_random_reddit_clone_member_posts_create";
import { prepare_random_reddit_clone_comment } from "../../../prepare/prepare_random_reddit_clone_comment";
import { prepare_random_reddit_clone_community_ban } from "../../../prepare/prepare_random_reddit_clone_community_ban";
import { prepare_random_reddit_clone_post_link } from "../../../prepare/prepare_random_reddit_clone_post_link";
import { prepare_random_reddit_clone_report } from "../../../prepare/prepare_random_reddit_clone_report";

/**
 * Test filtering the authenticated member's report history by report status
 * (pending, approved, dismissed) and content type (post, comment).
 *
 * Precondition: Member has submitted multiple reports with different statuses
 * and target types.
 *
 * Test Steps:
 * 1. Authenticate as member via POST /redditClone/auth/member/join
 * 2. Create a community via POST /redditClone/member/communities
 * 3. Create a post via POST /redditClone/member/posts in the community
 * 4. Create a comment via POST /redditClone/member/posts/{postId}/comments
 * 5. Submit a report for the post via POST /redditClone/member/communities/{communityName}/reports
 * 6. Submit a report for the comment via POST /redditClone/member/communities/{communityName}/reports
 * 7. Call PATCH /redditClone/member/reports/history with status="pending" filter
 *    - verify only pending reports returned
 * 8. Call PATCH /redditClone/member/reports/history with status="approved" filter
 *    - verify only approved reports returned
 * 9. Call PATCH /redditClone/member/reports/history with status="dismissed" filter
 *    - verify only dismissed reports returned
 * 10. Call PATCH /redditClone/member/reports/history with target_type="post" filter
 *     - verify only post reports returned
 * 11. Call PATCH /redditClone/member/reports/history with target_type="comment" filter
 *     - verify only comment reports returned
 * 12. Verify pagination metadata is accurate for each filtered result
 *
 * Expected: Each filter correctly narrows results to matching reports only.
 * Response status codes are 200 for all valid filter combinations.
 */
export async function test_api_report_history_filtering_by_status_and_content_type(
  connection: api.IConnection,
): Promise<void> {
  // 1. Authenticate as member
  const memberConnection: api.IConnection = { host: connection.host };
  await authorize_member_join(memberConnection, {});
  // 2. Create a community
  const community =
    await generate_random_reddit_clone_member_communities_create(
      memberConnection,
      {},
    );
  typia.assert(community);
  // 3. Create a post in the community
  const post = await generate_random_reddit_clone_member_posts_create(
    memberConnection,
    {
      body: {
        communityName: community.name,
        title: RandomGenerator.paragraph({ sentences: 2 }),
        type: "text",
      },
    },
  );
  typia.assert(post);
  // 4. Create a comment on the post
  const comment =
    await generate_random_reddit_clone_member_posts_comments_create(
      memberConnection,
      {
        params: { postId: post.id },
        body: {
          content: RandomGenerator.paragraph({ sentences: 3 }),
        },
      },
    );
  typia.assert(comment);
  // 5. Submit a report for the post
  const postReport =
    await generate_random_reddit_clone_member_communities_reports_create(
      memberConnection,
      {
        params: { communityName: community.name },
        body: {
          target_type: "post",
          target_id: post.id,
          reason: RandomGenerator.paragraph({ sentences: 2 }),
        },
      },
    );
  typia.assert(postReport);
  // 6. Submit a report for the comment
  const commentReport =
    await generate_random_reddit_clone_member_communities_reports_create(
      memberConnection,
      {
        params: { communityName: community.name },
        body: {
          target_type: "comment",
          target_id: comment.id,
          reason: RandomGenerator.paragraph({ sentences: 2 }),
        },
      },
    );
  typia.assert(commentReport);
  // Get all reports to verify we have data
  const allReports =
    await api.functional.redditClone.member.reports.history.index(
      memberConnection,
      {
        body: {},
      },
    );
  typia.assert(allReports);
  // Verify we have 2 reports
  TestValidator.equals("total reports count", allReports.data.length, 2);
  TestValidator.predicate("has both reports", allReports.data.length >= 2);
  // 7. Filter by status="pending"
  const pendingReports =
    await api.functional.redditClone.member.reports.history.index(
      memberConnection,
      {
        body: {
          status: "pending",
        } satisfies IRedditCloneReport.IRequest,
      },
    );
  typia.assert(pendingReports);
  // Verify all returned reports have pending status
  for (const report of pendingReports.data) {
    TestValidator.equals("report status is pending", report.status, "pending");
  }
  // Verify pagination metadata
  TestValidator.predicate(
    "pagination exists",
    pendingReports.pagination !== undefined,
  );
  TestValidator.equals(
    "current page is 1",
    pendingReports.pagination.current,
    1,
  );
  TestValidator.predicate(
    "limit is valid",
    pendingReports.pagination.limit > 0,
  );
  TestValidator.predicate(
    "records count is valid",
    pendingReports.pagination.records >= 0,
  );
  TestValidator.predicate(
    "pages count is valid",
    pendingReports.pagination.pages >= 0,
  );
  // 8. Filter by status="approved"
  const approvedReports =
    await api.functional.redditClone.member.reports.history.index(
      memberConnection,
      {
        body: {
          status: "approved",
        } satisfies IRedditCloneReport.IRequest,
      },
    );
  typia.assert(approvedReports);
  // Verify all returned reports have approved status
  for (const report of approvedReports.data) {
    TestValidator.equals(
      "report status is approved",
      report.status,
      "approved",
    );
  }
  // 9. Filter by status="dismissed"
  const dismissedReports =
    await api.functional.redditClone.member.reports.history.index(
      memberConnection,
      {
        body: {
          status: "dismissed",
        } satisfies IRedditCloneReport.IRequest,
      },
    );
  typia.assert(dismissedReports);
  // Verify all returned reports have dismissed status
  for (const report of dismissedReports.data) {
    TestValidator.equals(
      "report status is dismissed",
      report.status,
      "dismissed",
    );
  }
  // 10. Filter by target_type="post"
  const postReports =
    await api.functional.redditClone.member.reports.history.index(
      memberConnection,
      {
        body: {
          target_type: "post",
        } satisfies IRedditCloneReport.IRequest,
      },
    );
  typia.assert(postReports);
  // Verify all returned reports are for posts
  for (const report of postReports.data) {
    TestValidator.equals("target type is post", report.target_type, "post");
    TestValidator.equals("target id matches post", report.target_id, post.id);
  }
  // Verify pagination metadata for post filter
  TestValidator.equals(
    "post filter pagination exists",
    postReports.pagination !== undefined,
    true,
  );
  TestValidator.equals(
    "post filter current page is 1",
    postReports.pagination.current,
    1,
  );
  // 11. Filter by target_type="comment"
  const commentReports =
    await api.functional.redditClone.member.reports.history.index(
      memberConnection,
      {
        body: {
          target_type: "comment",
        } satisfies IRedditCloneReport.IRequest,
      },
    );
  typia.assert(commentReports);
  // Verify all returned reports are for comments
  for (const report of commentReports.data) {
    TestValidator.equals(
      "target type is comment",
      report.target_type,
      "comment",
    );
    TestValidator.equals(
      "target id matches comment",
      report.target_id,
      comment.id,
    );
  }
  // Verify pagination metadata for comment filter
  TestValidator.equals(
    "comment filter pagination exists",
    commentReports.pagination !== undefined,
    true,
  );
  TestValidator.equals(
    "comment filter current page is 1",
    commentReports.pagination.current,
    1,
  );
  // 12. Combined filter: status + target_type
  const combinedFilter =
    await api.functional.redditClone.member.reports.history.index(
      memberConnection,
      {
        body: {
          status: "pending",
          target_type: "post",
        } satisfies IRedditCloneReport.IRequest,
      },
    );
  typia.assert(combinedFilter);
  // Verify combined filter results
  for (const report of combinedFilter.data) {
    TestValidator.equals(
      "combined filter status is pending",
      report.status,
      "pending",
    );
    TestValidator.equals(
      "combined filter target type is post",
      report.target_type,
      "post",
    );
  }
  // 13. Test pagination with limit
  const paginatedReports =
    await api.functional.redditClone.member.reports.history.index(
      memberConnection,
      {
        body: {
          limit: 1,
          page: 1,
        } satisfies IRedditCloneReport.IRequest,
      },
    );
  typia.assert(paginatedReports);
  // Verify pagination works correctly
  TestValidator.equals(
    "paginated limit is 1",
    paginatedReports.pagination.limit,
    1,
  );
  TestValidator.equals(
    "paginated current page is 1",
    paginatedReports.pagination.current,
    1,
  );
  TestValidator.predicate(
    "total records is at least 1",
    paginatedReports.pagination.records >= 1,
  );
}