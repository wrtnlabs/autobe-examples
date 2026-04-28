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
 * Test duplicate report rejection when a member attempts to report the same post twice.
 *
 * Validated business rule states that if a duplicate report exists from the same user for the same content, the new submission is rejected. The test follows the complete workflow from member registration through community creation, subscription, post creation, and then reports the same post twice to verify the duplicate prevention logic.
 *
 * The first report submission should succeed and create a report with status='pending'. The second report submission targeting the same post should be rejected because a report already exists from this member for this content.
 *
 * 1. Member registers and authenticates to the platform.
 * 2. Member creates a community.
 * 3. Member subscribes to the newly created community.
 * 4. Member creates a post in the community.
 * 5. Member reports the post with a first reason (succeeds with status='pending').
 * 6. Member attempts to report the same post with a different reason (rejected as duplicate).
 * 7. Validates the duplicate report rejection behavior.
 */
export async function test_api_report_duplicate_rejected(
  connection: api.IConnection,
): Promise<void> {
  // 1. Member registration and authentication
  const memberConnection: api.IConnection = { host: connection.host };
  await authorize_member_join(memberConnection, {
    body: {},
  });
  // 2. Create a community
  const community =
    await generate_random_reddit_like_community_member_communities_create(
      memberConnection,
      {},
    );
  typia.assert(community);
  // 3. Subscribe to the community
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
  // 4. Create a post in the community
  const post = await generate_random_reddit_like_community_member_posts_create(
    memberConnection,
    {
      body: {
        community_id: community.id,
      },
    },
  );
  typia.assert(post);
  // 5. First report - should succeed with status='pending'
  const firstReportBody = {
    postId: post.id,
    reason: RandomGenerator.paragraph({ sentences: 3 }),
  } satisfies IREdditLikeCommunityReport.ICreate;
  const firstReport =
    await api.functional.redditLikeCommunity.member.reports.create(
      memberConnection,
      { body: firstReportBody },
    );
  typia.assert(firstReport);
  // Validate first report was created with pending status
  TestValidator.equals(
    "first report status is pending",
    firstReport.status,
    "pending",
  );
  TestValidator.equals(
    "first report targets post",
    firstReport.target_type,
    "post",
  );
  // 6. Second report - should be rejected as duplicate
  const secondReportBody = {
    postId: post.id,
    reason: RandomGenerator.paragraph({ sentences: 2 }),
  } satisfies IREdditLikeCommunityReport.ICreate;
  await TestValidator.error("duplicate report rejected", async () => {
    await api.functional.redditLikeCommunity.member.reports.create(
      memberConnection,
      { body: secondReportBody },
    );
  });
}
