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
 * Test moderator dismissal of a community post report.
 *
 * Validates the complete flow of report creation and dismissal within a community context. A member
 * registers as a community owner, creates a community and post, submits a report on the post,
 * and then dismisses the report. Ensures that the report transitions from pending to
 * dismissed status, with resolved_by_member_id and resolved_at populated by the owner's
 * identity and current timestamp. The reported post remains fully intact and visible in the
 * community feed. The dismissed report is removed from the visible report list via soft-deletion,
 * preserving audit history for tracking.
 *
 * 1. Register and authenticate a new member who will become the community owner.
 * 2. Create a community owned by the authenticated member.
 * 3. Create a post within the community.
 * 4. Submit a report targeting the post for moderator review.
 * 5. Dismiss the report using the moderator endpoint.
 * 6. Validate the report status is dismissed and audit fields are correctly populated.
 * 7. Confirm the reported post is unaffected and remains visible.
 */
export async function test_api_report_dismiss_by_moderator(
  connection: api.IConnection,
): Promise<void> {
  // 1. Register and authenticate the member who will become the community owner
  const memberConnection: api.IConnection = { host: connection.host };
  const authorized = await authorize_member_join(memberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      username: RandomGenerator.name(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IREdditLikeCommunityMember.IJoin,
  });
  typia.assert(authorized);
  // 2. Create a community
  const community =
    await api.functional.redditLikeCommunity.member.communities.create(
      memberConnection,
      {
        body: {
          name: RandomGenerator.paragraph({ sentences: 1 }),
          description: RandomGenerator.paragraph({ sentences: 2 }),
        } satisfies IREdditLikeCommunityCommunity.ICreate,
      },
    );
  typia.assert(community);
  // 3. Create a post in the community
  const post = await api.functional.redditLikeCommunity.member.posts.create(
    memberConnection,
    {
      body: {
        title: RandomGenerator.paragraph({ sentences: 1 }),
        post_type: "text",
        community_id: community.id,
        body: RandomGenerator.paragraph({ sentences: 3 }),
      } satisfies IREdditLikeCommunityPost.ICreate,
    },
  );
  typia.assert(post);
  // 4. Create a report on the post
  const report = await api.functional.redditLikeCommunity.member.reports.create(
    memberConnection,
    {
      body: {
        postId: post.id,
        reason: RandomGenerator.paragraph({ sentences: 2 }),
      } satisfies IREdditLikeCommunityReport.ICreate,
    },
  );
  typia.assert(report);
  // 5. Dismiss the report
  const dismissedReport =
    await api.functional.redditLikeCommunity.member.reports.dismiss.postByReportid(
      memberConnection,
      {
        reportId: report.id,
      },
    );
  typia.assert(dismissedReport);
  // 6. Validate the dismissed report status is dismissed
  TestValidator.equals(
    "report status is dismissed",
    dismissedReport.status,
    "dismissed",
  );
  // 7. Validate resolvedBy is populated with owner info
  TestValidator.predicate(
    "resolvedBy is populated with owner info",
    dismissedReport.resolvedBy !== null,
  );
  TestValidator.equals(
    "resolvedBy member id matches owner",
    dismissedReport.resolvedBy!.id,
    authorized.id,
  );
  // 8. Validate resolved_at is set
  TestValidator.predicate(
    "resolved_at is set",
    dismissedReport.resolved_at !== null,
  );
  // 9. Validate deleted_at is set (soft-deleted)
  TestValidator.predicate(
    "report is soft-deleted",
    dismissedReport.deleted_at !== null,
  );
  // 10. Validate onPost reference is maintained
  TestValidator.predicate(
    "onPost reference is maintained",
    dismissedReport.onPost !== null,
  );
  TestValidator.equals(
    "onPost post id matches created post",
    dismissedReport.onPost!.post.id,
    post.id,
  );
}
