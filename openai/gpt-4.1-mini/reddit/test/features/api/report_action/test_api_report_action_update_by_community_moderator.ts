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

export async function test_api_report_action_update_by_community_moderator(
  connection: api.IConnection,
) {
  // 1. CommunityModerator registration
  const communityModeratorEmail = typia.random<string & tags.Format<"email">>();
  const communityModeratorJoinBody = {
    email: communityModeratorEmail,
    password: "Passw0rd!",
  } satisfies IRedditCommunityCommunityModerator.IJoin;
  const communityModerator: IRedditCommunityCommunityModerator.IAuthorized =
    await api.functional.auth.communityModerator.join.joinCommunityModerator(
      connection,
      {
        body: communityModeratorJoinBody,
      },
    );
  typia.assert(communityModerator);

  // 2. Admin registration
  const adminEmail = typia.random<string & tags.Format<"email">>();
  const adminJoinBody = {
    email: adminEmail,
    password: "AdminPass123",
  } satisfies IRedditCommunityAdmin.ICreate;
  const admin: IRedditCommunityAdmin.IAuthorized =
    await api.functional.auth.admin.join(connection, {
      body: adminJoinBody,
    });
  typia.assert(admin);

  // 3. Member registration
  const memberEmail = typia.random<string & tags.Format<"email">>();
  const memberJoinBody = {
    email: memberEmail,
    password: "MemberPass123",
  } satisfies IRedditCommunityMember.ICreate;
  const member: IRedditCommunityMember.IAuthorized =
    await api.functional.auth.member.join(connection, {
      body: memberJoinBody,
    });
  typia.assert(member);

  // 4. Create community by member
  const communityCreateBody = {
    name: RandomGenerator.paragraph({ sentences: 1, wordMin: 3, wordMax: 10 })
      .toLowerCase()
      .replace(/\s+/g, "_")
      .substring(0, 50),
    description: RandomGenerator.paragraph({
      sentences: 5,
      wordMin: 5,
      wordMax: 12,
    }),
  } satisfies IRedditCommunityCommunity.ICreate;
  const community: IRedditCommunityCommunity =
    await api.functional.redditCommunity.member.communities.createCommunity(
      connection,
      {
        body: communityCreateBody,
      },
    );
  typia.assert(community);

  // 5. Assign communityModerator as mod to community by admin
  // Login as admin
  await api.functional.auth.admin.login(connection, {
    body: {
      email: adminEmail,
      password: "AdminPass123",
    } satisfies IRedditCommunityAdmin.ILogin,
  });

  await api.functional.redditCommunity.admin.communities.communityModerators.create(
    connection,
    {
      communityId: community.id,
      body: {
        community_id: community.id,
        member_id: communityModerator.id,
        assigned_at: new Date().toISOString(),
      } satisfies IRedditCommunityCommunityModerator.ICreate,
    },
  );

  // 6. Member creates post
  // Login as member
  await api.functional.auth.member.login(connection, {
    body: {
      email: memberEmail,
      password: "MemberPass123",
    } satisfies IRedditCommunityMember.ILogin,
  });

  const postCreateBody = {
    reddit_community_community_id: community.id,
    post_type: "text",
    title: RandomGenerator.paragraph({
      sentences: 3,
      wordMin: 4,
      wordMax: 8,
    }).substring(0, 300),
    body_text: RandomGenerator.content({
      paragraphs: 2,
      sentenceMin: 10,
      sentenceMax: 20,
      wordMin: 5,
      wordMax: 15,
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

  // 7. Member creates comment
  const commentCreateBody = {
    reddit_community_post_id: post.id,
    body_text: RandomGenerator.paragraph({
      sentences: 5,
      wordMin: 5,
      wordMax: 12,
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

  // 8. Admin creates report status
  const reportStatusCreateBody = {
    name: "pending",
    description: "Report is pending review.",
  } satisfies IRedditCommunityReportStatus.ICreate;
  const reportStatus: IRedditCommunityReportStatus =
    await api.functional.redditCommunity.admin.reportStatuses.create(
      connection,
      {
        body: reportStatusCreateBody,
      },
    );
  typia.assert(reportStatus);

  // 9. Member creates content report
  const reportCreateBody = {
    reporter_member_id: member.id,
    reported_post_id: post.id,
    status_id: reportStatus.id,
    category: "spam",
    description: "Spam content in this post.",
  } satisfies IRedditCommunityReport.ICreate;
  const report: IRedditCommunityReport =
    await api.functional.redditCommunity.reports.create(connection, {
      body: reportCreateBody,
    });
  typia.assert(report);

  // 10. CommunityModerator creates report action (simulate creation)
  // There is no create API for report action, simulate by initial update with random actionId
  const initialActionCreateBody = {
    report_id: report.id,
    moderator_member_id: communityModerator.id,
    action_type: "warning",
    notes: "Initial warning action.",
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    deleted_at: null,
  } satisfies IRedditCommunityReportAction.IUpdate;

  const actionId = typia.random<string & tags.Format<"uuid">>();
  await api.functional.redditCommunity.communityModerator.reports.reportActions.update(
    connection,
    {
      reportId: report.id,
      actionId: actionId,
      body: initialActionCreateBody,
    },
  );

  // 11. Update report action by community moderator
  await api.functional.auth.communityModerator.login.loginCommunityModerator(
    connection,
    {
      body: {
        email: communityModeratorEmail,
        password: "Passw0rd!",
      } satisfies IRedditCommunityCommunityModerator.ILogin,
    },
  );

  const updatedActionType = "deletion";
  const updatedNotes = RandomGenerator.paragraph({
    sentences: 3,
    wordMin: 4,
    wordMax: 10,
  });

  const updateBody = {
    report_id: report.id,
    moderator_member_id: communityModerator.id,
    admin_member_id: null,
    action_type: updatedActionType,
    notes: updatedNotes,
    created_at: initialActionCreateBody.created_at,
    updated_at: new Date().toISOString(),
    deleted_at: null,
  } satisfies IRedditCommunityReportAction.IUpdate;

  const updatedAction: IRedditCommunityReportAction =
    await api.functional.redditCommunity.communityModerator.reports.reportActions.update(
      connection,
      {
        reportId: report.id,
        actionId: actionId,
        body: updateBody,
      },
    );
  typia.assert(updatedAction);

  TestValidator.equals(
    "report action updated report_id",
    updatedAction.report_id,
    report.id,
  );
  TestValidator.equals(
    "moderator member id matches",
    updatedAction.moderator_member_id,
    communityModerator.id,
  );
  TestValidator.equals(
    "action_type is updated",
    updatedAction.action_type,
    updatedActionType,
  );
  TestValidator.equals("notes are updated", updatedAction.notes, updatedNotes);
}
