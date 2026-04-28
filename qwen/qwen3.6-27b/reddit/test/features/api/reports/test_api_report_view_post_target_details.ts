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
import { generate_random_reddit_like_community_member_posts_create } from "../../../generate/generate_random_reddit_like_community_member_posts_create";
import { generate_random_reddit_like_community_member_reports_create } from "../../../generate/generate_random_reddit_like_community_member_reports_create";
import { prepare_random_reddit_like_community_community } from "../../../prepare/prepare_random_reddit_like_community_community";
import { prepare_random_reddit_like_community_community_subscription } from "../../../prepare/prepare_random_reddit_like_community_community_subscription";
import { prepare_random_reddit_like_community_post } from "../../../prepare/prepare_random_reddit_like_community_post";
import { prepare_random_reddit_like_community_report } from "../../../prepare/prepare_random_reddit_like_community_report";

/**
 * Test community owner retrieving details of a pending report filed against a post.
 *
 * Validates the complete report viewing workflow where a community owner (moderator) retrieves detailed information about a report that was filed against a post. The test verifies moderator authorization for viewing reports in their community.
 *
 * Special attention is paid to verifying the polymorphic target structure: the onPost junction must be populated with the reported post summary, while the reportOnComment junction must be null since the report targets a post. Since the report is still pending, resolved_at and resolvedBy fields must both be null.
 *
 * 1. Owner (community creator) joins the platform to establish moderator authority.
 * 2. Reporter (a member) joins the platform to create content and file the report.
 * 3. Owner creates a community, becoming the highest authority with moderation privileges.
 * 4. Reporter subscribes to the community to gain posting privileges.
 * 5. Reporter creates a post in the community to serve as the report target.
 * 6. Reporter files a pending report against the post with a reason.
 * 7. Owner retrieves report details using the report ID.
 * 8. Validates that target_type is 'post', status is 'pending', onPost junction is populated, reportOnComment junction is null, and resolution fields are null.
 */
export async function test_api_report_view_post_target_details(
  connection: api.IConnection,
): Promise<void> {
  // 1. Owner joins (community creator with moderator authority)
  const ownerConnection: api.IConnection = { host: connection.host };
  const ownerPassword = RandomGenerator.alphaNumeric(16);
  const ownerEmail = typia.random<string & tags.Format<"email">>();
  await authorize_member_join(ownerConnection, {
    body: {
      email: ownerEmail,
      password: ownerPassword,
    } satisfies DeepPartial<IREdditLikeCommunityMember.IJoin>,
  });
  // 2. Reporter joins (member who will file the report)
  const reporterConnection: api.IConnection = { host: connection.host };
  const reporterPassword = RandomGenerator.alphaNumeric(16);
  const reporterEmail = typia.random<string & tags.Format<"email">>();
  await authorize_member_join(reporterConnection, {
    body: {
      email: reporterEmail,
      password: reporterPassword,
    } satisfies DeepPartial<IREdditLikeCommunityMember.IJoin>,
  });
  // 3. Owner creates community
  const community =
    await generate_random_reddit_like_community_member_communities_create(
      ownerConnection,
      {},
    );
  typia.assert(community);
  // 4. Reporter subscribes to community
  await generate_random_reddit_like_community_member_community_subscriptions_create(
    reporterConnection,
    { body: { community_id: community.id } },
  );
  // 5. Reporter creates a post in the community
  const post = await generate_random_reddit_like_community_member_posts_create(
    reporterConnection,
    { body: { community_id: community.id, post_type: "text" } },
  );
  typia.assert(post);
  // 6. Reporter files a report against the post
  const report =
    await generate_random_reddit_like_community_member_reports_create(
      reporterConnection,
      { body: { postId: post.id, reason: "Inappropriate content" } },
    );
  typia.assert(report);
  // 7. Owner retrieves report details
  const reportDetails = await api.functional.redditLikeCommunity.reports.at(
    ownerConnection,
    { reportId: report.id },
  );
  typia.assert(reportDetails);
  // 8. Validate report details
  TestValidator.equals(
    "target_type is post",
    reportDetails.target_type,
    "post",
  );
  TestValidator.equals("status is pending", reportDetails.status, "pending");
  TestValidator.equals("resolved_at is null", reportDetails.resolved_at, null);
  TestValidator.equals("resolvedBy is null", reportDetails.resolvedBy, null);
  typia.assert(reportDetails.onPost!);
  TestValidator.equals(
    "onPost contains post id",
    reportDetails.onPost!.post.id,
    post.id,
  );
  TestValidator.equals(
    "reportOnComment is null",
    reportDetails.reportOnComment,
    null,
  );
}