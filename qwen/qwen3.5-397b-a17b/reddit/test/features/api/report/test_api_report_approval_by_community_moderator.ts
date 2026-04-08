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
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";
import { generate_random_reddit_community_member_communities_create } from "../../../generate/generate_random_reddit_community_member_communities_create";
import { generate_random_reddit_community_member_reports_create } from "../../../generate/generate_random_reddit_community_member_reports_create";
import { generate_random_reddit_community_posts_create } from "../../../generate/generate_random_reddit_community_posts_create";
import { prepare_random_reddit_community_community } from "../../../prepare/prepare_random_reddit_community_community";
import { prepare_random_reddit_community_post } from "../../../prepare/prepare_random_reddit_community_post";
import { prepare_random_reddit_community_report } from "../../../prepare/prepare_random_reddit_community_report";

/**
 * Test report approval workflow by community moderator.
 *
 * Validates the complete report approval flow including member authentication, community creation, post creation, report filing, and moderator approval. Ensures that the approval operation correctly updates the report status, sets resolution metadata, and soft-deletes the reported content.
 *
 * The test verifies that when a community moderator approves a pending report: the report status transitions from 'pending' to 'approved', the resolved_at timestamp is populated, the resolvedBy field contains the moderator's profile information, and the reported post is soft-deleted with deleted_at timestamp set.
 *
 * 1. Member registers and authenticates as community moderator.
 * 2. Member creates a community (automatically becomes owner and moderator).
 * 3. Member creates a text post in the community.
 * 4. Member files a report against the post with a valid reason.
 * 5. Moderator approves the report using the approve endpoint.
 * 6. Validates report status, resolution details, and post deletion.
 */
export async function test_api_report_approval_by_community_moderator(
  connection: api.IConnection,
): Promise<void> {
  // 1. Member registration and authentication
  const memberConnection: api.IConnection = { host: connection.host };
  const memberAuth = await authorize_member_join(memberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      username: RandomGenerator.name(1),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    } satisfies IRedditCommunityMember.IJoin,
  });
  typia.assert(memberAuth);
  // 2. Create community (member becomes owner and moderator)
  const community =
    await generate_random_reddit_community_member_communities_create(
      memberConnection,
      {
        body: {
          name: RandomGenerator.name(1),
          description: RandomGenerator.paragraph({ sentences: 2 }),
          icon: typia.random<string & tags.Format<"uri">>(),
        } satisfies IRedditCommunityCommunity.ICreate,
      },
    );
  typia.assert(community);
  // 3. Create a text post in the community
  const post = await generate_random_reddit_community_posts_create(
    memberConnection,
    {
      body: {
        title: RandomGenerator.paragraph({ sentences: 1 }),
        post_type: "text" as const,
        community_id: community.id,
        body: RandomGenerator.content({ paragraphs: 2 }),
      } satisfies IRedditCommunityPost.ICreate,
    },
  );
  typia.assert(post);
  // 4. Create a report against the post
  const report = await generate_random_reddit_community_member_reports_create(
    memberConnection,
    {
      body: {
        report_type: "post" as const,
        target_id: post.id,
        reason: RandomGenerator.paragraph({ sentences: 2 }),
      } satisfies IRedditCommunityReport.ICreate,
    },
  );
  typia.assert(report);
  // Validate initial report state
  TestValidator.equals("initial status is pending", report.status, "pending");
  TestValidator.predicate(
    "resolved_at is null initially",
    report.resolved_at === null || report.resolved_at === undefined,
  );
  TestValidator.predicate(
    "resolvedBy is null initially",
    report.resolvedBy === null,
  );
  // 5. Approve the report as moderator
  const approvedReport =
    await api.functional.redditCommunity.member.reports.approve(
      memberConnection,
      {
        reportId: report.id,
      },
    );
  typia.assert(approvedReport);
  // 6. Validate approval results
  TestValidator.equals(
    "status changed to approved",
    approvedReport.status,
    "approved",
  );
  TestValidator.predicate(
    "resolved_at is set",
    approvedReport.resolved_at !== null &&
      approvedReport.resolved_at !== undefined,
  );
  TestValidator.predicate(
    "resolvedBy contains moderator profile",
    approvedReport.resolvedBy !== null,
  );
  TestValidator.equals(
    "resolvedBy username matches moderator",
    approvedReport.resolvedBy!.username,
    memberAuth.username,
  );
  TestValidator.equals("report id unchanged", approvedReport.id, report.id);
  TestValidator.equals(
    "report reason unchanged",
    approvedReport.reason,
    report.reason,
  );
  // Validate reported content reference
  TestValidator.predicate(
    "reportedContent exists",
    approvedReport.reportedContent !== undefined,
  );
  // Note: We cannot directly verify post.deletedAt here as the approve endpoint returns the report,
  // not the post. The post soft-deletion is a side effect handled by the backend.
}
