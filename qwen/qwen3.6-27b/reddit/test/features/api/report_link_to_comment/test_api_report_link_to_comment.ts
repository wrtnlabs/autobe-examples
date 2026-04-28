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
import { generate_random_reddit_like_community_member_reports_report_on_comments_create } from "../../../generate/generate_random_reddit_like_community_member_reports_report_on_comments_create";
import { prepare_random_reddit_like_community_community } from "../../../prepare/prepare_random_reddit_like_community_community";
import { prepare_random_reddit_like_community_community_subscription } from "../../../prepare/prepare_random_reddit_like_community_community_subscription";
import { prepare_random_reddit_like_community_post } from "../../../prepare/prepare_random_reddit_like_community_post";
import { prepare_random_reddit_like_community_post_comment } from "../../../prepare/prepare_random_reddit_like_community_post_comment";
import { prepare_random_reddit_like_community_report } from "../../../prepare/prepare_random_reddit_like_community_report";
import { prepare_random_reddit_like_community_report_on_comment } from "../../../prepare/prepare_random_reddit_like_community_report_on_comment";

/**
 * Test linking an existing report to a comment as its target content.
 *
 * Validates the complete workflow of report-to-comment linking: authenticating a member, creating a community, subscribing the member, creating a post, creating a comment, creating a report entity, and finally linking the report to the comment via the report-on-comments endpoint. Ensures that the junction record is correctly created and that the response contains the expected report and comment references.
 *
 * The test verifies that the created report-on-comment junction record properly references both the report and the comment, and that the comment summary included in the response matches the originally created comment content.
 *
 * 1. Authenticate a new member via join.
 * 2. Create a community for content publishing.
 * 3. Subscribe the member to the community to gain posting privileges.
 * 4. Create a text post within the subscribed community.
 * 5. Create a comment on the post as the target content for reporting.
 * 6. Create a report entity as a separate step from linking.
 * 7. Link the report to the comment using the report-on-comments endpoint.
 * 8. Validate the junction record and comment reference.
 */
export async function test_api_report_link_to_comment(
  connection: api.IConnection,
): Promise<void> {
  // 1. Authenticate a new member
  const memberConnection: api.IConnection = { host: connection.host };
  const authorized = await authorize_member_join(memberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      username: RandomGenerator.name(1),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IREdditLikeCommunityMember.IJoin,
  });
  typia.assert(authorized);
  // 2. Create a community
  const community =
    await generate_random_reddit_like_community_member_communities_create(
      memberConnection,
      { body: undefined },
    );
  typia.assert(community);
  // 3. Subscribe the member to the community
  const subscription =
    await generate_random_reddit_like_community_member_community_subscriptions_create(
      memberConnection,
      { body: { community_id: community.id } },
    );
  typia.assert(subscription);
  // 4. Create a text post in the subscribed community
  const post = await generate_random_reddit_like_community_member_posts_create(
    memberConnection,
    {
      body: {
        community_id: community.id,
        title: RandomGenerator.paragraph({ sentences: 2 }),
        post_type: "text",
        body: RandomGenerator.paragraph({ sentences: 3 }),
      },
    },
  );
  typia.assert(post);
  // 5. Create a comment on the post
  const commentBody = RandomGenerator.paragraph({ sentences: 2 });
  const comment =
    await generate_random_reddit_like_community_member_posts_comments_create(
      memberConnection,
      {
        body: { body: commentBody },
        params: { postId: post.id },
      },
    );
  typia.assert(comment);
  // 6. Create a report entity separate from linking
  const reportReason = RandomGenerator.paragraph({ sentences: 1 });
  const reportBody = {
    reason: reportReason,
  } satisfies IREdditLikeCommunityReport.ICreate;
  const report =
    await generate_random_reddit_like_community_member_reports_create(
      memberConnection,
      { body: reportBody },
    );
  typia.assert(report);
  // 7. Link the report to the comment using the report-on-comments endpoint
  const reportOnComment =
    await generate_random_reddit_like_community_member_reports_report_on_comments_create(
      memberConnection,
      {
        body: { comment_id: comment.id },
        params: { reportId: report.id },
      },
    );
  typia.assert(reportOnComment);
  // 8. Validate the returned junction record
  TestValidator.equals(
    "report ID matches the created report",
    reportOnComment.report.id,
    report.id,
  );
  TestValidator.equals(
    "comment ID matches the created comment",
    reportOnComment.comment.id,
    comment.id,
  );
  TestValidator.equals(
    "report reason matches the input reason",
    reportOnComment.report.reason,
    reportReason,
  );
  TestValidator.equals(
    "comment content matches the input content",
    reportOnComment.comment.content,
    commentBody,
  );
  TestValidator.predicate(
    "report target type is comment",
    reportOnComment.report.target_type === "comment",
  );
}
