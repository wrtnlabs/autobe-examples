import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformComment } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformComment";
import type { ICommunityPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunity";
import type { ICommunityPlatformCommunityImage } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunityImage";
import type { ICommunityPlatformCommunityReport } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunityReport";
import type { ICommunityPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMember";
import type { ICommunityPlatformPost } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformPost";
import type { ICommunityPlatformProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformProfile";
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
import { generate_random_community_platform_member_community_reports_create } from "../../../generate/generate_random_community_platform_member_community_reports_create";
import { generate_random_community_platform_member_posts_comments_create } from "../../../generate/generate_random_community_platform_member_posts_comments_create";
import { generate_random_community_platform_member_posts_create } from "../../../generate/generate_random_community_platform_member_posts_create";
import { prepare_random_community_platform_comment } from "../../../prepare/prepare_random_community_platform_comment";
import { prepare_random_community_platform_community } from "../../../prepare/prepare_random_community_platform_community";
import { prepare_random_community_platform_community_image } from "../../../prepare/prepare_random_community_platform_community_image";
import { prepare_random_community_platform_community_report } from "../../../prepare/prepare_random_community_platform_community_report";
import { prepare_random_community_platform_post } from "../../../prepare/prepare_random_community_platform_post";

/**
 * Test that an authenticated member can successfully report a comment that violates community standards.
 *
 * Validates the complete report creation flow including member registration, community creation, post creation, comment creation, and report submission. Ensures that the report correctly references the reported comment and the target community, and that the initial status is "pending" awaiting moderator review.
 *
 * Special attention is given to verifying that the report's targetComment correctly references the created comment's ID, that targetPost is null for comment-targeted reports, and that the reporter identity matches the authenticated member.
 *
 * 1. Register a new member and authenticate the connection.
 * 2. The member creates a community.
 * 3. The member creates a text-type post in the community.
 * 4. The member creates a top-level comment on the post.
 * 5. The member submits a report against the comment with a violation reason.
 * 6. Validates report fields match input data and expected values.
 */
export async function test_api_report_comment_success(
  connection: api.IConnection,
): Promise<void> {
  // 1. Member setup
  const memberConnection: api.IConnection = { host: connection.host };
  const authorized = await authorize_member_join(memberConnection, {});
  typia.assert(authorized);
  // 2. Create community
  const community =
    await generate_random_community_platform_member_communities_create(
      memberConnection,
      {},
    );
  typia.assert(community);
  // 3. Create text post in the community
  const postBody: DeepPartial<ICommunityPlatformPost.ICreate> = {
    communityId: community.id,
    type: "text",
    title: RandomGenerator.paragraph({ sentences: 2 }),
    body: RandomGenerator.content({ paragraphs: 2 }),
  };
  const post = await generate_random_community_platform_member_posts_create(
    memberConnection,
    {
      body: postBody,
    },
  );
  typia.assert(post);
  // 4. Create top-level comment on the post
  const commentBody: DeepPartial<ICommunityPlatformComment.ICreate> = {
    content: RandomGenerator.paragraph({ sentences: 3 }),
    commentId: null,
  };
  const comment =
    await generate_random_community_platform_member_posts_comments_create(
      memberConnection,
      {
        params: { postId: post.id },
        body: commentBody,
      },
    );
  typia.assert(comment);
  // 5. Report the comment
  const reason = RandomGenerator.paragraph({ sentences: 2 });
  const reportBody: DeepPartial<ICommunityPlatformCommunityReport.ICreate> = {
    targetId: comment.id,
    targetType: "comment",
    reason,
  };
  const report =
    await generate_random_community_platform_member_community_reports_create(
      memberConnection,
      {
        body: reportBody,
      },
    );
  typia.assert(report);
  // 6. Validate report fields
  TestValidator.equals(
    "community id matches",
    report.community.id,
    community.id,
  );
  TestValidator.equals(
    "reporter id matches",
    report.reporter.id,
    authorized.id,
  );
  TestValidator.equals("target type is comment", report.targetType, "comment");
  TestValidator.predicate("targetPost is null", report.targetPost === null);
  TestValidator.equals(
    "targetComment id matches",
    report.targetComment!.id,
    comment.id,
  );
  TestValidator.equals("reason matches", report.reason, reason);
  TestValidator.equals("status is pending", report.status, "pending");
}
