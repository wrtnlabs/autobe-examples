import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IREdditLikeCommunityComment } from "@ORGANIZATION/PROJECT-api/lib/structures/IREdditLikeCommunityComment";
import type { IREdditLikeCommunityCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IREdditLikeCommunityCommunity";
import type { IREdditLikeCommunityMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IREdditLikeCommunityMember";
import type { IREdditLikeCommunityPost } from "@ORGANIZATION/PROJECT-api/lib/structures/IREdditLikeCommunityPost";
import type { IREdditLikeCommunityProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IREdditLikeCommunityProfile";
import type { IREdditLikeCommunityReport } from "@ORGANIZATION/PROJECT-api/lib/structures/IREdditLikeCommunityReport";
import type { IREdditLikeCommunityReportOnComment } from "@ORGANIZATION/PROJECT-api/lib/structures/IREdditLikeCommunityReportOnComment";
import type { IREdditLikeCommunityReportOnPost } from "@ORGANIZATION/PROJECT-api/lib/structures/IREdditLikeCommunityReportOnPost";
import type { IRedditLikeCommunityCommunitySubscription } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikeCommunityCommunitySubscription";
import type { IRedditLikeCommunityPostComment } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikeCommunityPostComment";
import type { IRedditLikeCommunityPostImage } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikeCommunityPostImage";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";
import { generate_random_reddit_like_community_member_communities_create } from "../../../generate/generate_random_reddit_like_community_member_communities_create";
import { generate_random_reddit_like_community_member_community_subscriptions_create } from "../../../generate/generate_random_reddit_like_community_member_community_subscriptions_create";
import { generate_random_reddit_like_community_member_posts_comments_create } from "../../../generate/generate_random_reddit_like_community_member_posts_comments_create";
import { generate_random_reddit_like_community_member_posts_create } from "../../../generate/generate_random_reddit_like_community_member_posts_create";
import { generate_random_reddit_like_community_member_reports_create } from "../../../generate/generate_random_reddit_like_community_member_reports_create";
import { prepare_random_reddit_like_community_community } from "../../../prepare/prepare_random_reddit_like_community_community";
import { prepare_random_reddit_like_community_community_subscription } from "../../../prepare/prepare_random_reddit_like_community_community_subscription";
import { prepare_random_reddit_like_community_post } from "../../../prepare/prepare_random_reddit_like_community_post";
import { prepare_random_reddit_like_community_post_comment } from "../../../prepare/prepare_random_reddit_like_community_post_comment";
import { prepare_random_reddit_like_community_report } from "../../../prepare/prepare_random_reddit_like_community_report";

/**
 * Test member comment reporting workflow within a subscribed community.
 *
 * Validates the complete comment report submission flow including member authentication, community subscription, post creation, comment creation, and comment reporting. Ensures that the report is correctly created with pending status, proper target type derivation, community scope extraction from the comment's parent post, and junction record association.
 *
 * Special attention is given to verifying that the reporter identity matches the authenticated member, the target_type is correctly derived as 'comment', and all resolution-related fields remain null upon initial submission.
 *
 * 1. Authenticate a new member to the platform.
 * 2. Create a community where content will be published.
 * 3. Subscribe the member to the community to gain posting privileges.
 * 4. Create a post within the community.
 * 5. Create a comment on the post.
 * 6. Report the comment with a text reason.
 * 7. Validate the report response: status is 'pending', target_type is 'comment', reporter matches authenticated member, community scope is correct, junction record exists, and resolution fields are null.
 */
export async function test_api_comment_report_submitted(
  connection: api.IConnection,
): Promise<void> {
  // 1. Authenticate member
  const memberConnection: api.IConnection = { host: connection.host };
  const memberCredentials: IREdditLikeCommunityMember.IJoin = {
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(16),
    username: RandomGenerator.name(1),
    href: typia.random<string & tags.Format<"uri">>(),
    referrer: typia.random<string & tags.Format<"uri">>(),
  } satisfies IREdditLikeCommunityMember.IJoin;
  const memberAuth = await authorize_member_join(memberConnection, {
    body: memberCredentials,
  });
  typia.assert(memberAuth);
  // 2. Create community
  const community =
    await api.functional.redditLikeCommunity.member.communities.create(
      memberConnection,
      {
        body: {
          name: RandomGenerator.paragraph({ sentences: 2 }),
          description: RandomGenerator.paragraph({ sentences: 3 }),
          icon_uri: null,
        } satisfies IREdditLikeCommunityCommunity.ICreate,
      },
    );
  typia.assert(community);
  // 3. Subscribe member to community
  const subscription =
    await api.functional.redditLikeCommunity.member.community_subscriptions.create(
      memberConnection,
      {
        body: {
          community_id: community.id,
        } satisfies IRedditLikeCommunityCommunitySubscription.ICreate,
      },
    );
  typia.assert(subscription);
  // 4. Create post in community
  const post = await api.functional.redditLikeCommunity.member.posts.create(
    memberConnection,
    {
      body: {
        title: RandomGenerator.paragraph({ sentences: 2 }),
        post_type: "text",
        community_id: community.id,
        body: RandomGenerator.paragraph({ sentences: 4 }),
      } satisfies IREdditLikeCommunityPost.ICreate,
    },
  );
  typia.assert(post);
  // 5. Create comment on post
  const comment =
    await api.functional.redditLikeCommunity.member.posts.comments.create(
      memberConnection,
      {
        postId: post.id,
        body: {
          body: RandomGenerator.paragraph({ sentences: 2 }),
        } satisfies IRedditLikeCommunityPostComment.ICreate,
      },
    );
  typia.assert(comment);
  // 6. Report the comment with a reason
  const reportReason = RandomGenerator.paragraph({ sentences: 2 });
  const report = await api.functional.redditLikeCommunity.member.reports.create(
    memberConnection,
    {
      body: {
        commentId: comment.id,
        reason: reportReason,
      } satisfies IREdditLikeCommunityReport.ICreate,
    },
  );
  typia.assert(report);
  // 7. Validate report response
  // Status should be pending for newly created reports
  TestValidator.equals("report status is pending", report.status, "pending");
  // Target type should be derived as 'comment'
  TestValidator.equals("target_type is comment", report.target_type, "comment");
  // Reporter identity should match the authenticated member
  TestValidator.equals(
    "reporter id matches authenticated member",
    report.reportedBy.id,
    memberAuth.id,
  );
  TestValidator.equals(
    "reporter username matches",
    report.reportedBy.username,
    memberAuth.username,
  );
  TestValidator.equals(
    "reporter email matches",
    report.reportedBy.email,
    memberCredentials.email,
  );
  // Community scope should be derived from comment's parent post community
  TestValidator.equals(
    "community scope matches post community",
    report.community.id,
    community.id,
  );
  TestValidator.equals(
    "community name matches",
    report.community.name,
    community.name,
  );
  // Report reason should match the input reason
  TestValidator.equals(
    "report reason matches input",
    report.reason,
    reportReason,
  );
  // Junction record should exist linking report to comment
  typia.assertGuard(report.reportOnComment!);
  TestValidator.equals(
    "junction comment id matches reported comment",
    report.reportOnComment.comment.id,
    comment.id,
  );
  TestValidator.equals(
    "junction comment content matches",
    report.reportOnComment.comment.content,
    comment.body,
  );
  TestValidator.equals(
    "junction report id matches main report",
    report.reportOnComment.report.id,
    report.id,
  );
  TestValidator.equals(
    "junction report reason matches",
    report.reportOnComment.report.reason,
    reportReason,
  );
  // onPost should be null since this is a comment report
  TestValidator.equals(
    "onPost is null for comment reports",
    report.onPost,
    null,
  );
  // Resolution fields should be null on initial submission
  TestValidator.equals(
    "resolvedBy is null before moderation",
    report.resolvedBy,
    null,
  );
  TestValidator.equals(
    "resolved_at is null before moderation",
    report.resolved_at,
    null,
  );
  TestValidator.equals(
    "deleted_at is null for active report",
    report.deleted_at,
    null,
  );
  // Junction deleted_at should also be null
  TestValidator.equals(
    "junction deleted_at is null",
    report.reportOnComment.deleted_at,
    null,
  );
}
