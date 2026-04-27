import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformComment } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformComment";
import type { ICommunityPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunity";
import type { ICommunityPlatformCommunityImage } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunityImage";
import type { ICommunityPlatformCommunityReport } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunityReport";
import type { ICommunityPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMember";
import type { ICommunityPlatformPost } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformPost";
import type { ICommunityPlatformProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformProfile";
import type { ICommunityPlatformReport } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformReport";
import type { ICommunityPlatformReportCommentTarget } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformReportCommentTarget";
import type { ICommunityPlatformReportPostTarget } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformReportPostTarget";
import type { ICommunityPlatformSubscription } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformSubscription";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";
import { generate_random_community_platform_member_communities_create } from "../../../generate/generate_random_community_platform_member_communities_create";
import { generate_random_community_platform_member_communities_subscribers_create } from "../../../generate/generate_random_community_platform_member_communities_subscribers_create";
import { generate_random_community_platform_member_community_reports_create } from "../../../generate/generate_random_community_platform_member_community_reports_create";
import { generate_random_community_platform_member_posts_comments_create } from "../../../generate/generate_random_community_platform_member_posts_comments_create";
import { generate_random_community_platform_member_posts_create } from "../../../generate/generate_random_community_platform_member_posts_create";
import { prepare_random_community_platform_comment } from "../../../prepare/prepare_random_community_platform_comment";
import { prepare_random_community_platform_community } from "../../../prepare/prepare_random_community_platform_community";
import { prepare_random_community_platform_community_image } from "../../../prepare/prepare_random_community_platform_community_image";
import { prepare_random_community_platform_community_report } from "../../../prepare/prepare_random_community_platform_community_report";
import { prepare_random_community_platform_post } from "../../../prepare/prepare_random_community_platform_post";
import { prepare_random_community_platform_subscription } from "../../../prepare/prepare_random_community_platform_subscription";

/**
 * Test approving a report against a comment cascading soft-deletion to nested replies.
 *
 * Validates the complete workflow: member registration, community creation, subscription, post/comment/reply creation, report submission by another member, and moderator approval. Ensures the report status transitions to 'approved', the reported comment and its nested replies are soft-deleted (deletedAt is set), and the parent post remains unaffected.
 *
 * 1. Member A registers and creates a community (becomes owner).
 * 2. Member A subscribes to the community and creates a text post.
 * 3. Member A creates a top-level comment and a nested reply on the post.
 * 4. Member B registers and submits a report against the top-level comment.
 * 5. Member A (as moderator) approves the report.
 * 6. Validates report status, soft-deletion of comment and replies, and unaffected post.
 */
export async function test_api_report_approve_deletes_reported_comment_with_replies(
  connection: api.IConnection,
): Promise<void> {
  // Create separate connections for two members
  const memberAConnection: api.IConnection = { host: connection.host };
  const memberBConnection: api.IConnection = { host: connection.host };
  // 1. Register Member A (community owner)
  await authorize_member_join(memberAConnection, {});
  // 2. Member A creates a community
  const community =
    await generate_random_community_platform_member_communities_create(
      memberAConnection,
      {},
    );
  typia.assert(community);
  // 3. Member A subscribes to the community
  await generate_random_community_platform_member_communities_subscribers_create(
    memberAConnection,
    {
      params: { communityId: community.id },
    },
  );
  // 4. Member A creates a text post
  const post = await generate_random_community_platform_member_posts_create(
    memberAConnection,
    {
      body: {
        communityId: community.id,
        type: "text",
        title: RandomGenerator.paragraph({ sentences: 2 }),
        body: RandomGenerator.content({ paragraphs: 2 }),
      },
    },
  );
  typia.assert(post);
  // 5. Member A creates a top-level comment
  const topComment =
    await generate_random_community_platform_member_posts_comments_create(
      memberAConnection,
      {
        params: { postId: post.id },
        body: {
          content: RandomGenerator.paragraph({ sentences: 3 }),
          commentId: null,
        },
      },
    );
  typia.assert(topComment);
  // 6. Member A creates a nested reply to the top-level comment
  const reply =
    await generate_random_community_platform_member_posts_comments_create(
      memberAConnection,
      {
        params: { postId: post.id },
        body: {
          content: RandomGenerator.paragraph({ sentences: 2 }),
          commentId: topComment.id,
        },
      },
    );
  typia.assert(reply);
  // 7. Register Member B (report submitter)
  await authorize_member_join(memberBConnection, {});
  // 8. Member B submits a report against the top-level comment
  const report =
    await generate_random_community_platform_member_community_reports_create(
      memberBConnection,
      {
        body: {
          targetId: topComment.id,
          targetType: "comment",
          reason: RandomGenerator.paragraph({ sentences: 2 }),
        },
      },
    );
  typia.assert(report);
  // 9. Member A (community moderator/owner) approves the report
  const approveResponse =
    await api.functional.communityPlatform.member.community_reports.approve(
      memberAConnection,
      {
        reportId: report.id,
      },
    );
  typia.assert(approveResponse);
  // 10. Validation
  // Report status is 'approved'
  TestValidator.equals(
    "report status is approved",
    approveResponse.status,
    "approved",
  );
  // The reported comment is soft-deleted
  const commentTarget = approveResponse.commentTarget!;
  TestValidator.predicate(
    "reported comment is soft-deleted",
    () => commentTarget.comment.deletedAt !== null,
  );
  // All nested replies are also soft-deleted (cascading deletion)
  TestValidator.predicate(
    "all nested replies are soft-deleted",
    () =>
      commentTarget.comment.replies.length > 0 &&
      commentTarget.comment.replies.every((r) => r.deletedAt !== null),
  );
  // The parent post remains unaffected
  TestValidator.equals("parent post is unaffected", post.deleted_at, null);
}
