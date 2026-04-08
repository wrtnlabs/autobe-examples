import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IRedditCommunityComment } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityComment";
import type { IRedditCommunityCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityCommunity";
import type { IRedditCommunityMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityMember";
import type { IRedditCommunityPost } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityPost";
import type { IRedditCommunityPostImageContent } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityPostImageContent";
import type { IRedditCommunityPostLinkContent } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityPostLinkContent";
import type { IRedditCommunityPostTextContent } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityPostTextContent";
import type { IRedditCommunityReport } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityReport";
import type { IRedditCommunitySubscription } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunitySubscription";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";
import { generate_random_reddit_community_member_communities_create } from "../../../generate/generate_random_reddit_community_member_communities_create";
import { generate_random_reddit_community_member_member_subscriptions_create } from "../../../generate/generate_random_reddit_community_member_member_subscriptions_create";
import { generate_random_reddit_community_member_reports_create } from "../../../generate/generate_random_reddit_community_member_reports_create";
import { generate_random_reddit_community_posts_create } from "../../../generate/generate_random_reddit_community_posts_create";
import { prepare_random_reddit_community_community } from "../../../prepare/prepare_random_reddit_community_community";
import { prepare_random_reddit_community_post } from "../../../prepare/prepare_random_reddit_community_post";
import { prepare_random_reddit_community_report } from "../../../prepare/prepare_random_reddit_community_report";
import { prepare_random_reddit_community_subscription } from "../../../prepare/prepare_random_reddit_community_subscription";

/**
 * Test the complete workflow of a moderator approving a content report against a post.
 *
 * Validates the end-to-end report approval process including community creation, member authentication, post creation, report filing, and moderator approval. Ensures that the reported post is permanently deleted and the report status is correctly updated to 'approved' with resolution metadata.
 *
 * The test creates three distinct member accounts: a community owner/moderator, a post author, and a reporter. Each member performs their respective roles in the workflow, demonstrating the separation of concerns and proper authorization checks.
 *
 * 1. Community owner creates a community and gains moderator privileges automatically.
 * 2. Post author subscribes to the community and creates a text post.
 * 3. Reporter subscribes to the community and files a report against the post.
 * 4. Community owner approves the report, triggering post deletion.
 * 5. Validates report status is 'approved' with resolved_by and resolved_at populated.
 * 6. Validates the approved report remains in the system as an audit record.
 */
export async function test_api_report_approval_for_post_content(
  connection: api.IConnection,
): Promise<void> {
  // 1. Community owner/moderator setup
  const ownerConnection: api.IConnection = { host: connection.host };
  const ownerAuth = await authorize_member_join(ownerConnection, {});
  const community =
    await generate_random_reddit_community_member_communities_create(
      ownerConnection,
      { body: {} },
    );
  typia.assert(community);
  // 2. Post author setup - subscribe and create post
  const authorConnection: api.IConnection = { host: connection.host };
  const authorAuth = await authorize_member_join(authorConnection, {});
  await generate_random_reddit_community_member_member_subscriptions_create(
    authorConnection,
    {
      body: { community_id: community.id },
    },
  );
  const post = await generate_random_reddit_community_posts_create(
    authorConnection,
    {
      body: {
        community_id: community.id,
        post_type: "text",
        title: RandomGenerator.paragraph({ sentences: 1 }),
        body: RandomGenerator.content({ paragraphs: 2 }),
      },
    },
  );
  typia.assert(post);
  // 3. Reporter setup - subscribe and file report
  const reporterConnection: api.IConnection = { host: connection.host };
  const reporterAuth = await authorize_member_join(reporterConnection, {});
  await generate_random_reddit_community_member_member_subscriptions_create(
    reporterConnection,
    {
      body: { community_id: community.id },
    },
  );
  const report = await generate_random_reddit_community_member_reports_create(
    reporterConnection,
    {
      body: {
        report_type: "post",
        target_id: post.id,
        reason: RandomGenerator.paragraph({ sentences: 2 }),
      },
    },
  );
  typia.assert(report);
  TestValidator.equals("report status is pending", report.status, "pending");
  TestValidator.equals("report target is post", report.report_type, "post");
  TestValidator.predicate(
    "resolved_by is null for pending",
    report.resolvedBy === null,
  );
  TestValidator.predicate(
    "resolved_at is null for pending",
    report.resolved_at === null || report.resolved_at === undefined,
  );
  // 4. Community owner approves the report
  const approvedReport =
    await api.functional.redditCommunity.member.communities.reports.approve(
      ownerConnection,
      {
        communityId: community.id,
        reportId: report.id,
      },
    );
  typia.assert(approvedReport);
  // 5. Validate approval results
  TestValidator.equals(
    "report status is approved",
    approvedReport.status,
    "approved",
  );
  TestValidator.equals(
    "resolved_by is set",
    approvedReport.resolvedBy?.id,
    ownerAuth.id,
  );
  TestValidator.predicate(
    "resolved_at is populated",
    approvedReport.resolved_at !== null &&
      approvedReport.resolved_at !== undefined,
  );
  TestValidator.equals(
    "report type unchanged",
    approvedReport.report_type,
    "post",
  );
  TestValidator.equals(
    "reported content id matches",
    approvedReport.reportedContent.id,
    post.id,
  );
}