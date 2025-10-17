import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IRedditCommunityComment } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityComment";
import type { IRedditCommunityCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityCommunity";
import type { IRedditCommunityCommunityModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityCommunityModerator";
import type { IRedditCommunityPosts } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityPosts";
import type { IRedditCommunityReport } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityReport";
import type { IRedditCommunityReportStatus } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityReportStatus";

/**
 * Test detailed retrieval of content reports by community moderators.
 *
 * This test covers the comprehensive business flow for community moderators to
 * access detailed information about content reports in the redditCommunity
 * platform.
 *
 * Steps:
 *
 * 1. Community moderator signs up and authenticates.
 * 2. Create a community.
 * 3. Create a text post in the community.
 * 4. Add a comment to the post.
 * 5. Create a unique report status.
 * 6. File a content report against the post.
 * 7. Retrieve report details by report ID as community moderator and validate all
 *    properties.
 * 8. Attempt retrieval of a report with invalid ID and confirm error is thrown.
 *
 * All responses are validated with typia.assert for full schema compliance.
 * Business validations use TestValidator with descriptive messages. The test
 * respects all API schema rules, formats, and required properties. Async calls
 * are properly awaited, and no direct header manipulation is performed. No
 * forbidden test scenarios (type errors/status code checks) are included.
 */
export async function test_api_content_report_detailed_retrieval_by_community_moderator(
  connection: api.IConnection,
) {
  // 1. Community moderator signs up
  const moderatorEmail = typia.random<string & tags.Format<"email">>();
  const moderatorPassword = "ModPass1234!";
  const moderator: IRedditCommunityCommunityModerator.IAuthorized =
    await api.functional.auth.communityModerator.join.joinCommunityModerator(
      connection,
      {
        body: {
          email: moderatorEmail,
          password: moderatorPassword,
        } satisfies IRedditCommunityCommunityModerator.IJoin,
      },
    );
  typia.assert(moderator);

  // 2. Create a community
  const communityCreateBody = {
    name: RandomGenerator.name(2).replace(/\s+/g, "_").toLowerCase(),
    description: RandomGenerator.content({ paragraphs: 1 }),
  } satisfies IRedditCommunityCommunity.ICreate;
  const community: IRedditCommunityCommunity =
    await api.functional.redditCommunity.member.communities.createCommunity(
      connection,
      {
        body: communityCreateBody,
      },
    );
  typia.assert(community);

  // 3. Create a text post in the community
  const postCreateBody = {
    reddit_community_community_id: community.id,
    post_type: "text",
    title: RandomGenerator.paragraph({ sentences: 3, wordMin: 5, wordMax: 10 }),
    body_text: RandomGenerator.content({ paragraphs: 2 }),
  } satisfies IRedditCommunityPosts.ICreate;
  const post: IRedditCommunityPosts =
    await api.functional.redditCommunity.member.communities.posts.createPost(
      connection,
      {
        communityId: community.id,
        body: postCreateBody,
      },
    );
  typia.assert(post);

  // 4. Create a comment on the post
  const commentCreateBody = {
    reddit_community_post_id: post.id,
    body_text: RandomGenerator.paragraph({ sentences: 4 }),
  } satisfies IRedditCommunityComment.ICreate;
  const comment: IRedditCommunityComment =
    await api.functional.redditCommunity.member.posts.comments.create(
      connection,
      {
        postId: post.id,
        body: commentCreateBody,
      },
    );
  typia.assert(comment);

  // 5. Create a report status
  const reportStatusCreateBody = {
    name: `status_${RandomGenerator.alphaNumeric(8)}`,
    description: "Status for testing content report retrieval",
  } satisfies IRedditCommunityReportStatus.ICreate;
  const reportStatus: IRedditCommunityReportStatus =
    await api.functional.redditCommunity.admin.reportStatuses.create(
      connection,
      {
        body: reportStatusCreateBody,
      },
    );
  typia.assert(reportStatus);

  // 6. Create a content report targeting the post
  const reportCreateBody = {
    reporter_member_id: moderator.id,
    reported_post_id: post.id,
    status_id: reportStatus.id,
    category: "spam",
    description: "This is a test content report against the post.",
  } satisfies IRedditCommunityReport.ICreate;
  const report: IRedditCommunityReport =
    await api.functional.redditCommunity.reports.create(connection, {
      body: reportCreateBody,
    });
  typia.assert(report);

  // 7. Retrieve the report details by the community moderator
  const retrievedReport: IRedditCommunityReport =
    await api.functional.redditCommunity.communityModerator.reports.at(
      connection,
      {
        reportId: report.id,
      },
    );
  typia.assert(retrievedReport);

  // Validate all expected properties with TestValidator
  TestValidator.equals("report id should match", retrievedReport.id, report.id);
  TestValidator.equals(
    "report reporter member ID should match",
    retrievedReport.reporter_member_id,
    reportCreateBody.reporter_member_id,
  );
  TestValidator.equals(
    "report reported post ID should match",
    retrievedReport.reported_post_id,
    reportCreateBody.reported_post_id,
  );
  TestValidator.equals(
    "report category should match",
    retrievedReport.category,
    reportCreateBody.category,
  );
  TestValidator.equals(
    "report description should match",
    retrievedReport.description,
    reportCreateBody.description,
  );
  TestValidator.equals(
    "report status id should match",
    retrievedReport.status_id,
    reportCreateBody.status_id,
  );
  TestValidator.predicate(
    "report created_at should be defined",
    retrievedReport.created_at !== null &&
      retrievedReport.created_at !== undefined,
  );
  TestValidator.predicate(
    "report updated_at should be defined",
    retrievedReport.updated_at !== null &&
      retrievedReport.updated_at !== undefined,
  );

  // 8. Attempt retrieving a report by a fake random UUID - expect error
  const fakeReportId = typia.random<string & tags.Format<"uuid">>();
  await TestValidator.error(
    "retrieving non-existent report should fail",
    async () => {
      await api.functional.redditCommunity.communityModerator.reports.at(
        connection,
        {
          reportId: fakeReportId,
        },
      );
    },
  );
}
