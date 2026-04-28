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
 * Test successful erasure of a report-post junction association.
 *
 * Validates that the DELETE endpoint correctly removes the junction record linking a report to its post target without affecting the report entity itself or the reported post. The report status remains unchanged and the post content persists in the community.
 *
 * Tests the polymorphic subtype pattern's junction management by erasing only the association while preserving both entities.
 *
 * 1. Member authenticates via join.
 * 2. Member creates a community for target content.
 * 3. Member subscribes to the community.
 * 4. Member creates a post in the community.
 * 5. Member reports the post, obtaining reportId and reportOnPostId junction.
 * 6. Member erases the junction using DELETE endpoint.
 * 7. Validates that erase completes successfully, report status unchanged, post content intact.
 */
export async function test_api_report_junction_erasure_success(
  connection: api.IConnection,
): Promise<void> {
  // 1. Authenticate as member
  const memberConnection: api.IConnection = { host: connection.host };
  const member = await authorize_member_join(memberConnection, {
    body: {},
  });
  typia.assert(member);
  TestValidator.predicate("member authenticated", member.id.length > 0);
  // 2. Create community
  const community =
    await generate_random_reddit_like_community_member_communities_create(
      memberConnection,
      {},
    );
  typia.assert(community);
  TestValidator.predicate("community created", community.name.length > 0);
  // 3. Subscribe to community
  const subscription =
    await generate_random_reddit_like_community_member_community_subscriptions_create(
      memberConnection,
      { body: { community_id: community.id } },
    );
  typia.assert(subscription);
  TestValidator.equals(
    "subscription matches community",
    subscription.community.id,
    community.id,
  );
  // 4. Create a post in the community
  const post = await generate_random_reddit_like_community_member_posts_create(
    memberConnection,
    { body: { community_id: community.id } },
  );
  typia.assert(post);
  TestValidator.equals(
    "post in correct community",
    post.community.id,
    community.id,
  );
  // 5. Report the post to create a report-on-post junction
  const postReport =
    await generate_random_reddit_like_community_member_reports_create(
      memberConnection,
      {
        body: {
          postId: post.id,
          reason: RandomGenerator.paragraph({ sentences: 2 }),
        },
      },
    );
  typia.assert(postReport);
  TestValidator.equals("report target is post", postReport.target_type, "post");
  TestValidator.equals(
    "report status is pending",
    postReport.status,
    "pending",
  );
  const initialStatus = postReport.status;
  // Verify the junction record exists on the report
  if (postReport.onPost === null) {
    throw new Error("onPost junction should not be null for a post report");
  }
  const reportOnPostId = postReport.onPost.id;
  const reportId = postReport.id;
  typia.assert(reportOnPostId);
  typia.assert(reportId);
  // 6. Erase the report-post junction
  await api.functional.redditLikeCommunity.member.reports.reportOnPosts.erase(
    memberConnection,
    { reportId, reportOnPostId },
  );
  // 7. Validate that the erase completed successfully
  // Primary assertion: erase operation completed without error (void return)
  // Secondary: report and post entities remain intact
  TestValidator.equals(
    "report status after erasure",
    postReport.status,
    initialStatus,
  );
  TestValidator.predicate(
    "post title persists after junction erasure",
    post.title.length > 0,
  );
  TestValidator.equals(
    "post community reference intact",
    post.community.id,
    community.id,
  );
}