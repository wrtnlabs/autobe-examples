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
import { generate_random_community_platform_member_posts_create } from "../../../generate/generate_random_community_platform_member_posts_create";
import { generate_random_community_platform_member_reports_create } from "../../../generate/generate_random_community_platform_member_reports_create";
import { prepare_random_community_platform_community } from "../../../prepare/prepare_random_community_platform_community";
import { prepare_random_community_platform_community_image } from "../../../prepare/prepare_random_community_platform_community_image";
import { prepare_random_community_platform_post } from "../../../prepare/prepare_random_community_platform_post";
import { prepare_random_community_platform_report } from "../../../prepare/prepare_random_community_platform_report";
import { prepare_random_community_platform_subscription } from "../../../prepare/prepare_random_community_platform_subscription";

/**
 * Test that a community owner/moderator can retrieve a pending report targeting a post.
 *
 * Validates the full report retrieval workflow where a community owner, acting as
 * moderator, retrieves a report submitted by another member against a post in their
 * community. The test exercises the complete data chain: member registration,
 * community creation, subscription, post creation, report submission, and moderator
 * report retrieval.
 *
 * Special attention is given to verifying that the retrieved report correctly references
 * the submitted reason, maintains pending status, identifies the reporter, scopes to
 * the correct community, and includes the full post target details via the
 * reportPostTarget association.
 *
 * 1. Member A (moderator) registers and authenticates.
 * 2. Member A creates a community, becoming its owner.
 * 3. Member A subscribes to the community.
 * 4. Member A creates a text post.
 * 5. Member B (reporter) registers and authenticates.
 * 6. Member B submits a report against the post with targetType "post".
 * 7. Member A retrieves the report via the moderator endpoint.
 * 8. Validates every field of the response matches expected values.
 */
export async function test_api_report_retrieval_by_moderator_for_post_target(
  connection: api.IConnection,
): Promise<void> {
  // 1. Member A joins
  const memberAConnection: api.IConnection = { host: connection.host };
  const memberA = await authorize_member_join(memberAConnection, {});
  typia.assert(memberA);
  // 2. Member A creates a community
  const community =
    await generate_random_community_platform_member_communities_create(
      memberAConnection,
      {},
    );
  typia.assert(community);
  // 3. Member A subscribes to the community
  const subscription =
    await generate_random_community_platform_member_communities_subscribers_create(
      memberAConnection,
      { params: { communityId: community.id } },
    );
  typia.assert(subscription);
  // 4. Member A creates a text post
  const postTitle = RandomGenerator.paragraph({ sentences: 1 });
  const postBody = RandomGenerator.paragraph({ sentences: 3 });
  const post = await generate_random_community_platform_member_posts_create(
    memberAConnection,
    {
      body: {
        communityId: community.id,
        type: "text" as const,
        title: postTitle,
        body: postBody,
      },
    },
  );
  typia.assert(post);
  // 5. Member B joins
  const memberBConnection: api.IConnection = { host: connection.host };
  const memberB = await authorize_member_join(memberBConnection, {});
  typia.assert(memberB);
  // 6. Member B reports Member A's post
  const reason = RandomGenerator.paragraph({ sentences: 2 });
  const report = await generate_random_community_platform_member_reports_create(
    memberBConnection,
    {
      body: {
        targetType: "post" as const,
        targetId: post.id,
        reason: reason,
      },
    },
  );
  typia.assert(report);
  // 7. Member A (community owner) retrieves the report
  const retrieved = await api.functional.communityPlatform.member.reports.at(
    memberAConnection,
    { reportId: report.id },
  );
  typia.assert(retrieved);
  // 8. Validate business logic
  TestValidator.equals("report id matches", retrieved.id, report.id);
  TestValidator.equals("reason matches submission", retrieved.reason, reason);
  TestValidator.equals("status is pending", retrieved.status, "pending");
  TestValidator.equals("target_type is post", retrieved.target_type, "post");
  TestValidator.equals(
    "reporter username",
    retrieved.reporter.username,
    memberB.username,
  );
  TestValidator.equals(
    "community name",
    retrieved.community.name,
    community.name,
  );
  // Validate reportPostTarget contains the expected post
  TestValidator.predicate(
    "reportPostTarget exists for post-targeted report",
    retrieved.reportPostTarget !== null &&
      retrieved.reportPostTarget !== undefined,
  );
  const postTarget = retrieved.reportPostTarget!;
  TestValidator.equals("post id matches", postTarget.post.id, post.id);
  TestValidator.equals("post title matches", postTarget.post.title, post.title);
  TestValidator.equals(
    "post vote score",
    postTarget.post.vote_score,
    post.vote_score,
  );
  TestValidator.equals(
    "post comment count",
    postTarget.post.comment_count,
    post.comment_count,
  );
  TestValidator.equals(
    "post author username",
    postTarget.post.author.username,
    memberA.username,
  );
  TestValidator.equals(
    "post community name",
    postTarget.post.community.name,
    community.name,
  );
}
