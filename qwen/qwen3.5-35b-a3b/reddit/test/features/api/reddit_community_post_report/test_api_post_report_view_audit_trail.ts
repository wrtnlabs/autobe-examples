import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IRedditCommunityAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityAdmin";
import type { IRedditCommunityComment } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityComment";
import type { IRedditCommunityCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityCommunity";
import type { IRedditCommunityMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityMember";
import type { IRedditCommunityPost } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityPost";
import type { IRedditCommunityPostFile } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityPostFile";
import type { IRedditCommunityPostReport } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityPostReport";
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
import { generate_random_reddit_community_member_posts_create } from "../../../generate/generate_random_reddit_community_member_posts_create";
import { generate_random_reddit_community_member_posts_reports_create } from "../../../generate/generate_random_reddit_community_member_posts_reports_create";
import { prepare_random_reddit_community_post } from "../../../prepare/prepare_random_reddit_community_post";
import { prepare_random_reddit_community_post_file } from "../../../prepare/prepare_random_reddit_community_post_file";
import { prepare_random_reddit_community_report } from "../../../prepare/prepare_random_reddit_community_report";

export async function test_api_post_report_view_audit_trail(
  connection: api.IConnection,
): Promise<void> {
  // 1. Setup: Admin user who will moderate reports
  const adminConnection: api.IConnection = { host: connection.host };
  const adminAuth = await authorize_admin_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>() satisfies string,
      password: RandomGenerator.alphaNumeric(16),
    },
  });
  typia.assert(adminAuth);
  // 2. Setup: Member user who will create post and submit report
  const memberConnection: api.IConnection = { host: connection.host };
  const memberAuth = await authorize_member_join(memberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>() satisfies string,
      password: RandomGenerator.alphaNumeric(16),
      username: RandomGenerator.name(),
      href: typia.random<string & tags.Format<"uri">>() satisfies string,
      referrer: typia.random<string & tags.Format<"uri">>() satisfies string,
    },
  });
  typia.assert(memberAuth);
  // 3. Create a community for the post
  const communityName = RandomGenerator.name(2);
  const communityConnection: api.IConnection = { host: connection.host };
  // Community creation would need a separate endpoint, using memberConnection for post creation
  // 4. Member creates a post in the community
  const post = await generate_random_reddit_community_member_posts_create(
    memberConnection,
    {
      body: {
        title: RandomGenerator.paragraph({
          sentences: 2,
          wordMin: 3,
          wordMax: 5,
        }),
        post_type: "text" as const,
        text_content: RandomGenerator.paragraph({
          sentences: 5,
          wordMin: 5,
          wordMax: 10,
        }),
        reddit_community_community_id: typia.random<
          string & tags.Format<"uuid">
        >() satisfies string,
      },
    },
  );
  typia.assert(post);
  // 5. Member submits a report on the post
  const report =
    await generate_random_reddit_community_member_posts_reports_create(
      memberConnection,
      {
        body: {
          reason: RandomGenerator.paragraph({
            sentences: 3,
            wordMin: 4,
            wordMax: 8,
          }),
        },
        params: {
          postId: post.id,
        },
      },
    );
  typia.assert(report);
  const reportId = report.id;
  const postId = post.id;
  // 6. Admin approves the report (this deletes the post and marks report as resolved)
  const reportAfterApprove =
    await api.functional.redditCommunity.admin.reports.approve(
      adminConnection,
      {
        reportId: reportId,
      },
    );
  typia.assert(reportAfterApprove);
  // 7. Admin retrieves the report to verify audit trail (even though post is deleted)
  const retrievedReport =
    await api.functional.redditCommunity.admin.posts.reports.at(
      adminConnection,
      {
        postId: postId,
        reportId: reportId,
      },
    );
  typia.assert(retrievedReport);
  // 8. Validation: Verify report is still accessible with complete data
  TestValidator.equals("report ID", retrievedReport.id, reportId);
  TestValidator.equals("post ID", retrievedReport.post.id, postId);
  TestValidator.equals("report reason", retrievedReport.reason, report.reason);
  TestValidator.equals(
    "reporter username",
    retrievedReport.reporter.username,
    memberAuth.username,
  );
  // 9. Validation: Verify post is soft-deleted (deleted_at is not null)
  TestValidator.predicate(
    "post is soft-deleted",
    retrievedReport.post.deleted_at !== null,
  );
  // 10. Validation: Verify report status is approved/reviewed
  TestValidator.predicate(
    "report status is approved or reviewed",
    retrievedReport.status === "approved" ||
      retrievedReport.status === "reviewed",
  );
  // 11. Validation: Verify timestamps are preserved
  TestValidator.equals(
    "report created at preserved",
    retrievedReport.created_at,
    report.created_at,
  );
}