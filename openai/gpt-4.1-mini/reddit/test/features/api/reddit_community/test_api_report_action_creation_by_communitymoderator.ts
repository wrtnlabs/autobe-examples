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

export async function test_api_report_action_creation_by_communitymoderator(
  connection: api.IConnection,
) {
  // 1. CommunityModerator user sign up
  const communityModeratorJoinBody = {
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(12),
  } satisfies IRedditCommunityCommunityModerator.IJoin;

  const communityModerator: IRedditCommunityCommunityModerator.IAuthorized =
    await api.functional.auth.communityModerator.join.joinCommunityModerator(
      connection,
      {
        body: communityModeratorJoinBody,
      },
    );
  typia.assert(communityModerator);

  // 2. Member user sign up
  const memberJoinBody = {
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(12),
  } satisfies IRedditCommunityMember.ICreate;

  const member: IRedditCommunityMember.IAuthorized =
    await api.functional.auth.member.join(connection, {
      body: memberJoinBody,
    });
  typia.assert(member);

  // 3. Admin user sign up
  const adminJoinBody = {
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(12),
  } satisfies IRedditCommunityAdmin.ICreate;
  const admin: IRedditCommunityAdmin.IAuthorized =
    await api.functional.auth.admin.join(connection, {
      body: adminJoinBody,
    });
  typia.assert(admin);

  // 4. Admin user login
  const adminLoginBody = {
    email: adminJoinBody.email,
    password: adminJoinBody.password,
  } satisfies IRedditCommunityAdmin.ILogin;

  await api.functional.auth.admin.login(connection, {
    body: adminLoginBody,
  });

  // 5. Member creates community
  const communityCreateBody = {
    name: RandomGenerator.paragraph({ sentences: 1, wordMin: 3, wordMax: 10 })
      .replace(/\s+/g, "_")
      .toLowerCase()
      .slice(0, 50),
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

  // 6. Admin assigns community moderator role
  await api.functional.redditCommunity.admin.communities.communityModerators.create(
    connection,
    {
      communityId: community.id,
      body: {
        member_id: communityModerator.id,
        community_id: community.id,
        assigned_at: new Date().toISOString(),
      } satisfies IRedditCommunityCommunityModerator.ICreate,
    },
  );

  // 7. Admin creates report status
  const reportStatusCreateBody = {
    name: `pending_${RandomGenerator.alphaNumeric(4)}`,
    description: "Please review and classify the report.",
  } satisfies IRedditCommunityReportStatus.ICreate;

  const reportStatus: IRedditCommunityReportStatus =
    await api.functional.redditCommunity.admin.reportStatuses.create(
      connection,
      {
        body: reportStatusCreateBody,
      },
    );
  typia.assert(reportStatus);

  // 8. Member creates post in the community
  const postCreateBody = {
    reddit_community_community_id: community.id,
    post_type: "text",
    title: RandomGenerator.paragraph({
      sentences: 3,
      wordMin: 5,
      wordMax: 10,
    }).slice(0, 300),
    body_text: RandomGenerator.content({
      paragraphs: 2,
      sentenceMin: 5,
      sentenceMax: 10,
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

  // 9. Member creates a comment on the post
  const commentCreateBody = {
    reddit_community_post_id: post.id,
    body_text: RandomGenerator.paragraph({ sentences: 3 }),
    author_member_id: member.id,
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

  // 10. Member creates content report referencing the post and comment
  const reportCreateBody = {
    reporter_member_id: member.id,
    reported_post_id: post.id,
    reported_comment_id: comment.id,
    status_id: reportStatus.id,
    category: "Spam",
    description: "This post and comment appear to contain spam content.",
  } satisfies IRedditCommunityReport.ICreate;

  const report: IRedditCommunityReport =
    await api.functional.redditCommunity.reports.create(connection, {
      body: reportCreateBody,
    });
  typia.assert(report);

  // 11. CommunityModerator logs in for authenticated request context
  const communityModeratorLoginBody = {
    email: communityModeratorJoinBody.email,
    password: communityModeratorJoinBody.password,
  } satisfies IRedditCommunityCommunityModerator.ILogin;

  await api.functional.auth.communityModerator.login.loginCommunityModerator(
    connection,
    {
      body: communityModeratorLoginBody,
    },
  );

  // 12. CommunityModerator creates a report action for the report
  const reportActionCreateBody = {
    report_id: report.id,
    moderator_member_id: communityModerator.id,
    action_type: "Warning",
    notes: "Initial warning action created for spam report.",
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  } satisfies IRedditCommunityReportAction.ICreate;

  const reportAction: IRedditCommunityReportAction =
    await api.functional.redditCommunity.communityModerator.reports.reportActions.create(
      connection,
      {
        reportId: report.id,
        body: reportActionCreateBody,
      },
    );
  typia.assert(reportAction);

  // Business validation: reportAction.report_id must match report.id
  TestValidator.equals(
    "report action linked to correct report",
    reportAction.report_id,
    report.id,
  );
  // moderator_member_id must be communityModerator.id
  TestValidator.equals(
    "moderator member is the communityModerator",
    reportAction.moderator_member_id,
    communityModerator.id,
  );
  // action_type must be exact enum string "Warning"
  TestValidator.equals(
    "action type is Warning",
    reportAction.action_type,
    "Warning",
  );
}
