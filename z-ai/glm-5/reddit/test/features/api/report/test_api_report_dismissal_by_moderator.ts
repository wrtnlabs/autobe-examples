import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformComment } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformComment";
import type { ICommunityPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunity";
import type { ICommunityPlatformCommunityModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunityModerator";
import type { ICommunityPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMember";
import type { ICommunityPlatformPost } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformPost";
import type { ICommunityPlatformReport } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformReport";
import type { ICommunityPlatformSubscription } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformSubscription";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";
import { generate_random_community_platform_member_communities_create } from "../../../generate/generate_random_community_platform_member_communities_create";
import { generate_random_community_platform_member_communities_moderators_add_moderator } from "../../../generate/generate_random_community_platform_member_communities_moderators_add_moderator";
import { generate_random_community_platform_member_posts_create } from "../../../generate/generate_random_community_platform_member_posts_create";
import { generate_random_community_platform_member_reports_create } from "../../../generate/generate_random_community_platform_member_reports_create";
import { generate_random_community_platform_member_subscriptions_create } from "../../../generate/generate_random_community_platform_member_subscriptions_create";
import { prepare_random_community_platform_community } from "../../../prepare/prepare_random_community_platform_community";
import { prepare_random_community_platform_community_moderator } from "../../../prepare/prepare_random_community_platform_community_moderator";
import { prepare_random_community_platform_post } from "../../../prepare/prepare_random_community_platform_post";
import { prepare_random_community_platform_report } from "../../../prepare/prepare_random_community_platform_report";
import { prepare_random_community_platform_subscription } from "../../../prepare/prepare_random_community_platform_subscription";

export async function test_api_report_dismissal_by_moderator(
  connection: api.IConnection,
): Promise<void> {
  // ============================================================
  // Setup Phase: Create community, post, moderator, and report
  // ============================================================
  // 1. Member A: Community owner
  const ownerConnection: api.IConnection = { host: connection.host };
  const owner = await authorize_member_join(ownerConnection, {});
  typia.assert(owner);
  // Create community
  const community =
    await generate_random_community_platform_member_communities_create(
      ownerConnection,
      {
        body: {
          name: RandomGenerator.alphaNumeric(8),
          description: RandomGenerator.paragraph({ sentences: 3 }),
        },
      },
    );
  typia.assert(community);
  // 2. Member B: Post author
  const authorConnection: api.IConnection = { host: connection.host };
  const author = await authorize_member_join(authorConnection, {});
  typia.assert(author);
  // Subscribe to community
  await generate_random_community_platform_member_subscriptions_create(
    authorConnection,
    {
      body: {
        community_id: community.id,
      },
    },
  );
  // Create a text post
  const post = await generate_random_community_platform_member_posts_create(
    authorConnection,
    {
      body: {
        communityId: community.id,
        title: RandomGenerator.paragraph({ sentences: 2 }),
        contentType: "text",
        textContent: RandomGenerator.content({ paragraphs: 2 }),
        linkUrl: null,
        imageUrl: null,
      },
    },
  );
  typia.assert(post);
  // 3. Member C: Moderator
  const moderatorConnection: api.IConnection = { host: connection.host };
  const moderator = await authorize_member_join(moderatorConnection, {});
  typia.assert(moderator);
  // Owner appoints Member C as moderator
  const moderatorRecord =
    await generate_random_community_platform_member_communities_moderators_add_moderator(
      ownerConnection,
      {
        params: {
          communityName: community.name,
        },
        body: {
          username: moderator.username,
        },
      },
    );
  typia.assert(moderatorRecord);
  // 4. Member D: Reporter
  const reporterConnection: api.IConnection = { host: connection.host };
  const reporter = await authorize_member_join(reporterConnection, {});
  typia.assert(reporter);
  // Create a pending report on the post
  const report = await generate_random_community_platform_member_reports_create(
    reporterConnection,
    {
      body: {
        reason: RandomGenerator.paragraph({ sentences: 5 }),
        communityId: community.id,
        postId: post.id,
        commentId: undefined,
      },
    },
  );
  typia.assert(report);
  // Verify initial report status is pending
  TestValidator.equals(
    "initial report status is pending",
    report.status,
    "pending",
  );
  // Store original timestamps and reason for validation
  const originalUpdatedAt = report.updated_at;
  const originalReason = report.reason;
  // ============================================================
  // Test Execution: Moderator dismisses the report
  // ============================================================
  // Moderator dismisses the report
  const dismissedReport =
    await api.functional.communityPlatform.member.reports.dismiss(
      moderatorConnection,
      {
        reportId: report.id,
      },
    );
  typia.assert(dismissedReport);
  // ============================================================
  // Post-Dismissal Validation
  // ============================================================
  // Verify report status has transitioned to 'dismissed'
  TestValidator.equals(
    "report status is dismissed",
    dismissedReport.status,
    "dismissed",
  );
  // Verify updated_at timestamp has been updated
  TestValidator.predicate(
    "updated_at has been updated",
    new Date(dismissedReport.updated_at).getTime() >=
      new Date(originalUpdatedAt).getTime(),
  );
  // Verify the report ID remains the same
  TestValidator.equals(
    "report ID remains the same",
    dismissedReport.id,
    report.id,
  );
  // Verify the reason is preserved for audit trail
  TestValidator.equals(
    "reason is preserved for audit",
    dismissedReport.reason,
    originalReason,
  );
  // Verify the reported content is still accessible (not deleted)
  TestValidator.equals(
    "reported post ID is preserved",
    dismissedReport.content.id,
    post.id,
  );
  // Verify the post is still visible (deleted_at is null)
  if ("deleted_at" in dismissedReport.content) {
    TestValidator.equals(
      "post is not deleted",
      dismissedReport.content.deleted_at,
      null,
    );
  }
  // Verify content type is 'post'
  TestValidator.equals(
    "content type is post",
    dismissedReport.content_type,
    "post",
  );
  // Verify the community is correctly associated
  TestValidator.equals(
    "community ID matches",
    dismissedReport.community.id,
    community.id,
  );
  // Verify the reporter is correctly associated
  TestValidator.equals(
    "reporter ID matches",
    dismissedReport.reporter.id,
    reporter.member.id,
  );
}
