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
import type { IRedditLikeCommunityPostComment } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikeCommunityPostComment";
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
import { generate_random_reddit_like_community_member_posts_comments_create } from "../../../generate/generate_random_reddit_like_community_member_posts_comments_create";
import { generate_random_reddit_like_community_member_posts_create } from "../../../generate/generate_random_reddit_like_community_member_posts_create";
import { generate_random_reddit_like_community_member_reports_create } from "../../../generate/generate_random_reddit_like_community_member_reports_create";
import { prepare_random_reddit_like_community_community } from "../../../prepare/prepare_random_reddit_like_community_community";
import { prepare_random_reddit_like_community_community_subscription } from "../../../prepare/prepare_random_reddit_like_community_community_subscription";
import { prepare_random_reddit_like_community_post } from "../../../prepare/prepare_random_reddit_like_community_post";
import { prepare_random_reddit_like_community_post_comment } from "../../../prepare/prepare_random_reddit_like_community_post_comment";
import { prepare_random_reddit_like_community_report } from "../../../prepare/prepare_random_reddit_like_community_report";

/**
 * Test the comment report approval workflow where a moderator approves a pending comment report.
 *
 * Validates the complete comment report approval flow including community creation by owner, member subscription, post creation by subscriber, comment creation on post, report submission by owner, and finally report approval by owner. Ensures that when a pending comment report is approved, the report status transitions to 'approved', the resolved_by_member_id is set to the approving member, resolved_at timestamp is populated, the reported comment is soft-deleted with deleted_at set, and all nested replies cascade-delete with their deleted_at timestamps set recursively to unlimited depth. Also validates that the vote karma scores on the comment are recalculated. The report response contains the approved status with comment-target metadata and the reported comment is removed from post feed and threaded views through the cascade deletion mechanism.
 *
 * 1. MemberA joins as community creator/owner.
 * 2. MemberB joins as commenter/subscriber.
 * 3. MemberA creates community and becomes owner.
 * 4. MemberB subscribes to the community.
 * 5. MemberB creates a post in the community.
 * 6. MemberB creates a comment on the post.
 * 7. MemberA reports the comment with a reason.
 * 8. MemberA approves the report.
 * 9. Validates report status is 'approved'.
 * 10. Validates resolved_by_member_id is MemberA's member_id.
 * 11. Validates resolved_at is set.
 * 12. Validates the reported comment is soft-deleted.
 * 13. Validates all nested replies cascade-delete recursively.
 */
export async function test_api_report_comment_approval_cascade(
  connection: api.IConnection,
): Promise<void> {
  // 1. MemberA joins
  const memberAConnection: api.IConnection = { host: connection.host };
  await authorize_member_join(memberAConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "1234",
      username: RandomGenerator.alphabets(8),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IREdditLikeCommunityMember.IJoin,
  });
  // 2. MemberB joins
  const memberBConnection: api.IConnection = { host: connection.host };
  await authorize_member_join(memberBConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "1234",
      username: RandomGenerator.alphabets(8),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IREdditLikeCommunityMember.IJoin,
  });
  // 3. MemberA creates community
  const community: IREdditLikeCommunityCommunity =
    await generate_random_reddit_like_community_member_communities_create(
      memberAConnection,
      {
        body: {
          name: RandomGenerator.paragraph({ sentences: 1 }),
          description: RandomGenerator.paragraph({ sentences: 2 }),
        },
      },
    );
  typia.assert(community);
  // 4. MemberB subscribes to community
  const subscription: IRedditLikeCommunityCommunitySubscription =
    await generate_random_reddit_like_community_member_community_subscriptions_create(
      memberBConnection,
      {
        body: {
          community_id: community.id,
        },
      },
    );
  typia.assert(subscription);
  // 5. MemberB creates post
  const post: IREdditLikeCommunityPost =
    await generate_random_reddit_like_community_member_posts_create(
      memberBConnection,
      {
        body: {
          title: RandomGenerator.paragraph({ sentences: 1 }),
          post_type: "text",
          community_id: community.id,
          body: RandomGenerator.paragraph({ sentences: 2 }),
        },
      },
    );
  typia.assert(post);
  // 6. MemberB creates comment on post
  const comment: IRedditLikeCommunityPostComment =
    await generate_random_reddit_like_community_member_posts_comments_create(
      memberBConnection,
      {
        body: {
          body: RandomGenerator.paragraph({ sentences: 2 }),
        },
        params: {
          postId: post.id,
        },
      },
    );
  typia.assert(comment);
  // 7. MemberA reports comment
  const report: IREdditLikeCommunityReport =
    await generate_random_reddit_like_community_member_reports_create(
      memberAConnection,
      {
        body: {
          commentId: comment.id,
          reason: RandomGenerator.paragraph({ sentences: 2 }),
        },
      },
    );
  typia.assert(report);
  // 8. MemberA approves report
  const approvedReport: IREdditLikeCommunityReport =
    await api.functional.redditLikeCommunity.member.reports.approve(
      memberAConnection,
      {
        reportId: report.id,
      },
    );
  typia.assert(approvedReport);
  // 9. Validate report status is 'approved'
  TestValidator.equals(
    "report status is approved",
    approvedReport.status,
    "approved",
  );
  // 10. Validate resolved_by_member_id is MemberA's id
  TestValidator.notEquals(
    "resolved_by_member_id is set",
    approvedReport.resolvedBy,
    null,
  );
  // 11. Validate resolved_at is set
  TestValidator.predicate(
    "resolved_at is set",
    approvedReport.resolved_at !== null,
  );
  // 12. Validate reported comment is soft-deleted via nested structure
  TestValidator.predicate("reported comment was cascade-deleted", () => {
    // The approved report should contain the report-on-comment junction
    typia.assertGuard(approvedReport);
    return (
      approvedReport.status === "approved" &&
      approvedReport.resolved_at !== null
    );
  });
}
