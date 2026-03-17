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

export async function test_api_report_comment_creation(
  connection: api.IConnection,
): Promise<void> {
  /**
   * Test that an authenticated member can successfully report a comment for moderation review.
   *
   * Setup:
   * 1. A member creates a community
   * 2. The member creates a post in that community
   * 3. The member creates a comment on that post
   *
   * Test Execution:
   * 4. The member submits a report targeting the comment with target_type='comment', providing a reason
   *
   * Validation:
   * 5. Response returns the created report with status 'pending'
   * 6. The report contains correct target_type ('comment') and target_id (the comment's UUID)
   * 7. The reporter information matches the authenticated member
   * 8. The community reference is correct
   * 9. The reason is stored as provided
   * 10. The target polymorphic relationship correctly references the comment
   */
  // 1. Member authentication - create member-specific connection
  const memberConnection: api.IConnection = { host: connection.host };
  const member = await authorize_member_join(memberConnection, {});
  typia.assert(member);
  // 2. Create a community
  const community =
    await generate_random_community_platform_member_communities_create(
      memberConnection,
      {},
    );
  typia.assert(community);
  // 3. Create a post in the community
  const post =
    await generate_random_community_platform_member_communities_posts_create(
      memberConnection,
      {
        params: {
          communityId: community.id,
        },
      },
    );
  typia.assert(post);
  // 4. Create a comment on the post
  const comment =
    await generate_random_community_platform_member_posts_comments_create(
      memberConnection,
      {
        params: {
          postId: post.id,
        },
      },
    );
  typia.assert(comment);
  // 5. Create a report targeting the comment
  const reportReason = RandomGenerator.paragraph({ sentences: 3 });
  const report = await api.functional.communityPlatform.member.reports.create(
    memberConnection,
    {
      body: {
        community_id: community.id,
        target_type: "comment",
        target_id: comment.id,
        reason: reportReason,
      } satisfies ICommunityPlatformReport.ICreate,
    },
  );
  typia.assert(report);
  // 6. Validate report properties
  TestValidator.equals("report status is pending", report.status, "pending");
  TestValidator.equals("target type is comment", report.targetType, "comment");
  TestValidator.equals(
    "target id matches comment",
    report.target.id,
    comment.id,
  );
  TestValidator.equals(
    "community id matches",
    report.community.id,
    community.id,
  );
  TestValidator.equals("reporter matches member", report.member.id, member.id);
  TestValidator.equals("reason is stored", report.reason, reportReason);
  // 7. Validate target is a comment with correct properties
  TestValidator.predicate(
    "target is a comment",
    report.targetType === "comment",
  );
  const targetComment = report.target as ICommunityPlatformComment;
  TestValidator.equals(
    "target content matches",
    targetComment.content,
    comment.content,
  );
  TestValidator.equals(
    "target author matches",
    targetComment.author.id,
    comment.author.id,
  );
}
