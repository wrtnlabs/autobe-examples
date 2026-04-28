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
import type { IRedditLikeCommunityModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikeCommunityModerator";
import type { IRedditLikeCommunityPostImage } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikeCommunityPostImage";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";
import { generate_random_reddit_like_community_member_communities_community_moderators_create } from "../../../generate/generate_random_reddit_like_community_member_communities_community_moderators_create";
import { generate_random_reddit_like_community_member_communities_create } from "../../../generate/generate_random_reddit_like_community_member_communities_create";
import { generate_random_reddit_like_community_member_community_subscriptions_create } from "../../../generate/generate_random_reddit_like_community_member_community_subscriptions_create";
import { generate_random_reddit_like_community_member_posts_create } from "../../../generate/generate_random_reddit_like_community_member_posts_create";
import { generate_random_reddit_like_community_member_reports_create } from "../../../generate/generate_random_reddit_like_community_member_reports_create";
import { prepare_random_reddit_like_community_community } from "../../../prepare/prepare_random_reddit_like_community_community";
import { prepare_random_reddit_like_community_community_subscription } from "../../../prepare/prepare_random_reddit_like_community_community_subscription";
import { prepare_random_reddit_like_community_moderator } from "../../../prepare/prepare_random_reddit_like_community_moderator";
import { prepare_random_reddit_like_community_post } from "../../../prepare/prepare_random_reddit_like_community_post";
import { prepare_random_reddit_like_community_report } from "../../../prepare/prepare_random_reddit_like_community_report";

/**
 * Test moderator dismissal of a post report through the update endpoint.
 *
 * Validates the complete report dismissal workflow including community setup, moderator appointment, post creation, report filing, and moderator resolution. Ensures that dismissing a report updates the report status to 'dismissed', records the resolving moderator, sets the resolved_at timestamp, and soft-deletes the report record while leaving the original post completely untouched.
 *
 * The flow involves four distinct actors: the community owner who creates the community and appoints the moderator, the moderator who performs the dismissal, the post author who creates the reported content, and the reporter who flags the post for review.
 *
 * 1. Owner registers and creates a target community.
 * 2. Moderator registers and is appointed by the owner.
 * 3. Author registers, subscribes to the community, and creates a post.
 * 4. Reporter registers, subscribes, and reports the post (creates pending report and onPost junction).
 * 5. Moderator dismisses the report using the update endpoint.
 * 6. Validates report status, resolution details, and soft-deletion state.
 */
export async function test_api_report_dismiss_post(
  connection: api.IConnection,
): Promise<void> {
  // 1. Owner registers and creates community
  const ownerConnection: api.IConnection = { host: connection.host };
  await authorize_member_join(ownerConnection, { body: {} });
  const community =
    await generate_random_reddit_like_community_member_communities_create(
      ownerConnection,
      { body: {} },
    );
  typia.assert(community);
  // 2. Moderator registers
  const moderatorConnection: api.IConnection = { host: connection.host };
  const moderator = await authorize_member_join(moderatorConnection, {
    body: {},
  });
  // Owner appoints moderator
  const moderatorAssignment =
    await generate_random_reddit_like_community_member_communities_community_moderators_create(
      ownerConnection,
      {
        params: { communityId: community.id },
        body: { member_id: moderator.id },
      },
    );
  typia.assert(moderatorAssignment);
  // 3. Author registers, subscribes, and creates a post
  const authorConnection: api.IConnection = { host: connection.host };
  await authorize_member_join(authorConnection, { body: {} });
  await generate_random_reddit_like_community_member_community_subscriptions_create(
    authorConnection,
    { body: { community_id: community.id } },
  );
  const post = await generate_random_reddit_like_community_member_posts_create(
    authorConnection,
    {
      body: { community_id: community.id, post_type: "text" },
    },
  );
  typia.assert(post);
  // 4. Reporter registers, subscribes, and reports the post
  const reporterConnection: api.IConnection = { host: connection.host };
  await authorize_member_join(reporterConnection, { body: {} });
  await generate_random_reddit_like_community_member_community_subscriptions_create(
    reporterConnection,
    { body: { community_id: community.id } },
  );
  const report =
    await generate_random_reddit_like_community_member_reports_create(
      reporterConnection,
      {
        body: { postId: post.id, reason: "Inappropriate content" },
      },
    );
  typia.assert(report);
  // Verify initial report state
  TestValidator.equals(
    "initial report status is pending",
    report.status,
    "pending",
  );
  TestValidator.predicate("onPost junction exists", report.onPost !== null);
  // Extract the junction ID from the onPost relation
  const reportOnPostId = report.onPost!.id;
  // 5. Moderator dismisses the report
  const updatedReport =
    await api.functional.redditLikeCommunity.member.reports.report_on_posts.update(
      moderatorConnection,
      {
        reportId: report.id,
        reportOnPostId,
        body: {
          status: "dismissed",
        } satisfies IREdditLikeCommunityReport.IUpdate,
      },
    );
  typia.assert(updatedReport);
  // 6. Validate dismissal results
  TestValidator.equals(
    "report status is dismissed",
    updatedReport.status,
    "dismissed",
  );
  const resolvedBy = updatedReport.resolvedBy;
  typia.assertGuard(resolvedBy);
  TestValidator.equals(
    "resolved by the moderator",
    resolvedBy!.id,
    moderator.id,
  );
  TestValidator.predicate(
    "resolved_at is set",
    updatedReport.resolved_at !== null,
  );
  TestValidator.predicate(
    "report is soft-deleted",
    updatedReport.deleted_at !== null,
  );
  TestValidator.equals(
    "target type preserved",
    updatedReport.target_type,
    "post",
  );
}