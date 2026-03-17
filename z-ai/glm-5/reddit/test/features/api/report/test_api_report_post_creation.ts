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
import { generate_random_community_platform_member_reports_create } from "../../../generate/generate_random_community_platform_member_reports_create";
import { prepare_random_community_platform_community } from "../../../prepare/prepare_random_community_platform_community";
import { prepare_random_community_platform_post } from "../../../prepare/prepare_random_community_platform_post";
import { prepare_random_community_platform_report } from "../../../prepare/prepare_random_community_platform_report";

/**
 * Test that an authenticated member can successfully report a post for moderation review.
 *
 * Setup:
 * 1. Create and authenticate a member
 * 2. Create a community
 * 3. Create a text post in that community
 *
 * Test Execution:
 * 4. Submit a report targeting the post with target_type='post' and a reason
 *
 * Validation:
 * 5. Report is created with status 'pending'
 * 6. Target type and target ID are correct
 * 7. Reporter information is correct
 * 8. Community reference is correct
 * 9. Reason is stored as provided
 * 10. resolvedBy and resolvedAt are null
 */
export async function test_api_report_post_creation(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create and authenticate a member
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
  // 3. Create a text post in that community
  const post =
    await generate_random_community_platform_member_communities_posts_create(
      memberConnection,
      {
        params: {
          communityId: community.id,
        },
        body: {
          title: RandomGenerator.paragraph({ sentences: 2 }),
          postType: "text",
          content: RandomGenerator.content({ paragraphs: 2 }),
        },
      },
    );
  typia.assert(post);
  // 4. Submit a report targeting the post
  const reportReason =
    "This post contains inappropriate content that violates community guidelines.";
  const report = await api.functional.communityPlatform.member.reports.create(
    memberConnection,
    {
      body: {
        community_id: community.id,
        target_type: "post",
        target_id: post.id,
        reason: reportReason,
      } satisfies ICommunityPlatformReport.ICreate,
    },
  );
  typia.assert(report);
  // 5. Validate report status is 'pending'
  TestValidator.equals("report status is pending", report.status, "pending");
  // 6. Validate target type and target ID are correct
  TestValidator.equals("target type is post", report.targetType, "post");
  // The target should be a post - validate it has the correct ID
  const targetPost = report.target as ICommunityPlatformPost;
  TestValidator.equals("target post ID matches", targetPost.id, post.id);
  // 7. Validate reporter information matches the authenticated member
  TestValidator.equals("reporter ID matches", report.member.id, member.id);
  // 8. Validate community reference is correct
  TestValidator.equals(
    "community ID matches",
    report.community.id,
    community.id,
  );
  // 9. Validate reason is stored as provided
  TestValidator.equals(
    "reason is stored correctly",
    report.reason,
    reportReason,
  );
  // 10. Validate resolvedBy and resolvedAt are null (pending status)
  TestValidator.equals("resolvedBy is null", report.resolvedBy, null);
  TestValidator.equals("resolvedAt is null", report.resolvedAt, null);
}
