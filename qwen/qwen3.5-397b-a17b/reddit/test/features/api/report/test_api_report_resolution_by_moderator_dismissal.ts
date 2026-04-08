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
 * Test moderator dismissal of a content report keeps reported content visible.
 *
 * Validates the complete report resolution workflow where a community moderator dismisses a report filed against a comment. The test establishes a community with an owner/moderator, creates content (post and comment) by a subscribed member, files a report from another subscribed member, and then resolves the report as dismissed by the moderator.
 *
 * Key validations ensure the report status transitions correctly from 'pending' to 'dismissed', the moderator's identity is recorded in resolved_by, the resolution timestamp is populated in resolved_at, and the reported comment reference remains accessible in the resolved report.
 *
 * 1. Community owner/moderator account creation and authentication.
 * 2. Community creation with owner as moderator.
 * 3. Content author account creation and authentication.
 * 4. Content author subscribes to the community.
 * 5. Post creation in the community by content author.
 * 6. Comment creation on the post by content author.
 * 7. Reporter account creation and authentication.
 * 8. Reporter subscribes to the community.
 * 9. Report submission on the comment with valid reason.
 * 10. Moderator updates report status to 'dismissed'.
 * 11. Validates report status is 'dismissed'.
 * 12. Validates resolved_by contains moderator's member ID.
 * 13. Validates resolved_at timestamp is populated.
 * 14. Validates reported comment reference still exists in report.
 */
export async function test_api_report_resolution_by_moderator_dismissal(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create community owner/moderator
  const moderatorConnection: api.IConnection = { host: connection.host };
  const moderatorAuth = await authorize_member_join(moderatorConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      username: RandomGenerator.name(1),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    } satisfies IRedditCommunityMember.IJoin,
  });
  typia.assert(moderatorAuth);
  // 2. Create community
  const community =
    await generate_random_reddit_community_member_communities_create(
      moderatorConnection,
      {
        body: {
          name: RandomGenerator.name(1),
          description: RandomGenerator.paragraph({ sentences: 2 }),
          icon: typia.random<string & tags.Format<"uri">>(),
        } satisfies IRedditCommunityCommunity.ICreate,
      },
    );
  typia.assert(community);
  // 3. Create content author
  const authorConnection: api.IConnection = { host: connection.host };
  const authorAuth = await authorize_member_join(authorConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      username: RandomGenerator.name(1),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    } satisfies IRedditCommunityMember.IJoin,
  });
  typia.assert(authorAuth);
  // 4. Author subscribes to community
  const authorSubscription =
    await generate_random_reddit_community_member_member_subscriptions_create(
      authorConnection,
      {
        body: {
          community_id: community.id,
        } satisfies IRedditCommunitySubscription.ICreate,
      },
    );
  typia.assert(authorSubscription);
  // 5. Create post in community
  const post = await generate_random_reddit_community_posts_create(
    authorConnection,
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
  // 6. Create comment on post
  const comment =
    await generate_random_reddit_community_member_posts_comments_create(
      authorConnection,
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
  // 7. Create reporter
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
  // 8. Reporter subscribes to community
  const reporterSubscription =
    await generate_random_reddit_community_member_member_subscriptions_create(
      reporterConnection,
      {
        body: {
          community_id: community.id,
        } satisfies IRedditCommunitySubscription.ICreate,
      },
    );
  typia.assert(reporterSubscription);
  // 9. Submit report on comment
  const report = await generate_random_reddit_community_member_reports_create(
    reporterConnection,
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
    "reported content id",
    (report.reportedContent as IRedditCommunityComment.ISummary).id,
    comment.id,
  );
  // 10. Moderator dismisses the report
  const resolvedReport =
    await api.functional.redditCommunity.member.reports.update(
      moderatorConnection,
      {
        reportId: report.id,
        body: {
          status: "dismissed",
        } satisfies IRedditCommunityReport.IUpdate,
      },
    );
  typia.assert(resolvedReport);
  // 11. Validate report status changed to dismissed
  TestValidator.equals(
    "report status is dismissed",
    resolvedReport.status,
    "dismissed",
  );
  // 12. Validate resolved_by contains moderator's member ID
  TestValidator.equals(
    "resolved_by is moderator",
    resolvedReport.resolvedBy!.id,
    moderatorAuth.id,
  );
  // 13. Validate resolved_at timestamp is populated and valid
  TestValidator.predicate(
    "resolved_at is populated",
    resolvedReport.resolved_at !== null &&
      resolvedReport.resolved_at !== undefined,
  );
  TestValidator.predicate(
    "resolved_at is valid ISO date",
    !Number.isNaN(new Date(resolvedReport.resolved_at!).getTime()),
  );
  // 14. Validate reported comment reference still exists in resolved report
  const reportedCommentSummary =
    resolvedReport.reportedContent as IRedditCommunityComment.ISummary;
  TestValidator.equals(
    "comment id matches",
    reportedCommentSummary.id,
    comment.id,
  );
  TestValidator.equals(
    "comment author matches",
    reportedCommentSummary.author.id,
    authorAuth.id,
  );
  // Validate report metadata is preserved
  TestValidator.equals(
    "report type preserved",
    resolvedReport.report_type,
    "comment",
  );
  TestValidator.equals(
    "report reason preserved",
    resolvedReport.reason,
    report.reason,
  );
}
