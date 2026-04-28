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
 * Test rejecting approval of an already-approved report with 409 Conflict.
 *
 * Validates the concurrency guard that prevents redundant resolution of reports that have already been handled. Tests the complete workflow of creating a community, subscribing, creating a post, reporting, and approving, then attempting a second approval which should fail.
 *
 * Special attention is given to verifying that the terminal-action rule is enforced, preventing double-resolution and ensuring report integrity and state consistency.
 *
 * 1. MemberA joins the platform and becomes a community owner by creating a new community.
 * 2. MemberB joins and subscribes to MemberA's community.
 * 3. MemberA creates a post in the community.
 * 4. MemberB reports the post with a reason (status becomes 'pending').
 * 5. MemberA approves the report, transitioning its status to 'approved'.
 * 6. MemberB attempts to approve the same already-approved report.
 * 7. The system rejects the request with a 409 Conflict error.
 */
export async function test_api_report_already_approved_rejection(
  connection: api.IConnection,
): Promise<void> {
  // 1-2. MemberA joins and creates a community (becomes owner)
  const memberAConnection: api.IConnection = { host: connection.host };
  const memberAInfo: IREdditLikeCommunityMember.IAuthorized =
    await authorize_member_join(memberAConnection, {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        password: RandomGenerator.alphaNumeric(16),
        username: RandomGenerator.name(),
        href: typia.random<string & tags.Format<"uri">>(),
        referrer: typia.random<string & tags.Format<"uri">>(),
      } satisfies IREdditLikeCommunityMember.IJoin,
    });
  typia.assert(memberAInfo);
  const community: IREdditLikeCommunityCommunity =
    await api.functional.redditLikeCommunity.member.communities.create(
      memberAConnection,
      {
        body: {
          name: RandomGenerator.paragraph({ sentences: 2 }),
          description: RandomGenerator.paragraph({ sentences: 3 }),
          icon_uri: null,
        } satisfies IREdditLikeCommunityCommunity.ICreate,
      },
    );
  typia.assert(community);
  // 3. MemberB joins and subscribes to the community
  const memberBConnection: api.IConnection = { host: connection.host };
  await authorize_member_join(memberBConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      username: RandomGenerator.name(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IREdditLikeCommunityMember.IJoin,
  });
  const subscription: IRedditLikeCommunityCommunitySubscription =
    await api.functional.redditLikeCommunity.member.community_subscriptions.create(
      memberBConnection,
      {
        body: {
          community_id: community.id,
        } satisfies IRedditLikeCommunityCommunitySubscription.ICreate,
      },
    );
  typia.assert(subscription);
  // 4. MemberA creates a post in the community
  const post: IREdditLikeCommunityPost =
    await api.functional.redditLikeCommunity.member.posts.create(
      memberAConnection,
      {
        body: {
          title: RandomGenerator.paragraph({ sentences: 2 }),
          post_type: "text",
          body: RandomGenerator.paragraph({ sentences: 5 }),
          url: null,
          community_id: community.id,
        } satisfies IREdditLikeCommunityPost.ICreate,
      },
    );
  typia.assert(post);
  // 5. MemberB reports the post with a reason
  const report: IREdditLikeCommunityReport =
    await api.functional.redditLikeCommunity.member.reports.create(
      memberBConnection,
      {
        body: {
          postId: post.id,
          reason: RandomGenerator.paragraph({ sentences: 3 }),
        } satisfies IREdditLikeCommunityReport.ICreate,
      },
    );
  typia.assert(report);
  // 6. MemberA approves the report (status transitions to 'approved')
  const approvedReport: IREdditLikeCommunityReport =
    await api.functional.redditLikeCommunity.member.reports.approve(
      memberAConnection,
      {
        reportId: report.id,
      },
    );
  typia.assert(approvedReport);
  // Validate initial approval succeeded
  TestValidator.equals(
    "report status is approved",
    approvedReport.status,
    "approved",
  );
  TestValidator.predicate(
    "report resolved by member is set",
    approvedReport.resolvedBy !== null,
  );
  // 7. Verify resolvedBy matches MemberA
  TestValidator.equals(
    "resolved by matches MemberA id",
    approvedReport.resolvedBy!.id,
    memberAInfo.id,
  );
  // 8-9. MemberB attempts to approve the already-approved report (should get 409 Conflict)
  await TestValidator.httpError(
    "approve already approved report throws 409 Conflict",
    409,
    async () => {
      await api.functional.redditLikeCommunity.member.reports.approve(
        memberBConnection,
        {
          reportId: report.id,
        },
      );
    },
  );
}
