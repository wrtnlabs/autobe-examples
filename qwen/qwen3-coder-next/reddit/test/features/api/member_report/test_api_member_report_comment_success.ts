import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IRedditLikeComment } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikeComment";
import type { IRedditLikeCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikeCommunity";
import type { IRedditLikeMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikeMember";
import type { IRedditLikePost } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikePost";
import type { IRedditLikeReport } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikeReport";
import type { IRedditLikeSubscription } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikeSubscription";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";
import { generate_random_reddit_like_member_posts_comments_create } from "../../../generate/generate_random_reddit_like_member_posts_comments_create";
import { generate_random_reddit_like_member_posts_create } from "../../../generate/generate_random_reddit_like_member_posts_create";
import { generate_random_reddit_like_member_reports_create } from "../../../generate/generate_random_reddit_like_member_reports_create";
import { prepare_random_reddit_like_comment } from "../../../prepare/prepare_random_reddit_like_comment";
import { prepare_random_reddit_like_post } from "../../../prepare/prepare_random_reddit_like_post";
import { prepare_random_reddit_like_report } from "../../../prepare/prepare_random_reddit_like_report";

export async function test_api_member_report_comment_success(
  connection: api.IConnection,
): Promise<void> {
  // 1. Reporting member registration
  const reportingMemberConnection: api.IConnection = { host: connection.host };
  const reportingMember = await authorize_member_join(
    reportingMemberConnection,
    {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        username: RandomGenerator.alphaNumeric(8),
        password: RandomGenerator.alphaNumeric(16),
        display_name: RandomGenerator.name(),
        bio: null,
        avatar_url: null,
      } satisfies IRedditLikeMember.IJoin,
    },
  );
  typia.assert(reportingMember);
  // 2. Reporting member subscribes to community
  const communityName = "test_community";
  const subscription =
    await api.functional.redditLike.member.communities.subscribe.create(
      reportingMemberConnection,
      {
        communityName,
      },
    );
  typia.assert(subscription);
  // 3. Content-creating member registration
  const contentMemberConnection: api.IConnection = { host: connection.host };
  const contentMember = await authorize_member_join(contentMemberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      username: RandomGenerator.alphaNumeric(8),
      password: RandomGenerator.alphaNumeric(16),
      display_name: RandomGenerator.name(),
      bio: null,
      avatar_url: null,
    } satisfies IRedditLikeMember.IJoin,
  });
  typia.assert(contentMember);
  // 4. Create post in community
  const post = await api.functional.redditLike.member.posts.create(
    contentMemberConnection,
    {
      body: {
        title: RandomGenerator.paragraph({ sentences: 2 }),
        type: "text" as const,
        content: RandomGenerator.content({ paragraphs: 2 }),
        community_id: subscription.community.id,
      } satisfies IRedditLikePost.ICreate,
    },
  );
  typia.assert(post);
  // 5. Commenting member registration
  const commentingMemberConnection: api.IConnection = { host: connection.host };
  const commentingMember = await authorize_member_join(
    commentingMemberConnection,
    {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        username: RandomGenerator.alphaNumeric(8),
        password: RandomGenerator.alphaNumeric(16),
        display_name: RandomGenerator.name(),
        bio: null,
        avatar_url: null,
      } satisfies IRedditLikeMember.IJoin,
    },
  );
  typia.assert(commentingMember);
  // 6. Create comment on post
  const comment = await api.functional.redditLike.member.posts.comments.create(
    commentingMemberConnection,
    {
      postId: post.id,
      body: {
        content: RandomGenerator.paragraph({ sentences: 2 }),
      } satisfies IRedditLikeComment.ICreate,
    },
  );
  typia.assert(comment);
  // 7. Report the comment
  const reportReason = "This comment contains inappropriate content";
  const report = await api.functional.redditLike.member.reports.create(
    reportingMemberConnection,
    {
      body: {
        reported_comment_id: comment.id,
        reason: reportReason,
      } satisfies IRedditLikeReport.ICreate,
    },
  );
  typia.assert(report);
  // 8. Validate report structure
  TestValidator.equals("report status is pending", report.status, "pending");
  TestValidator.equals(
    "report has comment info",
    report.reportedComment?.id,
    comment.id,
  );
  TestValidator.equals(
    "report has comment content",
    report.reportedComment?.content,
    comment.content,
  );
  TestValidator.equals(
    "report has comment author",
    report.reportedComment?.author.id,
    comment.author.id,
  );
  TestValidator.equals(
    "report has reporter info",
    report.reporter.id,
    reportingMember.id,
  );
  TestValidator.equals("report reason matches", report.reason, reportReason);
  // Verify community association through parent post
  TestValidator.equals(
    "report has correct community through parent post",
    report.reportedComment?.post.community.id,
    subscription.community.id,
  );
}