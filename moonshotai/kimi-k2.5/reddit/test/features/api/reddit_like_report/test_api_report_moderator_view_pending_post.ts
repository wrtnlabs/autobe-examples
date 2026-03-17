import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IRedditLikeAttachment } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikeAttachment";
import type { IRedditLikeComment } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikeComment";
import type { IRedditLikeCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikeCommunity";
import type { IRedditLikeCommunitySubscription } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikeCommunitySubscription";
import type { IRedditLikeMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikeMember";
import type { IRedditLikeModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikeModerator";
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
import { authorize_moderator_join } from "../../../authorize/authorize_moderator_join";
import { authorize_moderator_login } from "../../../authorize/authorize_moderator_login";
import { authorize_moderator_refresh } from "../../../authorize/authorize_moderator_refresh";
import { generate_random_reddit_like_member_communities_create } from "../../../generate/generate_random_reddit_like_member_communities_create";
import { generate_random_reddit_like_member_posts_create } from "../../../generate/generate_random_reddit_like_member_posts_create";
import { generate_random_reddit_like_member_reports_create } from "../../../generate/generate_random_reddit_like_member_reports_create";
import { prepare_random_reddit_like_community } from "../../../prepare/prepare_random_reddit_like_community";
import { prepare_random_reddit_like_post } from "../../../prepare/prepare_random_reddit_like_post";
import { prepare_random_reddit_like_report } from "../../../prepare/prepare_random_reddit_like_report";

export async function test_api_report_moderator_view_pending_post(
  connection: api.IConnection,
): Promise<void> {
  // Create member actor who will create community, post, and submit report
  const memberConnection: api.IConnection = { host: connection.host };
  const member = await authorize_member_join(memberConnection, {});
  // Create community for content
  const community = await generate_random_reddit_like_member_communities_create(
    memberConnection,
    {},
  );
  // Subscribe member to community (required for posting)
  await api.functional.redditLike.member.communities.subscriptions.create(
    memberConnection,
    { communityId: community.id },
  );
  // Create text post that will be reported
  const post = await generate_random_reddit_like_member_posts_create(
    memberConnection,
    {
      body: {
        title: RandomGenerator.paragraph({ sentences: 1 }),
        community_id: community.id,
        post_type: "text",
        body: RandomGenerator.paragraph({ sentences: 5 }),
      } satisfies IRedditLikePost.ICreate,
    },
  );
  // Create moderator actor who will review the report
  // In a real system, this user would need moderator privileges for the community
  const moderatorConnection: api.IConnection = { host: connection.host };
  await authorize_moderator_join(moderatorConnection, {});
  // Member submits violation report on the post
  const report = await generate_random_reddit_like_member_reports_create(
    memberConnection,
    {
      body: {
        communityId: community.id,
        postId: post.id,
        commentId: null,
        reason:
          "This post contains inappropriate content violating community guidelines",
      } satisfies IRedditLikeReport.ICreate,
    },
  );
  // Moderator retrieves and views the pending report
  const viewedReport = await api.functional.redditLike.moderator.reports.at(
    moderatorConnection,
    { reportId: report.id },
  );
  // Validate report structure and content
  typia.assert(viewedReport);
  // Verify report identity and status
  TestValidator.equals("report ID matches input", viewedReport.id, report.id);
  TestValidator.equals(
    "report status is pending",
    viewedReport.status,
    "pending",
  );
  TestValidator.equals(
    "report reason matches submission",
    viewedReport.reason,
    "This post contains inappropriate content violating community guidelines",
  );
  // Verify reporter identity
  TestValidator.equals(
    "reporter ID matches member",
    viewedReport.reporter.id,
    member.id,
  );
  TestValidator.equals(
    "reporter email matches member",
    viewedReport.reporter.email,
    member.email,
  );
  // Verify community context
  TestValidator.equals(
    "community ID matches",
    viewedReport.community.id,
    community.id,
  );
  TestValidator.equals(
    "community name matches",
    viewedReport.community.name,
    community.name,
  );
  // Verify reported content is the correct post - narrow type with discriminant
  if ("postType" in viewedReport.content) {
    const postContent = viewedReport.content as IRedditLikePost;
    TestValidator.predicate(
      "content is a post",
      postContent.postType === "text",
    );
    TestValidator.equals(
      "content ID matches post",
      postContent.id,
      post.id,
    );
    TestValidator.equals(
      "content title matches post",
      postContent.title,
      post.title,
    );
  }
  // Verify audit trail snapshots exist
  TestValidator.predicate(
    "snapshots array exists",
    Array.isArray(viewedReport.snapshots),
  );
}