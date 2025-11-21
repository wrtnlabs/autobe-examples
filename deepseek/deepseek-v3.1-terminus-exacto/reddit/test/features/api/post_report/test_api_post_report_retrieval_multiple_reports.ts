import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { ICommunityPlatformAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAuthorizationToken";
import type { ICommunityPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunity";
import type { ICommunityPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMember";
import type { ICommunityPlatformPost } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformPost";
import type { ICommunityPlatformPostReport } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformPostReport";

/**
 * Test retrieval of a specific report when multiple reports exist for the same
 * post. This scenario validates that the system correctly identifies and
 * returns the specific report requested by its unique identifier, even when
 * multiple reports have been filed against the same post. It ensures proper
 * report isolation and accurate identification mechanisms work correctly in
 * multi-report scenarios.
 */
export async function test_api_post_report_retrieval_multiple_reports(
  connection: api.IConnection,
) {
  // Step 1: Create member account for authentication context (dependency)
  const memberEmail = typia.random<string & tags.Format<"email">>();
  const member = await api.functional.auth.member.join(connection, {
    body: {
      email: memberEmail,
      password: "password123",
      display_name: RandomGenerator.name(),
      href: "https://example.com/register",
      referrer: "https://example.com",
    } satisfies ICommunityPlatformMember.ICreate,
  });
  typia.assert(member);

  // Step 2: Create a post that will receive multiple reports (dependency)
  // Using a realistic community ID format - in a real scenario, this would come from an existing community
  const post = await api.functional.communityPlatform.member.posts.create(
    connection,
    {
      body: {
        title: RandomGenerator.paragraph({ sentences: 5 }),
        post_type: "text",
        status: "published",
        community_platform_community_id: typia.random<
          string & tags.Format<"uuid">
        >(),
      } satisfies ICommunityPlatformPost.ICreate,
    },
  );
  typia.assert(post);

  // Step 3: Create first report on the post (dependency)
  const firstReport =
    await api.functional.communityPlatform.member.posts.reports.create(
      connection,
      {
        postId: post.id,
        body: {
          actor_type: "member",
          report_reason: "Inappropriate content",
          report_details: "This post contains offensive language",
        } satisfies ICommunityPlatformPostReport.ICreate,
      },
    );
  typia.assert(firstReport);

  // Step 4: Create second report on the same post (dependency)
  const secondReport =
    await api.functional.communityPlatform.member.posts.reports.create(
      connection,
      {
        postId: post.id,
        body: {
          actor_type: "member",
          report_reason: "Spam",
          report_details: "This post appears to be promotional spam",
        } satisfies ICommunityPlatformPostReport.ICreate,
      },
    );
  typia.assert(secondReport);

  // Step 5: Retrieve the specific report by its ID and validate
  const retrievedReport =
    await api.functional.communityPlatform.member.posts.reports.at(connection, {
      postId: post.id,
      reportId: secondReport.id,
    });
  typia.assert(retrievedReport);

  // Validate that the retrieved report matches the second report
  TestValidator.equals(
    "retrieved report ID matches second report ID",
    retrievedReport.id,
    secondReport.id,
  );
  TestValidator.equals(
    "retrieved report reason matches",
    retrievedReport.report_reason,
    secondReport.report_reason,
  );
  TestValidator.equals(
    "retrieved report details match",
    retrievedReport.report_details,
    secondReport.report_details,
  );
  TestValidator.equals(
    "retrieved report actor type matches",
    retrievedReport.actor_type,
    secondReport.actor_type,
  );

  // Validate that the post reference is correctly included
  TestValidator.predicate(
    "retrieved report has post reference",
    retrievedReport.post !== undefined,
  );
  TestValidator.equals(
    "retrieved report post ID matches original post",
    retrievedReport.post?.id,
    post.id,
  );

  // Validate that the first report is different from the retrieved report
  TestValidator.notEquals(
    "first report ID differs from retrieved report ID",
    firstReport.id,
    retrievedReport.id,
  );
  TestValidator.notEquals(
    "first report reason differs from retrieved report",
    firstReport.report_reason,
    retrievedReport.report_reason,
  );
}
