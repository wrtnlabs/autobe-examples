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
import type { IRedditCommunityUserKarma } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityUserKarma";
import type { IRedditCommunityUserProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityUserProfile";

/**
 * Test retrieval of a specific moderation action for a content report by a
 * community moderator.
 *
 * This test covers a complete multi-role workflow:
 *
 * - Register and authenticate communityModerator user.
 * - Register and authenticate admin user.
 * - Admin creates a new community.
 * - Admin assigns the communityModerator user as a moderator of the community.
 * - Register and authenticate a member user.
 * - Member creates a post within the community.
 * - Member files a content report referencing the post.
 * - CommunityModerator logs in.
 * - CommunityModerator creates a report action related to the report.
 * - CommunityModerator retrieves the specific report action by reportId and
 *   actionId.
 *
 * Validations include:
 *
 * - Correctness of returned report action data fields (ids, type, notes,
 *   timestamps).
 * - Linked member and admin IDs in the report action.
 * - Proper authorization and role-based access control.
 * - Error handling for unauthorized access and invalid IDs.
 *
 * This scenario validates that the API enforces security, integrity, and
 * business rules across complex interactions between different user roles
 * within the redditCommunity platform.
 */
export async function test_api_report_action_detail_retrieval_by_community_moderator(
  connection: api.IConnection,
) {
  // 1. CommunityModerator join
  const communityModeratorEmail = typia.random<string & tags.Format<"email">>();
  const communityModeratorUser =
    await api.functional.auth.communityModerator.join.joinCommunityModerator(
      connection,
      {
        body: {
          email: communityModeratorEmail,
          password: "password123",
        } satisfies IRedditCommunityCommunityModerator.IJoin,
      },
    );
  typia.assert(communityModeratorUser);

  // 2. Admin join
  const adminEmail = typia.random<string & tags.Format<"email">>();
  const adminUser = await api.functional.auth.admin.join(connection, {
    body: {
      email: adminEmail,
      password: "adminpass123",
    } satisfies IRedditCommunityAdmin.ICreate,
  });
  typia.assert(adminUser);

  // 3. Admin login
  await api.functional.auth.admin.login(connection, {
    body: {
      email: adminEmail,
      password: "adminpass123",
    } satisfies IRedditCommunityAdmin.ILogin,
  });

  // 4. Admin creates community
  const communityName = RandomGenerator.name(1)
    .replace(/\s/g, "_")
    .toLowerCase();
  const community =
    await api.functional.redditCommunity.member.communities.createCommunity(
      connection,
      {
        body: {
          name: communityName,
          description: RandomGenerator.paragraph({
            sentences: 5,
            wordMin: 4,
            wordMax: 7,
          }),
        } satisfies IRedditCommunityCommunity.ICreate,
      },
    );
  typia.assert(community);

  // 5. Admin assigns communityModerator as moderator
  await api.functional.redditCommunity.admin.communities.communityModerators.create(
    connection,
    {
      communityId: community.id,
      body: {
        community_id: community.id,
        member_id: communityModeratorUser.id,
        assigned_at: new Date().toISOString(),
      } satisfies IRedditCommunityCommunityModerator.ICreate,
    },
  );

  // 6. Member join
  const memberEmail = typia.random<string & tags.Format<"email">>();
  const memberUser = await api.functional.auth.member.join(connection, {
    body: {
      email: memberEmail,
      password: "memberpass123",
    } satisfies IRedditCommunityMember.ICreate,
  });
  typia.assert(memberUser);

  // 7. Member login
  await api.functional.auth.member.join(connection, {
    body: {
      email: memberEmail,
      password: "memberpass123",
    } satisfies IRedditCommunityMember.ICreate,
  });

  // 8. Member creates post
  const postTitle = RandomGenerator.paragraph({
    sentences: 3,
    wordMin: 5,
    wordMax: 7,
  });
  const postBody = RandomGenerator.paragraph({
    sentences: 10,
    wordMin: 5,
    wordMax: 10,
  });

  const post =
    await api.functional.redditCommunity.member.communities.posts.createPost(
      connection,
      {
        communityId: community.id,
        body: {
          reddit_community_community_id: community.id,
          post_type: "text",
          title: postTitle,
          body_text: postBody,
        } satisfies IRedditCommunityPosts.ICreate,
      },
    );
  typia.assert(post);

  // 9. Member files a report on the post
  const reportCategory = "spam";
  const reportDescription = RandomGenerator.paragraph({
    sentences: 5,
    wordMin: 4,
    wordMax: 6,
  });
  const report = await api.functional.redditCommunity.reports.create(
    connection,
    {
      body: {
        reporter_member_id: memberUser.id,
        reported_post_id: post.id,
        status_id: typia.random<string & tags.Format<"uuid">>(), // random status id for testing
        category: reportCategory,
        description: reportDescription,
      } satisfies IRedditCommunityReport.ICreate,
    },
  );
  typia.assert(report);

  // 10. CommunityModerator login to get new token and session
  await api.functional.auth.communityModerator.login.loginCommunityModerator(
    connection,
    {
      body: {
        email: communityModeratorEmail,
        password: "password123",
      } satisfies IRedditCommunityCommunityModerator.ILogin,
    },
  );

  // 11. CommunityModerator creates a report action linked to the report
  const actionType = "warning";
  const actionNotes = RandomGenerator.paragraph({
    sentences: 3,
    wordMin: 4,
    wordMax: 6,
  });
  const nowISOString = new Date().toISOString();

  const reportAction =
    await api.functional.redditCommunity.communityModerator.reports.reportActions.create(
      connection,
      {
        reportId: report.id,
        body: {
          report_id: report.id,
          moderator_member_id: communityModeratorUser.id,
          admin_member_id: adminUser.id,
          action_type: actionType,
          notes: actionNotes,
          created_at: nowISOString,
          updated_at: nowISOString,
        } satisfies IRedditCommunityReportAction.ICreate,
      },
    );
  typia.assert(reportAction);

  // 12. CommunityModerator retrieves the report action details by IDs
  const retrievedAction =
    await api.functional.redditCommunity.communityModerator.reports.reportActions.at(
      connection,
      {
        reportId: report.id,
        actionId: reportAction.id,
      },
    );
  typia.assert(retrievedAction);

  // Validations of retrieved action
  TestValidator.equals(
    "reportAction id match",
    retrievedAction.id,
    reportAction.id,
  );
  TestValidator.equals(
    "reportAction report_id match",
    retrievedAction.report_id,
    report.id,
  );
  TestValidator.equals(
    "moderator_member_id match",
    retrievedAction.moderator_member_id,
    communityModeratorUser.id,
  );
  TestValidator.equals(
    "admin_member_id match",
    retrievedAction.admin_member_id,
    adminUser.id,
  );
  TestValidator.equals(
    "action_type match",
    retrievedAction.action_type,
    actionType,
  );
  TestValidator.equals("notes match", retrievedAction.notes, actionNotes);
  TestValidator.equals(
    "created_at match",
    retrievedAction.created_at,
    nowISOString,
  );
  TestValidator.equals(
    "updated_at match",
    retrievedAction.updated_at,
    nowISOString,
  );

  // Verify linked relation moderatorMember has expected id
  if (retrievedAction.moderatorMember !== undefined) {
    TestValidator.equals(
      "moderatorMember id match",
      retrievedAction.moderatorMember.id,
      communityModeratorUser.id,
    );
  }

  // Verify linked relation adminMember has expected id
  if (
    retrievedAction.adminMember !== null &&
    retrievedAction.adminMember !== undefined
  ) {
    TestValidator.equals(
      "adminMember id match",
      retrievedAction.adminMember.id,
      adminUser.id,
    );
  }

  // Error handling tests
  // Unauthorized access - simulate by logging in as member and trying to get the report action
  await api.functional.auth.member.join(connection, {
    body: {
      email: memberEmail,
      password: "memberpass123",
    } satisfies IRedditCommunityMember.ICreate,
  });
  await TestValidator.error(
    "unauthorized user cannot retrieve report action",
    async () => {
      await api.functional.redditCommunity.communityModerator.reports.reportActions.at(
        connection,
        {
          reportId: report.id,
          actionId: reportAction.id,
        },
      );
    },
  );

  // Invalid reportId
  await TestValidator.error("invalid reportId causes error", async () => {
    await api.functional.redditCommunity.communityModerator.reports.reportActions.at(
      connection,
      {
        reportId: typia.random<string & tags.Format<"uuid">>(),
        actionId: reportAction.id,
      },
    );
  });

  // Invalid actionId
  await TestValidator.error("invalid actionId causes error", async () => {
    await api.functional.redditCommunity.communityModerator.reports.reportActions.at(
      connection,
      {
        reportId: report.id,
        actionId: typia.random<string & tags.Format<"uuid">>(),
      },
    );
  });
}
