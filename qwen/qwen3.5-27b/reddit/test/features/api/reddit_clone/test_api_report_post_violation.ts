import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IRedditCloneComment } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneComment";
import type { IRedditCloneCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneCommunity";
import type { IRedditCloneCommunitySubscription } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneCommunitySubscription";
import type { IRedditCloneMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneMember";
import type { IRedditClonePost } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditClonePost";
import type { IRedditCloneReport } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneReport";
import type { IRedditCloneUserProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneUserProfile";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";
import { generate_random_reddit_clone_member_posts_create } from "../../../generate/generate_random_reddit_clone_member_posts_create";
import { generate_random_reddit_clone_member_reports_create } from "../../../generate/generate_random_reddit_clone_member_reports_create";
import { generate_random_reddit_clone_member_subscriptions_create } from "../../../generate/generate_random_reddit_clone_member_subscriptions_create";
import { prepare_random_reddit_clone_community_subscription } from "../../../prepare/prepare_random_reddit_clone_community_subscription";
import { prepare_random_reddit_clone_post } from "../../../prepare/prepare_random_reddit_clone_post";
import { prepare_random_reddit_clone_report } from "../../../prepare/prepare_random_reddit_clone_report";

/**
 * Test that an authenticated member can successfully report a post for violating community guidelines.
 *
 * Validates the complete post reporting workflow including member authentication, community subscription, post creation, and report submission. Ensures that reports are created with 'pending' status, correctly reference the reported post and reporter, and preserve the reason text provided by the reporter.
 *
 * The test verifies that the report entity contains accurate relationships to both the reporter's profile and the reported post's details, including author information and community context.
 *
 * 1. Authenticate a new member using the join endpoint.
 * 2. Subscribe the member to a community (required to create posts).
 * 3. Create a post in the subscribed community.
 * 4. Report the post with a valid reason explaining the violation.
 * 5. Validate that the report is created with 'pending' status, correct reporter information, and accurate post reference.
 */
export async function test_api_report_post_violation(
  connection: api.IConnection,
): Promise<void> {
  // 1. Authenticate member
  const memberConnection: api.IConnection = { host: connection.host };
  const member = await authorize_member_join(memberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      username: RandomGenerator.name(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    } satisfies IRedditCloneMember.IJoin,
  });
  typia.assert(member);
  // 2. Subscribe to a community
  const communityId = typia.random<string & tags.Format<"uuid">>();
  const subscription =
    await generate_random_reddit_clone_member_subscriptions_create(
      memberConnection,
      {
        body: {
          community_id: communityId,
        } satisfies IRedditCloneCommunitySubscription.ICreate,
      },
    );
  typia.assert(subscription);
  // 3. Create a post in the subscribed community
  const post = await generate_random_reddit_clone_member_posts_create(
    memberConnection,
    {
      body: {
        title: RandomGenerator.paragraph({ sentences: 3 }),
        post_type: "text",
        community_id: communityId,
        text_content: RandomGenerator.content({ paragraphs: 2 }),
      } satisfies IRedditClonePost.ICreate,
    },
  );
  typia.assert(post);
  // 4. Report the post
  const reportReason =
    "This post violates community guidelines regarding spam content.";
  const report = await generate_random_reddit_clone_member_reports_create(
    memberConnection,
    {
      body: {
        report_type: "post",
        post_id: post.id,
        reason: reportReason,
      } satisfies IRedditCloneReport.ICreate,
    },
  );
  typia.assert(report);
  // 5. Validate report data
  TestValidator.equals("report status is pending", report.status, "pending");
  TestValidator.equals(
    "reporter username matches member",
    report.reporter.username,
    member.username,
  );
  TestValidator.equals(
    "reported post id matches",
    report.reportedPost?.id,
    post.id,
  );
  TestValidator.equals("reason text preserved", report.reason, reportReason);
  TestValidator.predicate(
    "reported post title matches",
    report.reportedPost?.title === post.title,
  );
  TestValidator.predicate(
    "reported post author matches",
    report.reportedPost?.author.id === post.author.id,
  );
  TestValidator.predicate(
    "reported post community matches",
    report.reportedPost?.community.id === post.community.id,
  );
  TestValidator.predicate(
    "comment reference is null for post report",
    report.reportedComment === null,
  );
}
