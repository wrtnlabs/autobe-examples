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
 * Test creation of a new moderation report action by an admin user.
 *
 * This test covers the scenario where an admin authenticates, and creates a
 * moderation report action linked to a specific report.
 *
 * Workflow:
 *
 * 1. Admin and member users join and login
 * 2. Member creates a community
 * 3. Member creates a post in the community
 * 4. Member comments on the post
 * 5. Admin creates a report status
 * 6. Member creates a content report referencing their post
 * 7. Member assigned as community moderator
 * 8. Admin creates a report action linked to the report
 *
 * Validations perform type assertion and business logic checks.
 */
export async function test_api_report_action_creation_by_admin(
  connection: api.IConnection,
) {
  // 1. Admin user join and login
  const adminEmail = typia.random<string & tags.Format<"email">>();
  const adminPassword = "StrongP@ssw0rd";
  const adminUser = await api.functional.auth.admin.join(connection, {
    body: {
      email: adminEmail,
      password: adminPassword,
    } satisfies IRedditCommunityAdmin.ICreate,
  });
  typia.assert(adminUser);

  await api.functional.auth.admin.login(connection, {
    body: {
      email: adminEmail,
      password: adminPassword,
    } satisfies IRedditCommunityAdmin.ILogin,
  });

  // 2. Member user join and login
  const memberEmail = typia.random<string & tags.Format<"email">>();
  const memberPassword = "MemberP@ss123";
  const memberUser = await api.functional.auth.member.join(connection, {
    body: {
      email: memberEmail,
      password: memberPassword,
    } satisfies IRedditCommunityMember.ICreate,
  });
  typia.assert(memberUser);

  await api.functional.auth.member.login(connection, {
    body: {
      email: memberEmail,
      password: memberPassword,
    } satisfies IRedditCommunityMember.ILogin,
  });

  // 3. Member creates a community
  const communityName = `comm_${RandomGenerator.alphaNumeric(8)}`;
  const community =
    await api.functional.redditCommunity.member.communities.createCommunity(
      connection,
      {
        body: {
          name: communityName,
        } satisfies IRedditCommunityCommunity.ICreate,
      },
    );
  typia.assert(community);

  // 4. Member creates a post
  const postTitle = RandomGenerator.paragraph({
    sentences: 3,
    wordMin: 4,
    wordMax: 7,
  });
  const postBodyText = RandomGenerator.content({
    paragraphs: 2,
    sentenceMin: 5,
    sentenceMax: 8,
    wordMin: 4,
    wordMax: 8,
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
          body_text: postBodyText,
        } satisfies IRedditCommunityPosts.ICreate,
      },
    );
  typia.assert(post);

  // 5. Member creates a comment on the post
  const commentBody = RandomGenerator.paragraph({
    sentences: 6,
    wordMin: 3,
    wordMax: 6,
  });
  const comment =
    await api.functional.redditCommunity.member.posts.comments.create(
      connection,
      {
        postId: post.id,
        body: {
          reddit_community_post_id: post.id,
          body_text: commentBody,
        } satisfies IRedditCommunityComment.ICreate,
      },
    );
  typia.assert(comment);

  // 6. Admin creates a report status
  await api.functional.auth.admin.login(connection, {
    body: {
      email: adminEmail,
      password: adminPassword,
    } satisfies IRedditCommunityAdmin.ILogin,
  });
  const statusName = "pending";
  const reportStatus =
    await api.functional.redditCommunity.admin.reportStatuses.create(
      connection,
      {
        body: {
          name: statusName,
        } satisfies IRedditCommunityReportStatus.ICreate,
      },
    );
  typia.assert(reportStatus);

  // 7. Member creates a content report referencing their post
  await api.functional.auth.member.login(connection, {
    body: {
      email: memberEmail,
      password: memberPassword,
    } satisfies IRedditCommunityMember.ILogin,
  });
  const reportCategory = "abuse";
  const reportDescription = "Reported post contains inappropriate content.";
  const contentReport = await api.functional.redditCommunity.reports.create(
    connection,
    {
      body: {
        reporter_member_id: memberUser.id,
        reported_post_id: post.id,
        status_id: reportStatus.id,
        category: reportCategory,
        description: reportDescription,
      } satisfies IRedditCommunityReport.ICreate,
    },
  );
  typia.assert(contentReport);

  // 8. Member assigned as community moderator
  await api.functional.auth.admin.login(connection, {
    body: {
      email: adminEmail,
      password: adminPassword,
    } satisfies IRedditCommunityAdmin.ILogin,
  });
  await api.functional.redditCommunity.admin.communities.communityModerators.create(
    connection,
    {
      communityId: community.id,
      body: {
        member_id: memberUser.id,
        community_id: community.id,
        assigned_at: new Date().toISOString(),
      } satisfies IRedditCommunityCommunityModerator.ICreate,
    },
  );

  // 9. Switch to admin user authentication
  await api.functional.auth.admin.login(connection, {
    body: {
      email: adminEmail,
      password: adminPassword,
    } satisfies IRedditCommunityAdmin.ILogin,
  });

  // 10. Admin creates a report action linked to the report
  const actionType = "warning";
  const actionNotes = "Initial warning issued to user.";
  const reportAction =
    await api.functional.redditCommunity.admin.reports.reportActions.create(
      connection,
      {
        reportId: contentReport.id,
        body: {
          report_id: contentReport.id,
          moderator_member_id: memberUser.id,
          admin_member_id: adminUser.id,
          action_type: actionType,
          notes: actionNotes,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        } satisfies IRedditCommunityReportAction.ICreate,
      },
    );
  typia.assert(reportAction);

  // Validate linkage
  TestValidator.equals(
    "reportAction.report_id matches report.id",
    reportAction.report_id,
    contentReport.id,
  );
  TestValidator.equals(
    "reportAction.admin_member_id matches adminUser.id",
    reportAction.admin_member_id,
    adminUser.id,
  );
  TestValidator.equals(
    "reportAction.moderator_member_id matches memberUser.id",
    reportAction.moderator_member_id,
    memberUser.id,
  );
  TestValidator.equals(
    "reportAction.action_type is correct",
    reportAction.action_type,
    actionType,
  );
}
