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
 * Test cross-member report retrieval without authorization.
 *
 * Validates the complete report creation and retrieval flow across two different members. Member A creates a community and a post, while member B reports that post. The report-on-post junction record can be retrieved without any authentication, confirming that this endpoint is publicly accessible for verification purposes.
 *
 * Special attention is given to verifying that the junction record correctly links the report (created by member B) with the post (created by member A), including proper reporter attribution and target content reference.
 *
 * 1. Authenticate as member A and create a community.
 * 2. Member A subscribes to the community and creates a post.
 * 3. Authenticate as member B and subscribe to the same community.
 * 4. Member B creates a report targeting member A's post.
 * 5. Retrieve the report-on-post junction record without authentication.
 * 6. Validate the junction contains correct report and post metadata.
 */
export async function test_api_report_cross_member_retrieval(
  connection: api.IConnection,
): Promise<void> {
  // 1. Authenticate member A
  const memberAConnection: api.IConnection = { host: connection.host };
  const memberA = await authorize_member_join(memberAConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      username: typia.random<string>(),
    },
  });
  typia.assert(memberA);
  // 2. Create community with member A
  const community =
    await generate_random_reddit_like_community_member_communities_create(
      memberAConnection,
      {},
    );
  typia.assert(community);
  // 3. Member A subscribes to the community
  const subscriptionA =
    await generate_random_reddit_like_community_member_community_subscriptions_create(
      memberAConnection,
      {
        body: { community_id: community.id },
      },
    );
  typia.assert(subscriptionA);
  // 4. Member A creates a post
  const post = await generate_random_reddit_like_community_member_posts_create(
    memberAConnection,
    {
      body: {
        community_id: community.id,
        title: RandomGenerator.paragraph({ sentences: 2 }),
        post_type: "text",
        body: RandomGenerator.content({ paragraphs: 1 }),
      },
    },
  );
  typia.assert(post);
  // 5. Authenticate member B
  const memberBConnection: api.IConnection = { host: connection.host };
  const memberB = await authorize_member_join(memberBConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      username: typia.random<string>(),
    },
  });
  typia.assert(memberB);
  // 6. Member B subscribes to the same community
  const subscriptionB =
    await generate_random_reddit_like_community_member_community_subscriptions_create(
      memberBConnection,
      {
        body: { community_id: community.id },
      },
    );
  typia.assert(subscriptionB);
  // 7. Member B reports member A's post
  const report = await api.functional.redditLikeCommunity.member.reports.create(
    memberBConnection,
    {
      body: {
        postId: post.id,
        reason: RandomGenerator.paragraph({ sentences: 2 }),
      } satisfies IREdditLikeCommunityReport.ICreate,
    },
  );
  typia.assert(report);
  // Type guard for nullable onPost field - since we reported a post, onPost is non-null
  typia.assertGuard(report.onPost!);
  // 8. Retrieve the report-on-post junction record without auth
  const reportOnPost =
    await api.functional.redditLikeCommunity.reports.report_on_posts.at(
      { host: connection.host },
      {
        reportId: report.id,
        reportOnPostId: report.onPost!.id,
      },
    );
  typia.assert(reportOnPost);
  // 9. Validate junction record
  TestValidator.equals(
    "junction report ID matches created report",
    reportOnPost.report.id,
    report.id,
  );
  TestValidator.equals(
    "junction post ID matches created post",
    reportOnPost.post.id,
    post.id,
  );
  TestValidator.equals(
    "junction report target type is post",
    reportOnPost.report.target_type,
    "post",
  );
  TestValidator.equals(
    "junction report status is pending",
    reportOnPost.report.status,
    "pending",
  );
  TestValidator.equals(
    "junction reporter is member B",
    reportOnPost.report.reportedBy.id,
    memberB.id,
  );
  TestValidator.equals(
    "junction post author is member A",
    reportOnPost.post.author.id,
    memberA.id,
  );
  TestValidator.equals(
    "junction post community matches created community",
    reportOnPost.post.community.id,
    community.id,
  );
}
