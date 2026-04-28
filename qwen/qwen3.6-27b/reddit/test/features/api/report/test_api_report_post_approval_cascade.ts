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
 * Test post report approval cascade by community owner.
 *
 * Validates the complete report approval workflow from report creation through moderator resolution. A community owner (MemberA) creates a post, which is then reported by a subscriber (MemberB). The owner approves the report, triggering a cascade that soft-deletes the reported post along with all its comments and recalculates affected karma scores.
 *
 * The test confirms that the report status transitions from pending to approved, that resolution metadata (resolved_by and resolved_at) is correctly populated, and that the post-targeting junction is maintained in the response.
 *
 * 1. MemberA joins as community owner.
 * 2. MemberB joins as subscriber.
 * 3. MemberA creates a community.
 * 4. MemberB subscribes to that community.
 * 5. MemberA creates a text post in the community.
 * 6. MemberB reports the post with a reason.
 * 7. MemberA approves the report as moderator.
 * 8. Validates report status is 'approved' with resolution metadata.
 */
export async function test_api_report_post_approval_cascade(
  connection: api.IConnection,
): Promise<void> {
  // 1. MemberA joins as community owner
  const memberAConnection: api.IConnection = { host: connection.host };
  const memberA = await authorize_member_join(memberAConnection, {
    body: {},
  });
  typia.assert(memberA);
  // 2. MemberB joins as subscriber
  const memberBConnection: api.IConnection = { host: connection.host };
  await authorize_member_join(memberBConnection, {
    body: {},
  });
  // 3. MemberA creates community
  const community =
    await generate_random_reddit_like_community_member_communities_create(
      memberAConnection,
      { body: {} },
    );
  typia.assert(community);
  // 4. MemberB subscribes to community
  await generate_random_reddit_like_community_member_community_subscriptions_create(
    memberBConnection,
    { body: { community_id: community.id } },
  );
  // 5. MemberA creates text post in community
  const post = await generate_random_reddit_like_community_member_posts_create(
    memberAConnection,
    {
      body: {
        title: RandomGenerator.paragraph({ sentences: 3 }),
        post_type: "text",
        community_id: community.id,
        body: RandomGenerator.content({ paragraphs: 2 }),
      },
    },
  );
  typia.assert(post);
  // 6. MemberB reports the post
  const report =
    await generate_random_reddit_like_community_member_reports_create(
      memberBConnection,
      {
        body: {
          postId: post.id,
          reason: "Content violates community guidelines",
        },
      },
    );
  typia.assert(report);
  TestValidator.equals("report is pending", report.status, "pending");
  TestValidator.equals("target is post", report.target_type, "post");
  // 7. MemberA approves the report (as community owner/moderator)
  const approvedReport =
    await api.functional.redditLikeCommunity.member.reports.approve(
      memberAConnection,
      {
        reportId: report.id,
      },
    );
  typia.assert(approvedReport);
  // 8. Validate report approval cascade
  TestValidator.equals(
    "report status is approved",
    approvedReport.status,
    "approved",
  );
  TestValidator.predicate(
    "has resolved_at timestamp",
    approvedReport.resolved_at !== null,
  );
  TestValidator.predicate(
    "resolved by MemberA",
    approvedReport.resolvedBy !== null,
  );
  TestValidator.equals(
    "resolved by is MemberA",
    approvedReport.resolvedBy!.id,
    memberA.id,
  );
  TestValidator.equals(
    "target remains post",
    approvedReport.target_type,
    "post",
  );
}
