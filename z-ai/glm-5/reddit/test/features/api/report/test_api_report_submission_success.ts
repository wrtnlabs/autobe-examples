import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformComment } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformComment";
import type { ICommunityPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunity";
import type { ICommunityPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMember";
import type { ICommunityPlatformPost } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformPost";
import type { ICommunityPlatformReport } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformReport";
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
import { generate_random_community_platform_member_posts_create } from "../../../generate/generate_random_community_platform_member_posts_create";
import { generate_random_community_platform_member_reports_create } from "../../../generate/generate_random_community_platform_member_reports_create";
import { generate_random_community_platform_member_subscriptions_create } from "../../../generate/generate_random_community_platform_member_subscriptions_create";
import { prepare_random_community_platform_community } from "../../../prepare/prepare_random_community_platform_community";
import { prepare_random_community_platform_post } from "../../../prepare/prepare_random_community_platform_post";
import { prepare_random_community_platform_report } from "../../../prepare/prepare_random_community_platform_report";
import { prepare_random_community_platform_subscription } from "../../../prepare/prepare_random_community_platform_subscription";

/**
 * Test successful report submission for a post that violates community standards.
 *
 * This test validates the complete report creation workflow:
 * 1. Member registration and authentication
 * 2. Community creation and subscription
 * 3. Post creation within the community
 * 4. Report submission for the post
 * 5. Validation of report response data
 */
export async function test_api_report_submission_success(
  connection: api.IConnection,
): Promise<void> {
  // 1. Member setup - create connection and register
  const memberConnection: api.IConnection = { host: connection.host };
  const authorizedMember = await authorize_member_join(memberConnection, {});
  typia.assert(authorizedMember);
  // 2. Create a community
  const community =
    await generate_random_community_platform_member_communities_create(
      memberConnection,
      {},
    );
  typia.assert(community);
  // 3. Subscribe to the community (required for posting)
  const subscription =
    await generate_random_community_platform_member_subscriptions_create(
      memberConnection,
      {
        body: {
          community_id: community.id,
        },
      },
    );
  typia.assert(subscription);
  // 4. Create a post in the community
  const post = await generate_random_community_platform_member_posts_create(
    memberConnection,
    {
      body: {
        communityId: community.id,
      },
    },
  );
  typia.assert(post);
  // 5. Submit a report for the post
  const reason = RandomGenerator.paragraph({ sentences: 5 });
  const report = await api.functional.communityPlatform.member.reports.create(
    memberConnection,
    {
      body: {
        reason,
        communityId: community.id,
        postId: post.id,
        commentId: undefined,
      } satisfies ICommunityPlatformReport.ICreate,
    },
  );
  typia.assert(report);
  // 6. Validate report response
  TestValidator.equals("reason matches", report.reason, reason);
  TestValidator.equals("status is pending", report.status, "pending");
  TestValidator.equals("content_type is post", report.content_type, "post");
  TestValidator.equals(
    "community id matches",
    report.community.id,
    community.id,
  );
  TestValidator.equals(
    "reporter id matches",
    report.reporter.id,
    authorizedMember.id,
  );
  // Validate the content is the reported post
  if (report.content_type === "post") {
    const reportedPost = typia.assert<ICommunityPlatformPost>(report.content);
    TestValidator.equals("content post id matches", reportedPost.id, post.id);
    TestValidator.equals(
      "content post title matches",
      reportedPost.title,
      post.title,
    );
  }
  // Validate timestamps exist
  TestValidator.predicate("created_at is valid", report.created_at.length > 0);
  TestValidator.predicate("updated_at is valid", report.updated_at.length > 0);
}