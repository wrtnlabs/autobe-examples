import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IRedditLikeCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikeCommunity";
import type { IRedditLikeCommunityModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikeCommunityModerator";
import type { IRedditLikeContentReport } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikeContentReport";
import type { IRedditLikeMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikeMember";
import type { IRedditLikeModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikeModerator";
import type { IRedditLikePost } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikePost";

/**
 * Test content report retrieval by moderator workflow.
 *
 * This test validates the complete moderation workflow where users report
 * content and moderators retrieve detailed report information. The scenario
 * creates a realistic flow: a member creates a community, posts content,
 * another user reports that content, a moderator is assigned to the community,
 * and finally the moderator retrieves the full report details to review for
 * moderation decisions. This validates role-based access control ensuring
 * moderators can access reports for communities they moderate.
 *
 * Workflow:
 *
 * 1. Create member account for community creation
 * 2. Member creates a community
 * 3. Member creates a post in that community
 * 4. Submit content report for the post
 * 5. Create moderator account
 * 6. Assign moderator to the community
 * 7. Moderator retrieves the content report details
 * 8. Validate report contains expected information
 */
export async function test_api_content_report_retrieval_by_moderator(
  connection: api.IConnection,
) {
  // Step 1: Create member account for community creation and post creation
  const memberData = {
    username: RandomGenerator.name(1) + RandomGenerator.alphaNumeric(4),
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(12),
  } satisfies IRedditLikeMember.ICreate;

  const member: IRedditLikeMember.IAuthorized =
    await api.functional.auth.member.join(connection, {
      body: memberData,
    });
  typia.assert(member);

  // Step 2: Create community where the reportable content will be posted
  const communityData = {
    code: RandomGenerator.alphabets(8),
    name: RandomGenerator.name(2),
    description: RandomGenerator.paragraph({ sentences: 3 }),
    privacy_type: "public",
    posting_permission: "anyone_subscribed",
    allow_text_posts: true,
    allow_link_posts: true,
    allow_image_posts: true,
    primary_category: "technology",
  } satisfies IRedditLikeCommunity.ICreate;

  const community: IRedditLikeCommunity =
    await api.functional.redditLike.member.communities.create(connection, {
      body: communityData,
    });
  typia.assert(community);

  // Step 3: Create post that will be reported for content violations
  const postData = {
    community_id: community.id,
    type: "text",
    title: RandomGenerator.paragraph({ sentences: 1, wordMin: 3, wordMax: 8 }),
    body: RandomGenerator.content({ paragraphs: 2 }),
  } satisfies IRedditLikePost.ICreate;

  const post: IRedditLikePost =
    await api.functional.redditLike.member.posts.create(connection, {
      body: postData,
    });
  typia.assert(post);

  // Step 4: Submit content report for the post to create the report record
  const reportData = {
    reported_post_id: post.id,
    community_id: community.id,
    content_type: "post",
    violation_categories: "spam,harassment",
    additional_context: RandomGenerator.paragraph({ sentences: 2 }),
  } satisfies IRedditLikeContentReport.ICreate;

  const report: IRedditLikeContentReport =
    await api.functional.redditLike.content_reports.create(connection, {
      body: reportData,
    });
  typia.assert(report);

  // Step 5: Create moderator account for report retrieval and review
  const moderatorData = {
    username: RandomGenerator.name(1) + RandomGenerator.alphaNumeric(4),
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(12),
  } satisfies IRedditLikeModerator.ICreate;

  const moderator: IRedditLikeModerator.IAuthorized =
    await api.functional.auth.moderator.join(connection, {
      body: moderatorData,
    });
  typia.assert(moderator);

  // Step 6: Assign moderator to the community to grant report access permissions
  const moderatorAssignment = {
    moderator_id: moderator.id,
    permissions: "manage_posts,manage_comments,access_reports",
  } satisfies IRedditLikeCommunityModerator.ICreate;

  const assignedModerator: IRedditLikeCommunityModerator =
    await api.functional.redditLike.moderator.communities.moderators.create(
      connection,
      {
        communityId: community.id,
        body: moderatorAssignment,
      },
    );
  typia.assert(assignedModerator);

  // Step 7: Moderator retrieves the content report details
  const retrievedReport: IRedditLikeContentReport =
    await api.functional.redditLike.moderator.content_reports.at(connection, {
      reportId: report.id,
    });
  typia.assert(retrievedReport);

  // Step 8: Validate report contains expected information
  TestValidator.equals("report ID matches", retrievedReport.id, report.id);
  TestValidator.equals(
    "content type is post",
    retrievedReport.content_type,
    "post",
  );
  TestValidator.equals(
    "violation categories match",
    retrievedReport.violation_categories,
    "spam,harassment",
  );
  TestValidator.predicate(
    "report status is valid",
    retrievedReport.status === "pending" ||
      retrievedReport.status === "reviewed" ||
      retrievedReport.status === "dismissed",
  );
}
