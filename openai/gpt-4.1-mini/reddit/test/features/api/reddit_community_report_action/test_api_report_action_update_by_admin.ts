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

export async function test_api_report_action_update_by_admin(
  connection: api.IConnection,
) {
  // 1. Admin joins (registers) as admin user
  const adminEmail = typia.random<string & tags.Format<"email">>();
  const adminPassword = "AdminPass123!";
  const admin: IRedditCommunityAdmin.IAuthorized =
    await api.functional.auth.admin.join(connection, {
      body: {
        email: adminEmail,
        password: adminPassword,
      } satisfies IRedditCommunityAdmin.ICreate,
    });
  typia.assert(admin);

  // 2. Admin logs in to confirm authentication and session
  const loggedInAdmin = await api.functional.auth.admin.login(connection, {
    body: {
      email: adminEmail,
      password: adminPassword,
    } satisfies IRedditCommunityAdmin.ILogin,
  });
  typia.assert(loggedInAdmin);
  TestValidator.equals(
    "admin ids should equal after login",
    admin.id,
    loggedInAdmin.id,
  );

  // 3. Admin creates a new community
  const communityName = `community_${RandomGenerator.alphaNumeric(8)}`;
  const communityDescription = RandomGenerator.paragraph({
    sentences: 5,
    wordMin: 5,
    wordMax: 10,
  });
  const community: IRedditCommunityCommunity =
    await api.functional.redditCommunity.member.communities.createCommunity(
      connection,
      {
        body: {
          name: communityName,
          description: communityDescription,
        } satisfies IRedditCommunityCommunity.ICreate,
      },
    );
  typia.assert(community);

  // 4. Admin creates a post in the community
  const postTitle = RandomGenerator.paragraph({
    sentences: 3,
    wordMin: 5,
    wordMax: 15,
  });
  const postBodyText = RandomGenerator.content({
    paragraphs: 3,
    sentenceMin: 10,
    sentenceMax: 15,
    wordMin: 4,
    wordMax: 10,
  });
  const post: IRedditCommunityPosts =
    await api.functional.redditCommunity.member.communities.posts.createPost(
      connection,
      {
        communityId: community.id,
        body: {
          reddit_community_community_id: community.id,
          post_type: "text",
          title: postTitle,
          body_text: postBodyText,
        } satisfies IRedditCommunityPosts.ICreate,
      },
    );
  typia.assert(post);

  // 5. Admin creates a report status (e.g. "pending")
  const reportStatusName = `pending_${RandomGenerator.alphaNumeric(6)}`;
  const reportStatusDescription = "Pending moderation review";
  const reportStatus: IRedditCommunityReportStatus =
    await api.functional.redditCommunity.admin.reportStatuses.create(
      connection,
      {
        body: {
          name: reportStatusName,
          description: reportStatusDescription,
        } satisfies IRedditCommunityReportStatus.ICreate,
      },
    );
  typia.assert(reportStatus);

  // 6. Admin creates a content report about the post
  const reportCategory = "abuse";
  const reportDescription = RandomGenerator.paragraph({
    sentences: 4,
    wordMin: 4,
    wordMax: 12,
  });
  const report: IRedditCommunityReport =
    await api.functional.redditCommunity.reports.create(connection, {
      body: {
        reported_post_id: post.id,
        status_id: reportStatus.id,
        category: reportCategory,
        description: reportDescription,
      } satisfies IRedditCommunityReport.ICreate,
    });
  typia.assert(report);

  // 7. Admin creates a community moderator assignment linked to community
  const communityModeratorAssignmentBody: IRedditCommunityCommunityModerator.ICreate =
    {
      community_id: community.id,
      member_id: admin.id,
      assigned_at: new Date().toISOString(),
    };
  await api.functional.redditCommunity.admin.communities.communityModerators.create(
    connection,
    {
      communityId: community.id,
      body: communityModeratorAssignmentBody,
    },
  );

  // 8. Admin creates a report action linked to the report
  const initialActionType = "warning";
  const initialNotes = "Initial warning issued to user.";
  const initialCreatedAt = new Date().toISOString();
  const initialUpdatedAt = initialCreatedAt;

  const reportActionBody: IRedditCommunityReportAction.IUpdate = {
    report_id: report.id,
    moderator_member_id: admin.id,
    admin_member_id: admin.id,
    action_type: initialActionType,
    notes: initialNotes,
    created_at: initialCreatedAt,
    updated_at: initialUpdatedAt,
  };
  // We simulate creation by calling update with a new actionId, but as we do not have a create API,
  // we assume creation here to get the id after update.
  // For test realism we need an ID, so we patch the same.

  // For the test, create the action by first doing an update to a dummy id:
  // but since we don't have create endpoint, we must simulate by calling update on new ID
  // We generate a fake UUID for actionId. This would imply first create has returned this id.
  const fakeInitialActionId = typia.random<string & tags.Format<"uuid">>();

  const createdReportAction: IRedditCommunityReportAction =
    await api.functional.redditCommunity.admin.reports.reportActions.update(
      connection,
      {
        reportId: report.id,
        actionId: fakeInitialActionId,
        body: reportActionBody,
      },
    );
  typia.assert(createdReportAction);
  TestValidator.equals(
    "report action action_type initial equals",
    createdReportAction.action_type,
    initialActionType,
  );
  TestValidator.equals(
    "report action notes initial equals",
    createdReportAction.notes,
    initialNotes,
  );

  // 9. Admin updates the report action's action_type and notes
  const updatedActionType = "deletion";
  const updatedNotes = "Post deleted due to violation.";
  const updatedCreatedAt = createdReportAction.created_at; // keep creation date same
  const updatedUpdatedAt = new Date().toISOString();
  const updateBody: IRedditCommunityReportAction.IUpdate = {
    report_id: report.id,
    moderator_member_id: admin.id,
    admin_member_id: admin.id,
    action_type: updatedActionType,
    notes: updatedNotes,
    created_at: updatedCreatedAt,
    updated_at: updatedUpdatedAt,
  };

  const updatedReportAction: IRedditCommunityReportAction =
    await api.functional.redditCommunity.admin.reports.reportActions.update(
      connection,
      {
        reportId: report.id,
        actionId: createdReportAction.id,
        body: updateBody,
      },
    );

  typia.assert(updatedReportAction);

  // Validate update
  TestValidator.equals(
    "report action action_type updated equals",
    updatedReportAction.action_type,
    updatedActionType,
  );
  TestValidator.equals(
    "report action notes updated equals",
    updatedReportAction.notes,
    updatedNotes,
  );
  TestValidator.equals(
    "report action created_at same as original",
    updatedReportAction.created_at,
    updatedCreatedAt,
  );
  TestValidator.predicate(
    "report action updated_at is recent",
    new Date(updatedReportAction.updated_at).getTime() >=
      new Date(updatedUpdatedAt).getTime(),
  );
}
