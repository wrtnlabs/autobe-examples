import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformComment } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformComment";
import type { ICommunityPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunity";
import type { ICommunityPlatformCommunityImage } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunityImage";
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
import { generate_random_community_platform_member_posts_comments_create } from "../../../generate/generate_random_community_platform_member_posts_comments_create";
import { generate_random_community_platform_member_posts_create } from "../../../generate/generate_random_community_platform_member_posts_create";
import { generate_random_community_platform_member_reports_create } from "../../../generate/generate_random_community_platform_member_reports_create";
import { prepare_random_community_platform_comment } from "../../../prepare/prepare_random_community_platform_comment";
import { prepare_random_community_platform_community } from "../../../prepare/prepare_random_community_platform_community";
import { prepare_random_community_platform_community_image } from "../../../prepare/prepare_random_community_platform_community_image";
import { prepare_random_community_platform_post } from "../../../prepare/prepare_random_community_platform_post";
import { prepare_random_community_platform_report } from "../../../prepare/prepare_random_community_platform_report";
import { prepare_random_community_platform_subscription } from "../../../prepare/prepare_random_community_platform_subscription";

/**
 * Test that an authenticated member can successfully submit a report against a comment.
 *
 * Validates the complete report submission workflow: member registration, community
 * creation, subscription, post creation, comment creation, and report submission
 * targeting the comment. Ensures the report response contains all expected fields
 * with correct values.
 *
 * Special attention is given to verifying that the target type discriminator is
 * &quot;comment&quot;, the status is initially &quot;pending&quot;, the reporter and community
 * associations are correctly resolved, the comment target is populated with full
 * comment details, and the post target is absent.
 *
 * 1. Register a new member via join.
 * 2. Create a community as the member.
 * 3. Subscribe the member to the community.
 * 4. Create a text post in the community.
 * 5. Create a top-level comment on the post.
 * 6. Submit a report targeting the comment with a reason.
 * 7. Validate the report response structure and field values.
 */
export async function test_api_report_comment_submission(
  connection: api.IConnection,
): Promise<void> {
  // 1. Register a new member
  const memberConnection: api.IConnection = { host: connection.host };
  const member = await authorize_member_join(memberConnection, {});
  // 2. Create a community
  const community =
    await generate_random_community_platform_member_communities_create(
      memberConnection,
      {},
    );
  typia.assert(community);
  // 3. Subscribe the member to the community
  const subscription =
    await generate_random_community_platform_member_communities_subscribers_create(
      memberConnection,
      { params: { communityId: community.id } },
    );
  typia.assert(subscription);
  // 4. Create a post in the community
  const post = await generate_random_community_platform_member_posts_create(
    memberConnection,
    { body: { communityId: community.id } },
  );
  typia.assert(post);
  // 5. Create a comment on the post
  const comment =
    await generate_random_community_platform_member_posts_comments_create(
      memberConnection,
      { params: { postId: post.id } },
    );
  typia.assert(comment);
  // 6. Submit a report on the comment
  const reason = RandomGenerator.paragraph({ sentences: 2 });
  const report = await generate_random_community_platform_member_reports_create(
    memberConnection,
    {
      body: {
        targetType: "comment",
        targetId: comment.id,
        reason,
      },
    },
  );
  typia.assert(report);
  // 7. Validate report response fields
  TestValidator.equals("reason matches input", report.reason, reason);
  TestValidator.equals("target type is comment", report.target_type, "comment");
  TestValidator.equals("status is pending", report.status, "pending");
  TestValidator.equals(
    "reporter id matches member",
    report.reporter.id,
    member.id,
  );
  TestValidator.equals(
    "community id matches",
    report.community.id,
    community.id,
  );
  TestValidator.predicate(
    "reportPostTarget is absent",
    report.reportPostTarget === undefined,
  );
  TestValidator.predicate(
    "commentTarget is populated",
    report.commentTarget !== undefined,
  );
  TestValidator.equals(
    "commentTarget comment id matches",
    report.commentTarget!.comment.id,
    comment.id,
  );
  TestValidator.predicate(
    "created_at is valid date-time",
    !isNaN(Date.parse(report.created_at)),
  );
  TestValidator.predicate(
    "updated_at is valid date-time",
    !isNaN(Date.parse(report.updated_at)),
  );
}
