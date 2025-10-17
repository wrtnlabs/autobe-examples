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

export async function test_api_report_action_creation_by_community_moderator(
  connection: api.IConnection,
) {
  // 1. Community moderator registration and authentication
  const communityModeratorEmail = typia.random<string & tags.Format<"email">>();
  const communityModeratorJoinBody = {
    email: communityModeratorEmail,
    password: "test_password123",
  } satisfies IRedditCommunityCommunityModerator.IJoin;
  const communityModerator: IRedditCommunityCommunityModerator.IAuthorized =
    await api.functional.auth.communityModerator.join.joinCommunityModerator(
      connection,
      { body: communityModeratorJoinBody },
    );
  typia.assert(communityModerator);

  // 2. Admin registration and authentication
  const adminEmail = typia.random<string & tags.Format<"email">>();
  const adminJoinBody = {
    email: adminEmail,
    password: "admin_password123",
  } satisfies IRedditCommunityAdmin.ICreate;
  const admin: IRedditCommunityAdmin.IAuthorized =
    await api.functional.auth.admin.join(connection, { body: adminJoinBody });
  typia.assert(admin);

  // 3. Member registration and authentication
  const memberEmail = typia.random<string & tags.Format<"email">>();
  const memberJoinBody = {
    email: memberEmail,
    password: "member_password123",
  } satisfies IRedditCommunityMember.ICreate;
  const member: IRedditCommunityMember.IAuthorized =
    await api.functional.auth.member.join(connection, { body: memberJoinBody });
  typia.assert(member);

  // 4. Member creates a community
  const communityCreateBody = {
    name: `community_${RandomGenerator.alphaNumeric(12)}`,
    description: "Test community for report action creation",
  } satisfies IRedditCommunityCommunity.ICreate;
  const community: IRedditCommunityCommunity =
    await api.functional.redditCommunity.member.communities.createCommunity(
      connection,
      { body: communityCreateBody },
    );
  typia.assert(community);

  // 5. Admin authenticates to assign community moderator
  await api.functional.auth.admin.login(connection, {
    body: {
      email: adminEmail,
      password: "admin_password123",
    } satisfies IRedditCommunityAdmin.ILogin,
  });

  // 6. Admin assigns community moderator to the community
  const communityModeratorAssignBody = {
    member_id: communityModerator.id,
    community_id: community.id,
    assigned_at: new Date().toISOString(),
  } satisfies IRedditCommunityCommunityModerator.ICreate;
  await api.functional.redditCommunity.admin.communities.communityModerators.create(
    connection,
    { communityId: community.id, body: communityModeratorAssignBody },
  );

  // 7. Member authenticates to create post and comment
  await api.functional.auth.member.login(connection, {
    body: {
      email: memberEmail,
      password: "member_password123",
    } satisfies IRedditCommunityMember.ILogin,
  });

  // 8. Member creates post in community
  const postCreateBody = {
    reddit_community_community_id: community.id,
    post_type: "text",
    title: "Test post for report action",
    body_text: "This is a post used in test for report creation and action",
  } satisfies IRedditCommunityPosts.ICreate;
  const post: IRedditCommunityPosts =
    await api.functional.redditCommunity.member.communities.posts.createPost(
      connection,
      { communityId: community.id, body: postCreateBody },
    );
  typia.assert(post);

  // 9. Member creates comment on the post
  const commentCreateBody = {
    reddit_community_post_id: post.id,
    body_text: "This comment is reported in test",
  } satisfies IRedditCommunityComment.ICreate;
  const comment: IRedditCommunityComment =
    await api.functional.redditCommunity.member.posts.comments.create(
      connection,
      { postId: post.id, body: commentCreateBody },
    );
  typia.assert(comment);

  // 10. Admin authenticates to create report status
  await api.functional.auth.admin.login(connection, {
    body: {
      email: adminEmail,
      password: "admin_password123",
    } satisfies IRedditCommunityAdmin.ILogin,
  });

  // 11. Admin creates report status
  const reportStatusCreateBody = {
    name: "pending",
    description: "Report is pending review",
  } satisfies IRedditCommunityReportStatus.ICreate;
  const reportStatus: IRedditCommunityReportStatus =
    await api.functional.redditCommunity.admin.reportStatuses.create(
      connection,
      { body: reportStatusCreateBody },
    );
  typia.assert(reportStatus);

  // 12. Member authenticates to create report
  await api.functional.auth.member.login(connection, {
    body: {
      email: memberEmail,
      password: "member_password123",
    } satisfies IRedditCommunityMember.ILogin,
  });

  // 13. Member creates report against the comment
  const reportCreateBody = {
    reporter_member_id: member.id,
    reported_comment_id: comment.id,
    status_id: reportStatus.id,
    category: "abuse",
    description: "This comment violates community guidelines",
  } satisfies IRedditCommunityReport.ICreate;
  const report: IRedditCommunityReport =
    await api.functional.redditCommunity.reports.create(connection, {
      body: reportCreateBody,
    });
  typia.assert(report);

  // 14. Community moderator authenticates to create report action
  await api.functional.auth.communityModerator.login.loginCommunityModerator(
    connection,
    {
      body: {
        email: communityModeratorEmail,
        password: "test_password123",
      } satisfies IRedditCommunityCommunityModerator.ILogin,
    },
  );

  // 15. Community moderator creates report action linked to the report
  const reportActionCreateBody = {
    report_id: report.id,
    moderator_member_id: communityModerator.id,
    action_type: "warning",
    notes: "Moderator issued a warning to the commenter",
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  } satisfies IRedditCommunityReportAction.ICreate;
  const reportAction: IRedditCommunityReportAction =
    await api.functional.redditCommunity.communityModerator.reports.reportActions.create(
      connection,
      { reportId: report.id, body: reportActionCreateBody },
    );
  typia.assert(reportAction);

  // Validation: Assert linkage and important properties
  TestValidator.equals(
    "ReportAction.report_id matches report.id",
    reportAction.report_id,
    report.id,
  );
  TestValidator.equals(
    "ReportAction.moderator_member_id matches communityModerator.id",
    reportAction.moderator_member_id,
    communityModerator.id,
  );
  TestValidator.equals(
    "ReportAction.action_type is 'warning'",
    reportAction.action_type,
    "warning",
  );
}
