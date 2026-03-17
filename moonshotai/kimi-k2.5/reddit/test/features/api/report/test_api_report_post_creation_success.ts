import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IRedditLikeAttachment } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikeAttachment";
import type { IRedditLikeComment } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikeComment";
import type { IRedditLikeCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikeCommunity";
import type { IRedditLikeCommunitySubscription } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikeCommunitySubscription";
import type { IRedditLikeMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikeMember";
import type { IRedditLikePost } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikePost";
import type { IRedditLikePostImageContent } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikePostImageContent";
import type { IRedditLikePostLinkContent } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikePostLinkContent";
import type { IRedditLikePostTextContent } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikePostTextContent";
import type { IRedditLikeReport } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikeReport";
import type { IRedditLikeReportSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikeReportSnapshot";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";
import { generate_random_reddit_like_member_communities_create } from "../../../generate/generate_random_reddit_like_member_communities_create";
import { generate_random_reddit_like_member_posts_create } from "../../../generate/generate_random_reddit_like_member_posts_create";
import { generate_random_reddit_like_member_reports_create } from "../../../generate/generate_random_reddit_like_member_reports_create";
import { prepare_random_reddit_like_community } from "../../../prepare/prepare_random_reddit_like_community";
import { prepare_random_reddit_like_post } from "../../../prepare/prepare_random_reddit_like_post";
import { prepare_random_reddit_like_report } from "../../../prepare/prepare_random_reddit_like_report";

/**
 * Test successful creation of a post report by an authenticated member.
 *
 * Validates that a member can report a post for violating community guidelines,
 * and the report is created with pending status containing correct reporter
 * information extracted from the JWT token, community context, and post reference.
 */
export async function test_api_report_post_creation_success(
  connection: api.IConnection,
): Promise<void> {
  // Setup post author
  const authorConnection: api.IConnection = { host: connection.host };
  const author = await authorize_member_join(authorConnection, {});
  typia.assert(author);
  // Create community as author
  const community = await generate_random_reddit_like_member_communities_create(
    authorConnection,
    {},
  );
  typia.assert(community);
  // Subscribe author to community to enable post creation
  await api.functional.redditLike.member.communities.subscriptions.create(
    authorConnection,
    {
      communityId: community.id,
    },
  );
  // Create a post that will be reported
  const post = await generate_random_reddit_like_member_posts_create(
    authorConnection,
    {
      body: {
        community_id: community.id,
      },
    },
  );
  typia.assert(post);
  // Setup reporter member
  const reporterConnection: api.IConnection = { host: connection.host };
  const reporter = await authorize_member_join(reporterConnection, {});
  typia.assert(reporter);
  // Subscribe reporter to community
  await api.functional.redditLike.member.communities.subscriptions.create(
    reporterConnection,
    {
      communityId: community.id,
    },
  );
  // Create report for the post
  const reportReason =
    "This post violates community guidelines by containing inappropriate content";
  const report = await generate_random_reddit_like_member_reports_create(
    reporterConnection,
    {
      body: {
        communityId: community.id,
        postId: post.id,
        commentId: null,
        reason: reportReason,
      },
    },
  );
  typia.assert(report);
  // Validate report properties
  TestValidator.equals("report status is pending", report.status, "pending");
  TestValidator.equals(
    "report reason matches input",
    report.reason,
    reportReason,
  );
  TestValidator.equals(
    "report community matches target",
    report.community.id,
    community.id,
  );
  TestValidator.equals(
    "reported content is the post",
    report.content.id,
    post.id,
  );
  TestValidator.equals(
    "reporter is authenticated member",
    report.reporter.id,
    reporter.id,
  );
  TestValidator.predicate(
    "report has creation timestamp",
    report.createdAt !== null && report.createdAt !== undefined,
  );
}
