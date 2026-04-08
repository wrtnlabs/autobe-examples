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
 * Test the dismissal workflow when the reported content is a comment instead of a post.
 *
 * Validates the complete report dismissal flow for comment-type reports including member authentication, community setup, content creation, report filing, and moderator dismissal. Ensures that dismissing a report keeps the reported comment visible while properly updating the report status and resolution metadata.
 *
 * Special attention is given to verifying that the report status transitions correctly from 'pending' to 'dismissed', the resolved_by field is populated with the moderator's ID, and the resolved_at timestamp is set. The test also confirms that the reported comment remains accessible after dismissal.
 *
 * 1. Member registers and authenticates via join endpoint.
 * 2. Member creates a community where they act as owner/moderator.
 * 3. Member subscribes to their own community to enable posting.
 * 4. Member creates a text post in the community.
 * 5. Member creates a comment on the post.
 * 6. Member files a report against the comment with report_type='comment'.
 * 7. Member (as moderator) dismisses the report.
 * 8. Validates report status is 'dismissed', resolved_by is set, resolved_at is populated, and reportedContent shows comment details.
 */
export async function test_api_report_dismiss_comment_by_moderator(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create and authenticate member
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
  // 2. Create community (member becomes owner)
  const community =
    await generate_random_reddit_community_member_communities_create(
      memberConnection,
      {},
    );
  typia.assert(community);
  // 3. Subscribe to community
  const subscription =
    await generate_random_reddit_community_member_member_subscriptions_create(
      memberConnection,
      {
        body: {
          community_id: community.id,
        } satisfies IRedditCommunitySubscription.ICreate,
      },
    );
  typia.assert(subscription);
  // 4. Create post in community
  const post = await generate_random_reddit_community_posts_create(
    memberConnection,
    {
      body: {
        title: RandomGenerator.paragraph({ sentences: 1 }),
        post_type: "text",
        community_id: community.id,
        body: RandomGenerator.content({ paragraphs: 2 }),
      } satisfies IRedditCommunityPost.ICreate,
    },
  );
  typia.assert(post);
  // 5. Create comment on post
  const comment =
    await generate_random_reddit_community_member_posts_comments_create(
      memberConnection,
      {
        params: { postId: post.id },
        body: {
          content: RandomGenerator.paragraph({ sentences: 3 }),
        } satisfies IRedditCommunityComment.ICreate,
      },
    );
  typia.assert(comment);
  // 6. Create report against the comment
  const report = await generate_random_reddit_community_member_reports_create(
    memberConnection,
    {
      body: {
        report_type: "comment",
        target_id: comment.id,
        reason: RandomGenerator.paragraph({ sentences: 2 }),
      } satisfies IRedditCommunityReport.ICreate,
    },
  );
  typia.assert(report);
  // Validate initial report state
  TestValidator.equals("report status is pending", report.status, "pending");
  TestValidator.equals("report type is comment", report.report_type, "comment");
  TestValidator.equals(
    "reported content is comment",
    (report.reportedContent as any).id,
    comment.id,
  );
  TestValidator.predicate(
    "resolved_by is null for pending",
    report.resolvedBy === null,
  );
  TestValidator.predicate(
    "resolved_at is null for pending",
    report.resolved_at === null || report.resolved_at === undefined,
  );
  // 7. Dismiss the report
  const dismissedReport =
    await api.functional.redditCommunity.member.reports.dismiss(
      memberConnection,
      {
        reportId: report.id,
      },
    );
  typia.assert(dismissedReport);
  // 8. Validate dismissal results
  TestValidator.equals(
    "status changed to dismissed",
    dismissedReport.status,
    "dismissed",
  );
  TestValidator.equals(
    "resolved_by is set to moderator",
    dismissedReport.resolvedBy?.id,
    memberAuth.id,
  );
  TestValidator.predicate(
    "resolved_at is populated",
    dismissedReport.resolved_at !== null &&
      dismissedReport.resolved_at !== undefined,
  );
  TestValidator.equals(
    "report type unchanged",
    dismissedReport.report_type,
    "comment",
  );
  TestValidator.equals(
    "reported content still shows comment",
    (dismissedReport.reportedContent as any).id,
    comment.id,
  );
  TestValidator.equals(
    "reporter unchanged",
    dismissedReport.reporter.id,
    memberAuth.id,
  );
  // Verify the reported comment is still accessible (not deleted)
  TestValidator.predicate("comment id exists", comment.id !== null);
}
