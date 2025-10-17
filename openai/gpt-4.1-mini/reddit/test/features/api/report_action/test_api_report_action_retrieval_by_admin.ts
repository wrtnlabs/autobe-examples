import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IRedditCommunityAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityAdmin";
import type { IRedditCommunityComment } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityComment";
import type { IRedditCommunityCommentVote } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityCommentVote";
import type { IRedditCommunityCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityCommunity";
import type { IRedditCommunityCommunityModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityCommunityModerator";
import type { IRedditCommunityCommunitySubscription } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityCommunitySubscription";
import type { IRedditCommunityMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityMember";
import type { IRedditCommunityPost } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityPost";
import type { IRedditCommunityPostVote } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityPostVote";
import type { IRedditCommunityPosts } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityPosts";
import type { IRedditCommunityReport } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityReport";
import type { IRedditCommunityReportAction } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityReportAction";
import type { IRedditCommunityReportStatus } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityReportStatus";
import type { IRedditCommunityUserKarma } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityUserKarma";
import type { IRedditCommunityUserProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityUserProfile";

/**
 * Test retrieval of a specific moderation report action by admin.
 *
 * This test simulates the real-world scenario of administrative moderation
 * workflows in a Reddit-like community platform. It involves multi-role
 * authentication, data creation, and validation of report action retrieval.
 *
 * Workflow:
 *
 * 1. Admin user registers and logs in.
 * 2. Admin creates a community.
 * 3. Admin assigns a member as community moderator.
 * 4. Admin creates a report status.
 * 5. Member user registers and logs in.
 * 6. Member creates a post in the community.
 * 7. Member creates a comment on the post.
 * 8. Member submits a content report referencing the post and comment with the
 *    report status.
 * 9. Admin creates a report action on the content report.
 * 10. Admin retrieves the report action by its ID and verifies response integrity
 *     and authorization.
 *
 * Validations include matching identifiers, presence of expected nested
 * summaries, and precise type validation.
 */
export async function test_api_report_action_retrieval_by_admin(
  connection: api.IConnection,
) {
  // 1. Admin user registration
  const adminCreateBody = {
    email: `admin${RandomGenerator.alphaNumeric(8)}@redditplatform.com`,
    password: "StrongPassword123!",
  } satisfies IRedditCommunityAdmin.ICreate;
  const adminAuthorized: IRedditCommunityAdmin.IAuthorized =
    await api.functional.auth.admin.join(connection, { body: adminCreateBody });
  typia.assert(adminAuthorized);

  // 2. Admin login - to switch to admin session explicitly
  const adminLoginBody = {
    email: adminCreateBody.email,
    password: adminCreateBody.password,
  } satisfies IRedditCommunityAdmin.ILogin;
  const adminLoginAuthorized: IRedditCommunityAdmin.IAuthorized =
    await api.functional.auth.admin.login(connection, { body: adminLoginBody });
  typia.assert(adminLoginAuthorized);

  // 3. Admin creates a community
  const communityCreateBody = {
    name: `community_${RandomGenerator.alphaNumeric(6)}`,
    description: RandomGenerator.paragraph({
      sentences: 5,
      wordMin: 4,
      wordMax: 8,
    }),
  } satisfies IRedditCommunityCommunity.ICreate;
  const community: IRedditCommunityCommunity =
    await api.functional.redditCommunity.member.communities.createCommunity(
      connection,
      { body: communityCreateBody },
    );
  typia.assert(community);

  // 4. Member user registration (to assign as moderator and create content)
  const memberCreateBody = {
    email: `member${RandomGenerator.alphaNumeric(8)}@redditplatform.com`,
    password: "MemberPass123!",
  } satisfies IRedditCommunityMember.ICreate;
  const memberAuthorized: IRedditCommunityMember.IAuthorized =
    await api.functional.auth.member.join(connection, {
      body: memberCreateBody,
    });
  typia.assert(memberAuthorized);

  // 5. Assign the member as community moderator
  const communityModeratorCreateBody = {
    member_id: memberAuthorized.id,
    community_id: community.id,
    assigned_at: new Date().toISOString(),
  } satisfies IRedditCommunityCommunityModerator.ICreate;
  // Admin context is used for this
  await api.functional.redditCommunity.admin.communities.communityModerators.create(
    connection,
    {
      communityId: community.id,
      body: communityModeratorCreateBody,
    },
  );

  // 6. Create a report status
  const reportStatusCreateBody = {
    name: `Status_${RandomGenerator.alphaNumeric(6)}`,
    description: "Test status for E2E moderation report action retrieval",
  } satisfies IRedditCommunityReportStatus.ICreate;
  const reportStatus: IRedditCommunityReportStatus =
    await api.functional.redditCommunity.admin.reportStatuses.create(
      connection,
      { body: reportStatusCreateBody },
    );
  typia.assert(reportStatus);

  // 7. Member creates a post in the community
  const postCreateBody = {
    reddit_community_community_id: community.id,
    post_type: "text",
    title: RandomGenerator.paragraph({ sentences: 3, wordMin: 5, wordMax: 10 }),
    body_text: RandomGenerator.content({
      paragraphs: 2,
      sentenceMin: 8,
      sentenceMax: 12,
      wordMin: 4,
      wordMax: 10,
    }),
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

  // 8. Member creates a comment on the post
  const commentCreateBody = {
    reddit_community_post_id: post.id,
    body_text: RandomGenerator.paragraph({
      sentences: 4,
      wordMin: 5,
      wordMax: 10,
    }),
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

  // 9. Member submits a content report referencing post and comment with status
  const reportCreateBody = {
    reporter_member_id: memberAuthorized.id,
    reported_post_id: post.id,
    reported_comment_id: comment.id,
    status_id: reportStatus.id,
    category: "abuse",
    description: "Inappropriate content reported during automated e2e test.",
  } satisfies IRedditCommunityReport.ICreate;
  const report: IRedditCommunityReport =
    await api.functional.redditCommunity.reports.create(connection, {
      body: reportCreateBody,
    });
  typia.assert(report);

  // 10. Admin creates a report action on the content report
  const reportActionCreateBody = {
    report_id: report.id,
    moderator_member_id: memberAuthorized.id, // Moderator member ID
    admin_member_id: adminAuthorized.id, // Admin member ID
    action_type: "warning",
    notes: "Automated test moderation action",
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  } satisfies IRedditCommunityReportAction.ICreate;
  const reportAction: IRedditCommunityReportAction =
    await api.functional.redditCommunity.admin.reports.reportActions.create(
      connection,
      {
        reportId: report.id,
        body: reportActionCreateBody,
      },
    );
  typia.assert(reportAction);

  // 11. Admin retrieves the report action by reportId and actionId
  const fetchedReportAction: IRedditCommunityReportAction =
    await api.functional.redditCommunity.admin.reports.reportActions.at(
      connection,
      {
        reportId: report.id,
        actionId: reportAction.id,
      },
    );
  typia.assert(fetchedReportAction);

  // Verifications of business logic and response integrity
  TestValidator.equals(
    "Report action ID should match",
    fetchedReportAction.id,
    reportAction.id,
  );
  TestValidator.equals(
    "Report ID should match",
    fetchedReportAction.report_id,
    report.id,
  );
  TestValidator.equals(
    "Moderator member ID should match",
    fetchedReportAction.moderator_member_id,
    memberAuthorized.id,
  );
  if (
    fetchedReportAction.admin_member_id !== null &&
    fetchedReportAction.admin_member_id !== undefined
  ) {
    TestValidator.equals(
      "Admin member ID should match",
      fetchedReportAction.admin_member_id,
      adminAuthorized.id,
    );
  }
  TestValidator.predicate(
    "Report action contains report reference",
    fetchedReportAction.report !== undefined &&
      fetchedReportAction.report !== null,
  );
  TestValidator.predicate(
    "Report action contains moderator member summary",
    fetchedReportAction.moderatorMember !== undefined &&
      fetchedReportAction.moderatorMember !== null,
  );
  TestValidator.predicate(
    "Report action contains admin member summary",
    fetchedReportAction.adminMember !== undefined,
  );
}
