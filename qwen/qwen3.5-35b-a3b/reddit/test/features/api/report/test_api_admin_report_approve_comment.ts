import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IRedditCommunityAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityAdmin";
import type { IRedditCommunityComment } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityComment";
import type { IRedditCommunityCommentReport } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityCommentReport";
import type { IRedditCommunityCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityCommunity";
import type { IRedditCommunityMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityMember";
import type { IRedditCommunityPost } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityPost";
import type { IRedditCommunityPostFile } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityPostFile";
import type { IRedditCommunityReport } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityReport";
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
import { generate_random_reddit_community_member_posts_comments_create } from "../../../generate/generate_random_reddit_community_member_posts_comments_create";
import { generate_random_reddit_community_member_posts_comments_reports_create } from "../../../generate/generate_random_reddit_community_member_posts_comments_reports_create";
import { generate_random_reddit_community_member_posts_create } from "../../../generate/generate_random_reddit_community_member_posts_create";
import { prepare_random_reddit_community_comment } from "../../../prepare/prepare_random_reddit_community_comment";
import { prepare_random_reddit_community_comment_report } from "../../../prepare/prepare_random_reddit_community_comment_report";
import { prepare_random_reddit_community_post } from "../../../prepare/prepare_random_reddit_community_post";
import { prepare_random_reddit_community_post_file } from "../../../prepare/prepare_random_reddit_community_post_file";

export async function test_api_admin_report_approve_comment(
  connection: api.IConnection,
): Promise<void> {
  // 1. Register admin account
  const adminConnection: api.IConnection = { host: connection.host };
  const adminAuth = await authorize_admin_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      display_name: RandomGenerator.name(),
    } satisfies IRedditCommunityAdmin.IJoin,
  });
  typia.assert(adminAuth);
  // 2. Register member account
  const memberConnection: api.IConnection = { host: connection.host };
  const memberAuth = await authorize_member_join(memberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      username: RandomGenerator.name(2),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string>() satisfies string & tags.Format<"uri">,
    } satisfies IRedditCommunityMember.IJoin,
  });
  typia.assert(memberAuth);
  // 3. Create a community for the post (using generated random summary)
  const community = typia.random<IRedditCommunityCommunity.ISummary>();
  // 4. Member creates a post
  const post = await generate_random_reddit_community_member_posts_create(
    memberConnection,
    {
      body: {
        title: RandomGenerator.paragraph({ sentences: 2 }),
        post_type: "text",
        reddit_community_community_id: community.id,
        text_content: RandomGenerator.paragraph({ sentences: 3 }),
      } satisfies IRedditCommunityPost.ICreate,
    },
  );
  typia.assert(post);
  // 5. Member creates a comment on the post
  const comment =
    await generate_random_reddit_community_member_posts_comments_create(
      memberConnection,
      {
        body: {
          content: RandomGenerator.paragraph({ sentences: 2 }),
        } satisfies IRedditCommunityComment.ICreate,
        params: {
          postId: post.id,
        },
      },
    );
  typia.assert(comment);
  // Store comment data before approval for validation
  const originalCommentId = comment.id;
  const originalCommentCreatedAt = comment.created_at;
  TestValidator.equals(
    "comment should not be deleted before report approval",
    comment.deleted_at === null,
    true,
  );
  // 6. Member submits a report for the comment
  const reportReason =
    "This comment violates community guidelines by spamming irrelevant content";
  const report =
    await generate_random_reddit_community_member_posts_comments_reports_create(
      memberConnection,
      {
        body: {
          reason: reportReason,
        } satisfies IRedditCommunityCommentReport.ICreate,
        params: {
          postId: post.id,
          commentId: comment.id,
        },
      },
    );
  typia.assert(report);
  // Initial report should have pending status
  TestValidator.equals(
    "report status should be pending initially",
    report.status,
    "pending",
  );
  // Store report data before approval for validation
  const originalReportId = report.id;
  const originalReportCreatedAt = report.created_at;
  const originalReporterId = report.reporter.id;
  // 7. Admin approves the report
  const approveResult =
    await api.functional.redditCommunity.admin.reports.approve(
      adminConnection,
      {
        reportId: originalReportId,
      },
    );
  typia.assert(approveResult);
  // 8. Verify the reported comment is now soft-deleted
  // Since we don't have direct GET endpoint, verify through targetComment reference
  TestValidator.equals(
    "report should target a comment",
    approveResult.targetComment !== null,
    true,
  );
  // Validate that targetComment deleted_at is set (soft-deleted)
  if (approveResult.targetComment) {
    TestValidator.equals(
      "comment should be soft-deleted after report approval",
      approveResult.targetComment.deleted_at !== null,
      true,
    );
  }
  // 10. Verify the report updated_at reflects the approval timestamp
  TestValidator.predicate(
    "report updated_at should reflect approval time",
    () => approveResult.updated_at >= originalReportCreatedAt,
  );
  // 11. Validate report correctly targets comment instead of post
  TestValidator.equals(
    "report should not target a post when commenting report",
    approveResult.targetPost,
    null,
  );
  TestValidator.predicate(
    "report should target a comment",
    () => approveResult.targetComment !== null,
  );
  // 12. Validate reporter information is preserved in approved report
  TestValidator.equals(
    "reporter should be preserved in approved report",
    approveResult.reporter.id,
    originalReporterId,
  );
  // 13. Validate reason is preserved in approved report
  TestValidator.equals(
    "report reason should be preserved",
    approveResult.reason,
    reportReason,
  );
  // 14. Verify report community is preserved
  TestValidator.equals(
    "report community should be preserved",
    approveResult.community.id,
    community.id,
  );
  // 15. Verify report was created from the correct post's comment
  TestValidator.equals(
    "target comment should match original comment",
    approveResult.targetComment?.id,
    originalCommentId,
  );
}
