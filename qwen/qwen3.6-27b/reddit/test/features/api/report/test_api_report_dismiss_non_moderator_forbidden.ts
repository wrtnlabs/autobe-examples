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
 * Test that a non-moderator member receives 403 Forbidden when attempting to dismiss a report.
 *
 * Validates that the report dismissal endpoint enforces moderator-only access control. A community member without OWNER or MODERATOR role attempts to dismiss a pending report and the system correctly rejects the request. The report remains in pending status and the reported content stays unaffected.
 *
 * Two separate member connections are established to ensure complete connection isolation. The owner member creates the community, post, and report with full moderation authority. A regular member then subscribes to the community (gaining only subscriber privileges) and attempts to dismiss the report.
 *
 * 1. Owner member joins and creates a community.
 * 2. Owner member subscribes to the community and creates a post.
 * 3. Owner member submits a report on the post.
 * 4. Regular member joins and subscribes to the community as a subscriber.
 * 5. Regular member attempts to dismiss the report and receives 403 Forbidden.
 */
export async function test_api_report_dismiss_non_moderator_forbidden(
  connection: api.IConnection,
): Promise<void> {
  // 1. Owner member joins the platform
  const ownerConnection: api.IConnection = { host: connection.host };
  await authorize_member_join(ownerConnection, { body: {} });
  // 2. Owner creates a community (automatically becomes owner/creator)
  const community =
    await generate_random_reddit_like_community_member_communities_create(
      ownerConnection,
      {},
    );
  typia.assert(community);
  // 3. Owner subscribes to the community
  await generate_random_reddit_like_community_member_community_subscriptions_create(
    ownerConnection,
    {
      body: { community_id: community.id },
    },
  );
  // 4. Owner creates a post in the community
  const post = await generate_random_reddit_like_community_member_posts_create(
    ownerConnection,
    {
      body: { community_id: community.id },
    },
  );
  typia.assert(post);
  // 5. Owner submits a report on the post
  const report =
    await generate_random_reddit_like_community_member_reports_create(
      ownerConnection,
      {
        body: { postId: post.id },
      },
    );
  typia.assert(report);
  TestValidator.equals("report is pending", report.status, "pending");
  // 6. Regular member joins the platform (separate connection)
  const regularConnection: api.IConnection = { host: connection.host };
  await authorize_member_join(regularConnection, { body: {} });
  // 7. Regular member subscribes to the community (subscriber only, not moderator)
  await generate_random_reddit_like_community_member_community_subscriptions_create(
    regularConnection,
    {
      body: { community_id: community.id },
    },
  );
  // 8. Regular member attempts to dismiss the report → 403 Forbidden
  await TestValidator.httpError(
    "non-moderator report dismissal returns 403",
    403,
    async () => {
      await api.functional.redditLikeCommunity.member.reports.dismiss.postByReportid(
        regularConnection,
        {
          reportId: report.id,
        },
      );
    },
  );
}
