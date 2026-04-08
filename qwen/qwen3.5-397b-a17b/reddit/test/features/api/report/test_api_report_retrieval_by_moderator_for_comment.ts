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
import { generate_random_reddit_community_member_posts_comments_create } from "../../../generate/generate_random_reddit_community_member_posts_comments_create";
import { generate_random_reddit_community_member_reports_create } from "../../../generate/generate_random_reddit_community_member_reports_create";
import { generate_random_reddit_community_posts_create } from "../../../generate/generate_random_reddit_community_posts_create";
import { prepare_random_reddit_community_comment } from "../../../prepare/prepare_random_reddit_community_comment";
import { prepare_random_reddit_community_community } from "../../../prepare/prepare_random_reddit_community_community";
import { prepare_random_reddit_community_post } from "../../../prepare/prepare_random_reddit_community_post";
import { prepare_random_reddit_community_report } from "../../../prepare/prepare_random_reddit_community_report";
import { prepare_random_reddit_community_subscription } from "../../../prepare/prepare_random_reddit_community_subscription";

/**
 * Test moderator retrieval of a report filed against a comment in their community.
 *
 * Validates the complete report retrieval workflow including community setup, member authentication, comment creation, report filing, and moderator access to the report. Ensures that the report entity correctly represents the reported comment with all required metadata.
 *
 * The test verifies that community owners (who act as moderators) can access reports filed within their community, and that the report structure properly handles comment-type reported content with the polymorphic reportedContent field.
 *
 * 1. Community owner registers and creates a community.
 * 2. Reporter member registers with separate credentials.
 * 3. Reporter subscribes to the community to gain posting privileges.
 * 4. Reporter creates a post in the community.
 * 5. Reporter creates a comment on their own post.
 * 6. Reporter files a report against the comment with a valid reason.
 * 7. Community owner retrieves the report by ID and validates all fields.
 */
export async function test_api_report_retrieval_by_moderator_for_comment(
  connection: api.IConnection,
): Promise<void> {
  // 1. Community owner setup - create community
  const ownerConnection: api.IConnection = { host: connection.host };
  const ownerAuth = await authorize_member_join(ownerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      username: RandomGenerator.name(1),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    } satisfies IRedditCommunityMember.IJoin,
  });
  typia.assert(ownerAuth);
  const community =
    await generate_random_reddit_community_member_communities_create(
      ownerConnection,
      {
        body: {
          name: RandomGenerator.name(2),
          description: RandomGenerator.paragraph({ sentences: 2 }),
          icon: typia.random<string & tags.Format<"uri">>(),
        } satisfies IRedditCommunityCommunity.ICreate,
      },
    );
  typia.assert(community);
  // 2. Reporter member setup - register different member
  const reporterConnection: api.IConnection = { host: connection.host };
  const reporterAuth = await authorize_member_join(reporterConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      username: RandomGenerator.name(1),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    } satisfies IRedditCommunityMember.IJoin,
  });
  typia.assert(reporterAuth);
  // 3. Reporter subscribes to community
  const subscription =
    await generate_random_reddit_community_member_member_subscriptions_create(
      reporterConnection,
      {
        body: {
          community_id: community.id,
        } satisfies IRedditCommunitySubscription.ICreate,
      },
    );
  typia.assert(subscription);
  // 4. Reporter creates a post in the community
  const post = await generate_random_reddit_community_posts_create(
    reporterConnection,
    {
      body: {
        title: RandomGenerator.paragraph({ sentences: 2 }),
        post_type: "text",
        community_id: community.id,
        body: RandomGenerator.content({ paragraphs: 2 }),
      } satisfies IRedditCommunityPost.ICreate,
    },
  );
  typia.assert(post);
  // 5. Reporter creates a comment on their post
  const comment =
    await generate_random_reddit_community_member_posts_comments_create(
      reporterConnection,
      {
        params: {
          postId: post.id,
        },
        body: {
          content: RandomGenerator.paragraph({ sentences: 3 }),
        } satisfies IRedditCommunityComment.ICreate,
      },
    );
  typia.assert(comment);
  // 6. Reporter files a report against the comment
  const reasonText =
    "This comment violates community guidelines by containing inappropriate content.";
  const report = await generate_random_reddit_community_member_reports_create(
    reporterConnection,
    {
      body: {
        report_type: "comment",
        target_id: comment.id,
        reason: reasonText,
      } satisfies IRedditCommunityReport.ICreate,
    },
  );
  typia.assert(report);
  // 7. Community owner (moderator) retrieves the report by ID
  const retrievedReport =
    await api.functional.redditCommunity.member.reports.at(ownerConnection, {
      reportId: report.id,
    });
  typia.assert(retrievedReport);
  // Validate report structure and content
  TestValidator.equals("report ID matches", retrievedReport.id, report.id);
  TestValidator.equals(
    "report type is comment",
    retrievedReport.report_type,
    "comment",
  );
  TestValidator.equals(
    "reason matches submitted text",
    retrievedReport.reason,
    reasonText,
  );
  TestValidator.equals("status is pending", retrievedReport.status, "pending");
  TestValidator.equals(
    "reporter ID matches",
    retrievedReport.reporter.id,
    reporterAuth.id,
  );
  TestValidator.predicate(
    "resolvedBy is null",
    retrievedReport.resolvedBy === null,
  );
  TestValidator.predicate(
    "resolved_at is null or undefined",
    retrievedReport.resolved_at == null,
  );
  // Validate reported content is a comment with required fields
  const reportedComment =
    retrievedReport.reportedContent as IRedditCommunityComment.ISummary;
  TestValidator.equals(
    "reported content ID matches comment",
    reportedComment.id,
    comment.id,
  );
  TestValidator.equals(
    "reported content matches original",
    reportedComment.content,
    comment.content,
  );
  TestValidator.equals(
    "post reference matches",
    reportedComment.post.id,
    post.id,
  );
}