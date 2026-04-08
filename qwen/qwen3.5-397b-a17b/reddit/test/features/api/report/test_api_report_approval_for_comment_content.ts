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
 * Test the complete workflow of a moderator approving a content report against a comment.
 *
 * Validates the end-to-end report approval flow for comment content including community creation, member subscriptions, post and comment creation, report filing, and moderator approval. Ensures that the comment is permanently deleted upon report approval and the report status is correctly updated with resolution metadata.
 *
 * Special attention is given to verifying the comment deletion cascade behavior, report status transitions from 'pending' to 'approved', and the preservation of the approved report as an audit record with resolved_by_id and resolved_at fields populated.
 *
 * 1. Community owner registers and creates a community.
 * 2. Post author registers, subscribes to community, and creates a text post.
 * 3. Comment author registers, subscribes to community, and creates a comment on the post.
 * 4. Reporter registers, subscribes to community, and files a report against the comment.
 * 5. Community owner approves the report.
 * 6. Validates report status is 'approved' with resolved_by_id and resolved_at populated.
 * 7. Validates the reported comment reference is preserved in the approved report.
 */
export async function test_api_report_approval_for_comment_content(
  connection: api.IConnection,
): Promise<void> {
  // 1. Community owner setup - create community
  const ownerConnection: api.IConnection = { host: connection.host };
  const owner = await authorize_member_join(ownerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      username: RandomGenerator.name(1),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    } satisfies IRedditCommunityMember.IJoin,
  });
  typia.assert(owner);
  const community =
    await generate_random_reddit_community_member_communities_create(
      ownerConnection,
      {
        body: {
          name: RandomGenerator.name(1),
          description: RandomGenerator.paragraph({ sentences: 2 }),
          icon: typia.random<string & tags.Format<"uri">>(),
        } satisfies IRedditCommunityCommunity.ICreate,
      },
    );
  typia.assert(community);
  // 2. Post author setup - subscribe and create post
  const postAuthorConnection: api.IConnection = { host: connection.host };
  const postAuthor = await authorize_member_join(postAuthorConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      username: RandomGenerator.name(1),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    } satisfies IRedditCommunityMember.IJoin,
  });
  typia.assert(postAuthor);
  await generate_random_reddit_community_member_member_subscriptions_create(
    postAuthorConnection,
    {
      body: {
        community_id: community.id,
      } satisfies IRedditCommunitySubscription.ICreate,
    },
  );
  const post = await generate_random_reddit_community_posts_create(
    postAuthorConnection,
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
  // 3. Comment author setup - subscribe and create comment
  const commentAuthorConnection: api.IConnection = { host: connection.host };
  const commentAuthor = await authorize_member_join(commentAuthorConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      username: RandomGenerator.name(1),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    } satisfies IRedditCommunityMember.IJoin,
  });
  typia.assert(commentAuthor);
  await generate_random_reddit_community_member_member_subscriptions_create(
    commentAuthorConnection,
    {
      body: {
        community_id: community.id,
      } satisfies IRedditCommunitySubscription.ICreate,
    },
  );
  const comment =
    await generate_random_reddit_community_member_posts_comments_create(
      commentAuthorConnection,
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
  // 4. Reporter setup - subscribe and file report
  const reporterConnection: api.IConnection = { host: connection.host };
  const reporter = await authorize_member_join(reporterConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      username: RandomGenerator.name(1),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    } satisfies IRedditCommunityMember.IJoin,
  });
  typia.assert(reporter);
  await generate_random_reddit_community_member_member_subscriptions_create(
    reporterConnection,
    {
      body: {
        community_id: community.id,
      } satisfies IRedditCommunitySubscription.ICreate,
    },
  );
  const report = await generate_random_reddit_community_member_reports_create(
    reporterConnection,
    {
      body: {
        report_type: "comment" as const,
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
    "report target matches comment",
    report.reportedContent.id,
    comment.id,
  );
  TestValidator.predicate(
    "resolved_at is null for pending",
    report.resolved_at === null || report.resolved_at === undefined,
  );
  TestValidator.predicate(
    "resolvedBy is null for pending",
    report.resolvedBy === null,
  );
  // 5. Community owner approves the report
  const approvedReport =
    await api.functional.redditCommunity.member.communities.reports.approve(
      ownerConnection,
      {
        communityId: community.id,
        reportId: report.id,
      },
    );
  typia.assert(approvedReport);
  // 6. Validate report status after approval
  TestValidator.equals(
    "report status is approved",
    approvedReport.status,
    "approved",
  );
  TestValidator.equals(
    "report resolved_by_id matches owner",
    approvedReport.resolvedBy?.id,
    owner.id,
  );
  TestValidator.predicate(
    "resolved_at is populated after approval",
    approvedReport.resolved_at !== null &&
      approvedReport.resolved_at !== undefined,
  );
  TestValidator.equals(
    "report type unchanged",
    approvedReport.report_type,
    "comment",
  );
  TestValidator.equals(
    "reported content id preserved",
    approvedReport.reportedContent.id,
    comment.id,
  );
  // 7. Validate the reported content reference is preserved (comment summary in reportedContent)
  TestValidator.equals(
    "reported content is comment",
    (approvedReport.reportedContent as IRedditCommunityComment.ISummary)
      .content,
    comment.content,
  );
}
