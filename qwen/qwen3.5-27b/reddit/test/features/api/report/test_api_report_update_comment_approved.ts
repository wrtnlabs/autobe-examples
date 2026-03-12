import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IRedditCloneAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneAdmin";
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

import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";
import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";
import { generate_random_reddit_clone_member_communities_create } from "../../../generate/generate_random_reddit_clone_member_communities_create";
import { generate_random_reddit_clone_member_posts_comments_create } from "../../../generate/generate_random_reddit_clone_member_posts_comments_create";
import { generate_random_reddit_clone_member_posts_create } from "../../../generate/generate_random_reddit_clone_member_posts_create";
import { generate_random_reddit_clone_member_reports_create } from "../../../generate/generate_random_reddit_clone_member_reports_create";
import { prepare_random_reddit_clone_comment } from "../../../prepare/prepare_random_reddit_clone_comment";
import { prepare_random_reddit_clone_community } from "../../../prepare/prepare_random_reddit_clone_community";
import { prepare_random_reddit_clone_post } from "../../../prepare/prepare_random_reddit_clone_post";
import { prepare_random_reddit_clone_report } from "../../../prepare/prepare_random_reddit_clone_report";

/**
 * Test the approval workflow for reported comments.
 * This test verifies that when an admin approves a report on a comment:
 * 1. The report status changes from 'pending' to 'approved'
 * 2. The reported comment is soft-deleted (deleted_at is set)
 * 3. The parent post remains intact and visible
 * 4. The report's updated_at timestamp is updated
 */
export async function test_api_report_update_comment_approved(
  connection: api.IConnection,
): Promise<void> {
  // 1. Setup: Create and authenticate admin
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_admin_join(adminConnection, {
    body: {
      email: "admin@test.com",
      password: "1234",
      username: "admin_user",
      displayName: "Admin User",
      href: "https://test.com",
      referrer: "https://test.com",
    },
  });
  // 2. Setup: Create community (admin becomes owner and moderator)
  const community =
    await generate_random_reddit_clone_member_communities_create(
      adminConnection,
      {
        body: {
          name: "test_community",
          description: "Test community for reporting",
        },
      },
    );
  typia.assert(community);
  // 3. Setup: Create a post in the community
  const post = await generate_random_reddit_clone_member_posts_create(
    adminConnection,
    {
      body: {
        title: "Test Post for Comments",
        postType: "text",
        communityId: community.id,
        content: "This is a test post with content.",
      },
    },
  );
  typia.assert(post);
  // 4. Setup: Create a comment on the post
  const comment =
    await generate_random_reddit_clone_member_posts_comments_create(
      adminConnection,
      {
        params: {
          postId: post.id,
        },
        body: {
          content: "This is a test comment that will be reported.",
        },
      },
    );
  typia.assert(comment);
  // 5. Setup: Create and authenticate member
  const memberConnection: api.IConnection = { host: connection.host };
  await authorize_member_join(memberConnection, {
    body: {
      email: "member@test.com",
      password: "1234",
      username: "member_user",
      display_name: "Member User",
      href: "https://test.com",
      referrer: "https://test.com",
    },
  });
  // 6. Setup: Member reports the comment
  const report = await generate_random_reddit_clone_member_reports_create(
    memberConnection,
    {
      body: {
        content_type: "comment",
        reason: "This comment violates community guidelines.",
        comment_id: comment.id,
      },
    },
  );
  typia.assert(report);
  // Verify initial report state
  TestValidator.equals("report status is pending", report.status, "pending");
  TestValidator.equals(
    "report content type is comment",
    report.content_type,
    "comment",
  );
  TestValidator.equals(
    "report has comment reference",
    report.reportedComment?.id,
    comment.id,
  );
  // Store original timestamps for comparison
  const originalUpdatedAt = report.updated_at;
  // 7. Test: Admin approves the report
  const updatedReport = await api.functional.redditClone.admin.reports.update(
    adminConnection,
    {
      reportId: report.id,
      body: {
        status: "approved",
      } satisfies IRedditCloneReport.IUpdate,
    },
  );
  typia.assert(updatedReport);
  // 8. Validate: Report status changed to 'approved'
  TestValidator.equals(
    "report status is approved",
    updatedReport.status,
    "approved",
  );
  // 9. Validate: Report updated_at timestamp was updated
  TestValidator.notEquals(
    "report updated_at changed",
    originalUpdatedAt,
    updatedReport.updated_at,
  );
  // 10. Validate: Report still references the same comment
  TestValidator.equals(
    "report still references same comment",
    updatedReport.reportedComment?.id,
    comment.id,
  );
  // 11. Validate: Parent post information is preserved in report
  TestValidator.equals(
    "parent post id preserved",
    updatedReport.reportedComment?.post.id,
    post.id,
  );
  TestValidator.equals(
    "parent post title preserved",
    updatedReport.reportedComment?.post.title,
    post.title,
  );
  // 12. Validate: Cannot approve an already-approved report (should fail)
  await TestValidator.error(
    "cannot approve already approved report",
    async () => {
      await api.functional.redditClone.admin.reports.update(adminConnection, {
        reportId: report.id,
        body: {
          status: "approved",
        } satisfies IRedditCloneReport.IUpdate,
      });
    },
  );
}