import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IRedditCommunityAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityAdmin";
import type { IRedditCommunityComment } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityComment";
import type { IRedditCommunityCommentVote } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityCommentVote";
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
 * Test updating existing content reports by community moderators. Validate that
 * moderators can change report status, modify report category, and update
 * descriptions as part of moderation workflow. Verify authorization enforcement
 * and proper validation of report status IDs during update. Ensure that
 * attempts to update non-existing reports or with invalid status IDs result in
 * meaningful errors. Confirm that the report data returned reflects the updated
 * fields accurately, supporting audit and moderation tracking.
 */
export async function test_api_report_update_by_community_moderator_with_status_change(
  connection: api.IConnection,
) {
  // 1. Community Moderator Join
  const communityModeratorPassword = "ChangeMe123!";
  const communityModeratorJoinBody = {
    email: `mod_${RandomGenerator.alphaNumeric(8)}@example.com`,
    password: communityModeratorPassword,
  } satisfies IRedditCommunityCommunityModerator.IJoin;
  const communityModeratorAuthorized =
    await api.functional.auth.communityModerator.join.joinCommunityModerator(
      connection,
      { body: communityModeratorJoinBody },
    );
  typia.assert(communityModeratorAuthorized);

  // 2. Admin Join
  const adminPassword = "AdminPass2023!";
  const adminJoinBody = {
    email: `admin_${RandomGenerator.alphaNumeric(8)}@example.com`,
    password: adminPassword,
  } satisfies IRedditCommunityAdmin.ICreate;
  const adminAuthorized = await api.functional.auth.admin.join(connection, {
    body: adminJoinBody,
  });
  typia.assert(adminAuthorized);

  // Admin login to initialize session and allow report status creation
  await api.functional.auth.admin.login(connection, {
    body: {
      email: adminJoinBody.email,
      password: adminPassword,
    } satisfies IRedditCommunityAdmin.ILogin,
  });

  // 3. Create multiple report statuses
  const reportStatusNames = ["pending", "reviewed", "action_taken"] as const;
  const reportStatuses: IRedditCommunityReportStatus[] = [];

  for (const name of reportStatusNames) {
    const statusCreateBody = {
      name: name,
      description: `Status for reports marked as ${name.replaceAll("_", " ")}`,
    } satisfies IRedditCommunityReportStatus.ICreate;

    const createdStatus =
      await api.functional.redditCommunity.admin.reportStatuses.create(
        connection,
        { body: statusCreateBody },
      );
    typia.assert(createdStatus);
    reportStatuses.push(createdStatus);
  }

  // 4. Member Join and login
  const memberPassword = "MemberPass2023!";
  const memberJoinBody = {
    email: `member_${RandomGenerator.alphaNumeric(8)}@example.com`,
    password: memberPassword,
  } satisfies IRedditCommunityMember.ICreate;

  const memberAuthorized = await api.functional.auth.member.join(connection, {
    body: memberJoinBody,
  });
  typia.assert(memberAuthorized);

  await api.functional.auth.member.login(connection, {
    body: {
      email: memberJoinBody.email,
      password: memberPassword,
    } satisfies IRedditCommunityMember.ILogin,
  });

  // 5. Create a community post for reporting
  const postCreateBody = {
    reddit_community_community_id: typia.random<string & tags.Format<"uuid">>(),
    post_type: "text",
    title: RandomGenerator.paragraph({ sentences: 4, wordMin: 4, wordMax: 7 }),
    body_text: RandomGenerator.content({
      paragraphs: 2,
      sentenceMin: 8,
      sentenceMax: 12,
    }),
  } satisfies IRedditCommunityPosts.ICreate;

  const createdPost =
    await api.functional.redditCommunity.member.communities.posts.createPost(
      connection,
      {
        communityId: postCreateBody.reddit_community_community_id,
        body: postCreateBody,
      },
    );
  typia.assert(createdPost);

  // 6. Create reports targeting the post
  const reportCount = 3;
  const reports: IRedditCommunityReport[] = [];
  for (let i = 0; i < reportCount; i++) {
    const statusId = reportStatuses[0].id; // initial status is "pending"

    const reportCreateBody = {
      reporter_member_id: memberAuthorized.id,
      reported_post_id: createdPost.id,
      status_id: statusId,
      category: "spam",
      description: `Report ${i + 1} description`,
    } satisfies IRedditCommunityReport.ICreate;

    const createdReport = await api.functional.redditCommunity.reports.create(
      connection,
      { body: reportCreateBody },
    );
    typia.assert(createdReport);
    reports.push(createdReport);
  }

  // Switch to community moderator authentication
  await api.functional.auth.communityModerator.login.loginCommunityModerator(
    connection,
    {
      body: {
        email: communityModeratorJoinBody.email,
        password: communityModeratorPassword,
      } satisfies IRedditCommunityCommunityModerator.ILogin,
    },
  );

  // 7. Update each report with new status, category, description
  for (const report of reports) {
    const newStatus = reportStatuses[RandomGenerator.pick([1, 2])]!; // reviewed or action_taken
    const categoryChoice = RandomGenerator.pick([
      "abuse",
      "harassment",
      "other",
    ]);
    const updateBody = {
      status_id: newStatus.id,
      category: categoryChoice,
      description: `Updated report description for ${categoryChoice}`,
    } satisfies IRedditCommunityReport.IUpdate;

    const updatedReport =
      await api.functional.redditCommunity.communityModerator.reports.update(
        connection,
        {
          reportId: report.id,
          body: updateBody,
        },
      );

    typia.assert(updatedReport);

    // Validate updated fields
    TestValidator.equals(
      "report status_id updated",
      updatedReport.status_id,
      updateBody.status_id,
    );

    TestValidator.equals(
      "report category updated",
      updatedReport.category,
      updateBody.category,
    );

    TestValidator.equals(
      "report description updated",
      updatedReport.description,
      updateBody.description,
    );
  }

  // 8. Attempt invalid updates and assert errors

  // Invalid reportId
  await TestValidator.error(
    "update fails with non-existing reportId",
    async () => {
      await api.functional.redditCommunity.communityModerator.reports.update(
        connection,
        {
          reportId: typia.random<string & tags.Format<"uuid">>(),
          body: {
            status_id: reportStatuses[0].id,
            category: "spam",
            description: "Invalid reportId test",
          } satisfies IRedditCommunityReport.IUpdate,
        },
      );
    },
  );

  // Invalid status_id (not existing)
  await TestValidator.error("update fails with invalid status_id", async () => {
    await api.functional.redditCommunity.communityModerator.reports.update(
      connection,
      {
        reportId: reports[0].id,
        body: {
          status_id: typia.random<string & tags.Format<"uuid">>(), // not in reportStatuses
          category: "spam",
          description: "Invalid status_id test",
        } satisfies IRedditCommunityReport.IUpdate,
      },
    );
  });
}
