import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformComment } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformComment";
import type { ICommunityPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunity";
import type { ICommunityPlatformFile } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformFile";
import type { ICommunityPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMember";
import type { ICommunityPlatformPost } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformPost";
import type { ICommunityPlatformReport } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformReport";
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
import { generate_random_community_platform_member_communities_posts_create } from "../../../generate/generate_random_community_platform_member_communities_posts_create";
import { generate_random_community_platform_member_posts_comments_create } from "../../../generate/generate_random_community_platform_member_posts_comments_create";
import { generate_random_community_platform_member_reports_create } from "../../../generate/generate_random_community_platform_member_reports_create";
import { prepare_random_community_platform_comment } from "../../../prepare/prepare_random_community_platform_comment";
import { prepare_random_community_platform_community } from "../../../prepare/prepare_random_community_platform_community";
import { prepare_random_community_platform_post } from "../../../prepare/prepare_random_community_platform_post";
import { prepare_random_community_platform_report } from "../../../prepare/prepare_random_community_platform_report";

export async function test_api_report_dismiss_content_kept(
  connection: api.IConnection,
): Promise<void> {
  /**
   * Test that a community moderator can successfully dismiss a pending report
   * on a comment, keeping the comment visible and marking the report as reviewed.
   *
   * Test Steps:
   * 1. Member A creates account and creates a community (becoming owner)
   * 2. Member A creates a post and comment in the community
   * 3. Member B creates a report on Member A's comment
   * 4. Member A dismisses the report via PUT with action='dismiss'
   *
   * Validations:
   * - Report status changes to 'dismissed'
   * - resolved_by contains Member A's information
   * - resolved_at timestamp is set
   * - The reported comment remains visible (deleted_at is null)
   */
  // Step 1: Member A creates account and creates a community
  const memberAConnection: api.IConnection = { host: connection.host };
  const memberA = await authorize_member_join(memberAConnection, {});
  typia.assert(memberA);
  const community =
    await generate_random_community_platform_member_communities_create(
      memberAConnection,
      {},
    );
  typia.assert(community);
  // Step 2: Member A creates a post in the community
  const post =
    await generate_random_community_platform_member_communities_posts_create(
      memberAConnection,
      {
        params: {
          communityId: community.id,
        },
      },
    );
  typia.assert(post);
  // Step 2b: Member A creates a comment on the post
  const comment =
    await generate_random_community_platform_member_posts_comments_create(
      memberAConnection,
      {
        params: {
          postId: post.id,
        },
      },
    );
  typia.assert(comment);
  // Step 3: Member B creates account and reports Member A's comment
  const memberBConnection: api.IConnection = { host: connection.host };
  await authorize_member_join(memberBConnection, {});
  const report = await generate_random_community_platform_member_reports_create(
    memberBConnection,
    {
      body: {
        community_id: community.id,
        target_type: "comment",
        target_id: comment.id,
        reason: RandomGenerator.paragraph({ sentences: 3 }),
      },
    },
  );
  typia.assert(report);
  // Verify initial report state
  TestValidator.equals("report status is pending", report.status, "pending");
  TestValidator.equals("report has no resolver", report.resolvedBy, null);
  TestValidator.equals(
    "report has no resolution time",
    report.resolvedAt,
    null,
  );
  // Step 4: Member A (moderator) dismisses the report
  const dismissedReport =
    await api.functional.communityPlatform.member.communities.reports.update(
      memberAConnection,
      {
        communityId: community.id,
        reportId: report.id,
        body: {
          action: "dismiss",
        } satisfies ICommunityPlatformReport.IUpdate,
      },
    );
  typia.assert(dismissedReport);
  // Validations
  TestValidator.equals(
    "report status is dismissed",
    dismissedReport.status,
    "dismissed",
  );
  TestValidator.predicate(
    "resolved_by is set",
    dismissedReport.resolvedBy !== null,
  );
  TestValidator.equals(
    "resolver is Member A",
    dismissedReport.resolvedBy?.id,
    memberA.id,
  );
  TestValidator.predicate(
    "resolved_at is set",
    dismissedReport.resolvedAt !== null,
  );
  // Verify the comment is still visible (not deleted)
  if (dismissedReport.targetType === "comment") {
    const targetComment = dismissedReport.target as ICommunityPlatformComment;
    TestValidator.equals(
      "comment is still visible",
      targetComment.deletedAt,
      null,
    );
    TestValidator.equals(
      "comment content preserved",
      targetComment.content,
      comment.content,
    );
    TestValidator.equals("comment id matches", targetComment.id, comment.id);
  }
}
