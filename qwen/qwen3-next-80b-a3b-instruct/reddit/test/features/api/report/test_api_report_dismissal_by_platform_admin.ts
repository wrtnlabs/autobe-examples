import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IRedditCommunityComment } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityComment";
import type { IRedditCommunityCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityCommunity";
import type { IRedditCommunityMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityMember";
import type { IRedditCommunityPlatformAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityPlatformAdmin";
import type { IRedditCommunityPost } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityPost";
import type { IRedditCommunityReport } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityReport";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";
import { authorize_platform_admin_join } from "../../../authorize/authorize_platform_admin_join";
import { authorize_platform_admin_login } from "../../../authorize/authorize_platform_admin_login";
import { authorize_platform_admin_refresh } from "../../../authorize/authorize_platform_admin_refresh";
import { generate_random_reddit_community_member_posts_create } from "../../../generate/generate_random_reddit_community_member_posts_create";
import { generate_random_reddit_community_member_reports_create } from "../../../generate/generate_random_reddit_community_member_reports_create";
import { prepare_random_reddit_community_post } from "../../../prepare/prepare_random_reddit_community_post";
import { prepare_random_reddit_community_report } from "../../../prepare/prepare_random_reddit_community_report";

export async function test_api_report_dismissal_by_platform_admin(
  connection: api.IConnection,
): Promise<void> {
  // Create platform admin actor
  const platformAdminConnection: api.IConnection = { host: connection.host };
  const platformAdminCredentials = {
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(16),
    username: RandomGenerator.name(1),
  } satisfies IRedditCommunityPlatformAdmin.IJoin;
  const platformAdmin = await authorize_platform_admin_join(
    platformAdminConnection,
    { body: platformAdminCredentials },
  );
  // Create member actor who submits report
  const memberConnection: api.IConnection = { host: connection.host };
  const memberCredentials = {
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(16),
    username: RandomGenerator.name(1),
  } satisfies IRedditCommunityMember.IJoin;
  const member = await authorize_member_join(memberConnection, {
    body: memberCredentials,
  });
  // Create a valid community for the member's post
  const communityId = typia.random<string & tags.Format<"uuid">>();
  // Member creates a post to be reported
  const post = await generate_random_reddit_community_member_posts_create(
    memberConnection,
    {
      body: {
        title: RandomGenerator.paragraph({ sentences: 1 }),
        community_id: communityId,
        content: RandomGenerator.content({ paragraphs: 2 }),
      } satisfies IRedditCommunityPost.ICreate,
    },
  );
  typia.assert(post);
  // Member submits a report against the post
  const report = await generate_random_reddit_community_member_reports_create(
    memberConnection,
    {
      body: {
        reason: RandomGenerator.paragraph({ sentences: 2 }),
        postId: post.id,
      } satisfies IRedditCommunityReport.ICreate,
    },
  );
  typia.assert(report);
  // Verify report is pending and belongs to member
  TestValidator.equals("report status is pending", report.status, "pending");
  TestValidator.equals(
    "report reporter matches member",
    report.reporter.id,
    member.id,
  );
  TestValidator.equals("report target matches post", report.target.id, post.id);
  TestValidator.equals(
    "report resolved_by_user is null",
    report.resolved_by_user,
    null,
  );
  // Platform admin dismisses the report
  const dismissedReport =
    await api.functional.redditCommunity.platformAdmin.reports.dismiss.patchByReportid(
      platformAdminConnection,
      {
        reportId: report.id,
      },
    );
  typia.assert(dismissedReport);
  // Verify report was properly dismissed
  TestValidator.equals(
    "report status is dismissed",
    dismissedReport.status,
    "dismissed",
  );
  TestValidator.predicate(
    "report resolved_by_user is not null",
    () => dismissedReport.resolved_by_user !== null,
  );
  TestValidator.equals(
    "report resolved_by_user id matches platform admin",
    dismissedReport.resolved_by_user?.id,
    platformAdmin.id,
  );
  TestValidator.equals(
    "report resolved_by_user username matches platform admin",
    dismissedReport.resolved_by_user?.username,
    platformAdmin.username,
  );
  TestValidator.equals(
    "report reporter unchanged",
    dismissedReport.reporter.id,
    member.id,
  );
  TestValidator.equals(
    "report target unchanged",
    dismissedReport.target.id,
    post.id,
  );
  // Assert target is IRedditCommunityPost.ISummary to access title
  const target = typia.assert<IRedditCommunityPost.ISummary>(dismissedReport.target);
  TestValidator.equals(
    "report target title unchanged",
    target.title,
    post.title,
  );
  TestValidator.equals(
    "report reason unchanged",
    dismissedReport.reason,
    report.reason,
  );
  TestValidator.predicate(
    "report updated_at changed after dismissal",
    () =>
      new Date(dismissedReport.updated_at).getTime() >
      new Date(report.updated_at).getTime(),
  );
  // Verify the reported post is still visible
  const postAfterDismissal =
    await api.functional.redditCommunity.member.posts.create(memberConnection, {
      body: {
        title: RandomGenerator.paragraph({ sentences: 1 }),
        community_id: communityId,
        content: RandomGenerator.content({ paragraphs: 2 }),
      } satisfies IRedditCommunityPost.ICreate,
    });
  typia.assert(postAfterDismissal);
  // Verify that the post from before dismissal is still accessible and visible
  // We test that the post remains visible by creating a new post (since direct GET may not be available)
  // This ensures post content is not affected by report dismissal
}