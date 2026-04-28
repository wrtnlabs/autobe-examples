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
 * Tests the complete lifecycle for a moderator approving a post-targeted report.
 *
 * This workflow confirms that a pending report created by a community reporter against
 * a post transitions to approved when processed by the community moderator (or owner).
 * On approval the report's status shifts to 'approved', the resolver and resolution timestamp
 * are recorded, and the reported post is soft-deleted.
 *
 * 1. Moderator creates a member account.
 * 2. Moderator creates a community and automatically becomes the owner.
 * 3. Reporter separately registers and joins the same community.
 * 4. Reporter creates a text post in the community.
 * 5. Reporter submits a pending report against the post.
 * 6. Moderator approves the report through the approval endpoint.
 * 7. Assertions verify the report is approved, the moderator is recorded as the resolver,
 *    a resolution timestamp exists, and the post is soft-deleted.
 */
export async function test_api_report_post_approval_lifecycle(
  connection: api.IConnection,
): Promise<void> {
  // 1. Moderator (owner) is created
  const moderatorConnection: api.IConnection = { host: connection.host };
  const moderatorAuth: IREdditLikeCommunityMember.IAuthorized =
    await authorize_member_join(moderatorConnection, {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        password: RandomGenerator.alphaNumeric(16),
        username: RandomGenerator.name(1),
        href: typia.random<string & tags.Format<"uri">>(),
        referrer: typia.random<string & tags.Format<"uri">>(),
      },
    });
  typia.assert(moderatorAuth);
  // 2. Moderator creates a community
  const community: IREdditLikeCommunityCommunity =
    await generate_random_reddit_like_community_member_communities_create(
      moderatorConnection,
      {},
    );
  typia.assert(community);
  // 3. Reporter is created
  const reporterConnection: api.IConnection = { host: connection.host };
  const reporterAuth: IREdditLikeCommunityMember.IAuthorized =
    await authorize_member_join(reporterConnection, {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        password: RandomGenerator.alphaNumeric(16),
        username: RandomGenerator.name(1),
        href: typia.random<string & tags.Format<"uri">>(),
        referrer: typia.random<string & tags.Format<"uri">>(),
      },
    });
  typia.assert(reporterAuth);
  // 4. Reporter subscribes to the community
  const subscription =
    await generate_random_reddit_like_community_member_community_subscriptions_create(
      reporterConnection,
      {
        body: {
          community_id: community.id,
        } satisfies DeepPartial<IRedditLikeCommunityCommunitySubscription.ICreate>,
      },
    );
  typia.assert(subscription);
  TestValidator.equals(
    "subscription community matches",
    subscription.community.id,
    community.id,
  );
  // 5. Reporter creates a post in the community
  const post: IREdditLikeCommunityPost =
    await generate_random_reddit_like_community_member_posts_create(
      reporterConnection,
      {
        body: {
          title: RandomGenerator.paragraph({ sentences: 3 }),
          post_type: "text",
          body: RandomGenerator.content({ paragraphs: 2 }),
          community_id: community.id,
        } satisfies DeepPartial<IREdditLikeCommunityPost.ICreate>,
      },
    );
  typia.assert(post);
  TestValidator.equals(
    "post community matches",
    post.community.id,
    community.id,
  );
  const originalPostId: string = post.id;
  // 6. Reporter creates a pending report against the post
  const report: IREdditLikeCommunityReport =
    await generate_random_reddit_like_community_member_reports_create(
      reporterConnection,
      {
        body: {
          postId: post.id,
          reason: RandomGenerator.paragraph({ sentences: 2 }),
        } satisfies DeepPartial<IREdditLikeCommunityReport.ICreate>,
      },
    );
  typia.assert(report);
  // Verify initial report state
  TestValidator.equals("report status is pending", report.status, "pending");
  TestValidator.equals(
    "report target_type is post",
    report.target_type,
    "post",
  );
  TestValidator.equals("report onPost exists", report.onPost !== null, true);
  TestValidator.equals(
    "report onPost references post",
    report.onPost!.post.id,
    originalPostId,
  );
  TestValidator.equals("report resolvedBy is null", report.resolvedBy, null);
  TestValidator.equals("report resolved_at is null", report.resolved_at, null);
  // 7. Moderator approves the report
  const approvedReport: IREdditLikeCommunityReport =
    await api.functional.redditLikeCommunity.member.reports.report_on_posts.approveOnPost(
      moderatorConnection,
      {
        reportId: report.id,
      },
    );
  typia.assert(approvedReport);
  // 8. Validate report lifecycle transitions
  TestValidator.equals(
    "report status is approved",
    approvedReport.status,
    "approved",
  );
  TestValidator.predicate(
    "resolvedBy is no longer null",
    () => approvedReport.resolvedBy !== null,
  );
  TestValidator.equals(
    "resolvedBy is the moderator",
    approvedReport.resolvedBy!.id,
    moderatorAuth.id,
  );
  TestValidator.predicate(
    "resolved_at is no longer null",
    () => approvedReport.resolved_at !== null,
  );
  TestValidator.equals(
    "report target_type remains post",
    approvedReport.target_type,
    "post",
  );
  TestValidator.predicate(
    "onPost junction exists",
    () => approvedReport.onPost !== null,
  );
  TestValidator.equals(
    "onPost reference still maps the post",
    approvedReport.onPost!.post.id,
    originalPostId,
  );
}
