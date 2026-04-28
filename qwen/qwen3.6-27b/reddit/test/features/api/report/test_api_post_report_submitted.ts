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
 * Test authenticated member reports a post in their subscribed community.
 *
 * Validates the complete post reporting flow including member authentication, community setup, subscription, post creation as the target content, and report submission. The system automatically derives the target type as 'post', extracts community context from the post, and creates both the report and junction record linking them.
 *
 * Special attention is given to verifying reporter attribution, correct target type derivation, community scoping, and junction record integrity. Also validates that unresolved fields remain null.
 *
 * 1. Member registers and authenticates on the platform.
 * 2. Community is created by the authenticated member.
 * 3. Member subscribes to the community for posting privileges.
 * 4. Member creates a post in the subscribed community.
 * 5. Member submits a report with postId and reason for moderator review.
 * 6. Validates report is created with status 'pending', correct reporter, target_type 'post', community scope, junction record, and null resolution fields.
 */
export async function test_api_post_report_submitted(
  connection: api.IConnection,
): Promise<void> {
  // 1. Member registration and authentication
  const memberConnection: api.IConnection = { host: connection.host };
  const member = await authorize_member_join(memberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "Password123!",
      username: RandomGenerator.name(),
      href: "https://test.com/register" satisfies string & tags.Format<"uri">,
      referrer: "https://test.com/home" satisfies string & tags.Format<"uri">,
    },
  });
  typia.assert(member);
  // 2. Create community
  const community =
    await generate_random_reddit_like_community_member_communities_create(
      memberConnection,
      {
        body: {
          name: "TestCommunity_" + RandomGenerator.alphabets(6),
          description: RandomGenerator.paragraph({ sentences: 2 }),
        },
      },
    );
  typia.assert(community);
  // 3. Subscribe to community
  const subscription =
    await generate_random_reddit_like_community_member_community_subscriptions_create(
      memberConnection,
      {
        body: {
          community_id: community.id,
        },
      },
    );
  typia.assert(subscription);
  // 4. Create post in the community (target content to report)
  const post = await generate_random_reddit_like_community_member_posts_create(
    memberConnection,
    {
      body: {
        title: RandomGenerator.paragraph({ sentences: 3 }),
        post_type: "text",
        community_id: community.id,
        body: RandomGenerator.paragraph({ sentences: 5 }),
      },
    },
  );
  typia.assert(post);
  // 5. Report the post
  const report =
    await generate_random_reddit_like_community_member_reports_create(
      memberConnection,
      {
        body: {
          postId: post.id,
          reason: "This post violates community guidelines.",
        },
      },
    );
  typia.assert(report);
  // 6. Validate report fields
  TestValidator.equals("report status is pending", report.status, "pending");
  TestValidator.equals(
    "reporter matches authenticated member",
    report.reportedBy.id,
    member.id,
  );
  TestValidator.equals("target type is post", report.target_type, "post");
  TestValidator.equals(
    "community scope matches post community",
    report.community.id,
    community.id,
  );
  // Junction record exists and links to the correct post
  typia.assertGuard(report.onPost!);
  TestValidator.equals(
    "junction record links to reported post",
    report.onPost.post.id,
    post.id,
  );
  // Null/initial state validations
  TestValidator.equals(
    "resolvedBy is null for pending report",
    report.resolvedBy,
    null,
  );
  TestValidator.equals(
    "resolved_at is null for pending report",
    report.resolved_at,
    null,
  );
  TestValidator.equals(
    "deleted_at is null for active report",
    report.deleted_at,
    null,
  );
  // reportOnComment should be null since we reported a post
  TestValidator.equals(
    "comment junction is null when reporting post",
    report.reportOnComment,
    null,
  );
}
