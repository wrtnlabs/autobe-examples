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
 * Verify report action creation by admin.
 *
 * This test verifies the complete workflow of creating a moderation action
 * linked to a specific content report in a Reddit-like community platform. It
 * exercises multi-role authentication (member and admin), community and content
 * creation, report status setup, reporting of content, and finally creation of
 * the report action by an admin moderator.
 *
 * Process:
 *
 * 1. Register and login as a member user
 * 2. Create a community
 * 3. Assign the member as a community moderator
 * 4. Create a post and a comment by the member in the community
 * 5. Create a report status
 * 6. Create a content report linked to the post and comment by the member
 * 7. Register and login as an admin
 * 8. Create a report action linked to the report by the admin
 *
 * The test validates each step by asserting response data and verifies correct
 * linkage and authorization in the final report action.
 */
export async function test_api_report_action_creation_by_admin(
  connection: api.IConnection,
) {
  // 1. Register and login as a member
  const memberEmail = typia.random<string & tags.Format<"email">>();
  const memberPassword = "password123";
  const memberAuthorized: IRedditCommunityMember.IAuthorized =
    await api.functional.auth.member.join(connection, {
      body: {
        email: memberEmail,
        password: memberPassword,
      } satisfies IRedditCommunityMember.ICreate,
    });
  typia.assert(memberAuthorized);

  // Login member again to reset token
  const memberLoggedIn: IRedditCommunityMember.IAuthorized =
    await api.functional.auth.member.login(connection, {
      body: {
        email: memberEmail,
        password: memberPassword,
      } satisfies IRedditCommunityMember.ILogin,
    });
  typia.assert(memberLoggedIn);

  // 2. Create a community
  const communityCreateBody = {
    name: `community_${RandomGenerator.alphabets(6)}`,
    description: RandomGenerator.paragraph({ sentences: 4 }),
  } satisfies IRedditCommunityCommunity.ICreate;
  const community: IRedditCommunityCommunity =
    await api.functional.redditCommunity.member.communities.createCommunity(
      connection,
      {
        body: communityCreateBody,
      },
    );
  typia.assert(community);
  TestValidator.predicate(
    "community name is correct",
    community.name === communityCreateBody.name,
  );

  // 3. Assign community moderator (member assigned)
  const assignedAt = new Date().toISOString();
  await api.functional.redditCommunity.admin.communities.communityModerators.create(
    connection,
    {
      communityId: community.id,
      body: {
        member_id: memberAuthorized.id,
        community_id: community.id,
        assigned_at: assignedAt,
      } satisfies IRedditCommunityCommunityModerator.ICreate,
    },
  );

  // 4. Create a post by member in the community
  const postCreateBody = {
    reddit_community_community_id: community.id,
    post_type: "text",
    title: RandomGenerator.paragraph({ sentences: 3, wordMin: 3, wordMax: 7 }),
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
  TestValidator.equals(
    "post community id",
    post.reddit_community_community_id,
    community.id,
  );
  TestValidator.equals("post type is text", post.post_type, "text");

  // 5. Create a comment on the post by member
  const commentCreateBody = {
    reddit_community_post_id: post.id,
    body_text: RandomGenerator.paragraph({ sentences: 2 }),
    author_member_id: memberAuthorized.id,
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
  TestValidator.equals(
    "comment post id",
    comment.reddit_community_post_id,
    post.id,
  );
  TestValidator.equals(
    "comment author matches member",
    comment.author_member_id,
    memberAuthorized.id,
  );

  // 6. Create a report status
  const reportStatusName = `Status_${RandomGenerator.alphabets(4)}`;
  const reportStatusDesc = RandomGenerator.paragraph({ sentences: 3 });
  const nowISOString = new Date().toISOString();
  const reportStatusCreateBody = {
    name: reportStatusName,
    description: reportStatusDesc,
  } satisfies IRedditCommunityReportStatus.ICreate;
  const reportStatus: IRedditCommunityReportStatus =
    await api.functional.redditCommunity.admin.reportStatuses.create(
      connection,
      {
        body: reportStatusCreateBody,
      },
    );
  typia.assert(reportStatus);
  TestValidator.equals(
    "report status name",
    reportStatus.name,
    reportStatusName,
  );

  // 7. Create a content report linked to the post and comment
  const reportCategory = "spam";
  const reportDescription = RandomGenerator.paragraph({ sentences: 5 });
  const reportCreateBody = {
    reporter_member_id: memberAuthorized.id,
    reported_post_id: post.id,
    reported_comment_id: comment.id,
    status_id: reportStatus.id,
    category: reportCategory,
    description: reportDescription,
  } satisfies IRedditCommunityReport.ICreate;
  const report: IRedditCommunityReport =
    await api.functional.redditCommunity.reports.create(connection, {
      body: reportCreateBody,
    });
  typia.assert(report);
  TestValidator.equals("report category", report.category, reportCategory);
  TestValidator.equals("report status id", report.status_id, reportStatus.id);

  // 8. Register and login as admin
  const adminEmail = typia.random<string & tags.Format<"email">>();
  const adminPassword = "adminPass123";
  const adminAuthorized: IRedditCommunityAdmin.IAuthorized =
    await api.functional.auth.admin.join(connection, {
      body: {
        email: adminEmail,
        password: adminPassword,
      } satisfies IRedditCommunityAdmin.ICreate,
    });
  typia.assert(adminAuthorized);

  // Login admin to reset token
  const adminLoggedIn: IRedditCommunityAdmin.IAuthorized =
    await api.functional.auth.admin.login(connection, {
      body: {
        email: adminEmail,
        password: adminPassword,
      } satisfies IRedditCommunityAdmin.ILogin,
    });
  typia.assert(adminLoggedIn);

  // 9. Create a report action linked to the report by the admin
  const reportActionCreateBody = {
    report_id: report.id,
    moderator_member_id: memberAuthorized.id,
    admin_member_id: adminAuthorized.id,
    action_type: "warning",
    notes: RandomGenerator.paragraph({ sentences: 2 }),
    created_at: nowISOString,
    updated_at: nowISOString,
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
  TestValidator.equals(
    "report action report id",
    reportAction.report_id,
    report.id,
  );
  TestValidator.equals(
    "report action moderator member id",
    reportAction.moderator_member_id,
    memberAuthorized.id,
  );
  TestValidator.equals(
    "report action admin member id",
    reportAction.admin_member_id ?? null,
    adminAuthorized.id,
  );
  TestValidator.equals(
    "report action type",
    reportAction.action_type,
    "warning",
  );
}
