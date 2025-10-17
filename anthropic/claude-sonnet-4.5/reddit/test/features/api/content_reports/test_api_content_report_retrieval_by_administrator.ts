import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IRedditLikeAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikeAdmin";
import type { IRedditLikeCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikeCommunity";
import type { IRedditLikeContentReport } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikeContentReport";
import type { IRedditLikeMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikeMember";
import type { IRedditLikePost } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikePost";

/**
 * Test platform administrator retrieval of content reports.
 *
 * Validates that administrators have unrestricted platform-wide access to all
 * content reports across communities. This test creates a complete workflow
 * from content creation through reporting to admin retrieval, ensuring proper
 * oversight capabilities.
 *
 * Steps:
 *
 * 1. Create member account for content creation and reporting
 * 2. Member creates a community for content posting
 * 3. Member creates a post within the community
 * 4. Submit a content report for the post
 * 5. Create administrator account
 * 6. Administrator retrieves the content report to verify access
 * 7. Validate report details match the submitted report
 */
export async function test_api_content_report_retrieval_by_administrator(
  connection: api.IConnection,
) {
  // Step 1: Create member account
  const memberData = {
    username: RandomGenerator.name(1),
    email: typia.random<string & tags.Format<"email">>(),
    password: typia.random<string & tags.MinLength<8>>(),
  } satisfies IRedditLikeMember.ICreate;

  const member: IRedditLikeMember.IAuthorized =
    await api.functional.auth.member.join(connection, {
      body: memberData,
    });
  typia.assert(member);

  // Step 2: Member creates a community
  const communityData = {
    code: RandomGenerator.alphaNumeric(10),
    name: RandomGenerator.name(2),
    description: RandomGenerator.paragraph({ sentences: 3 }),
    privacy_type: "public",
    posting_permission: "anyone_subscribed",
    allow_text_posts: true,
    allow_link_posts: true,
    allow_image_posts: true,
    primary_category: "general",
  } satisfies IRedditLikeCommunity.ICreate;

  const community: IRedditLikeCommunity =
    await api.functional.redditLike.member.communities.create(connection, {
      body: communityData,
    });
  typia.assert(community);

  // Step 3: Member creates a post
  const postData = {
    community_id: community.id,
    type: "text",
    title: RandomGenerator.paragraph({ sentences: 2 }),
    body: RandomGenerator.content({ paragraphs: 2 }),
  } satisfies IRedditLikePost.ICreate;

  const post: IRedditLikePost =
    await api.functional.redditLike.member.posts.create(connection, {
      body: postData,
    });
  typia.assert(post);

  // Step 4: Submit content report
  const violationCategories = ["spam", "harassment"] as const;
  const reportData = {
    reported_post_id: post.id,
    community_id: community.id,
    content_type: "post",
    violation_categories: RandomGenerator.pick(violationCategories),
    additional_context: RandomGenerator.paragraph({ sentences: 2 }),
  } satisfies IRedditLikeContentReport.ICreate;

  const report: IRedditLikeContentReport =
    await api.functional.redditLike.content_reports.create(connection, {
      body: reportData,
    });
  typia.assert(report);

  // Step 5: Create administrator account
  const adminData = {
    username: RandomGenerator.name(1),
    email: typia.random<string & tags.Format<"email">>(),
    password: typia.random<string & tags.MinLength<8>>(),
  } satisfies IRedditLikeAdmin.ICreate;

  const admin: IRedditLikeAdmin.IAuthorized =
    await api.functional.auth.admin.join(connection, {
      body: adminData,
    });
  typia.assert(admin);

  // Step 6: Administrator retrieves the content report
  const retrievedReport: IRedditLikeContentReport =
    await api.functional.redditLike.admin.content_reports.at(connection, {
      reportId: report.id,
    });
  typia.assert(retrievedReport);

  // Step 7: Validate report details
  TestValidator.equals("report ID matches", retrievedReport.id, report.id);
  TestValidator.equals(
    "content type matches",
    retrievedReport.content_type,
    report.content_type,
  );
  TestValidator.equals(
    "violation categories match",
    retrievedReport.violation_categories,
    report.violation_categories,
  );
  TestValidator.equals(
    "report status matches",
    retrievedReport.status,
    report.status,
  );
  TestValidator.equals(
    "additional context matches",
    retrievedReport.additional_context,
    report.additional_context,
  );
}
