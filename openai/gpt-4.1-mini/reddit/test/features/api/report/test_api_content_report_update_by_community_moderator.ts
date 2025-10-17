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
 * Test community moderator's update of content report.
 *
 * This test function ensures community moderator can update a content report
 * properly. It includes:
 *
 * - Authentication and registration of community moderator, member, and admin
 *   users.
 * - Member user creating community, post, and comment.
 * - Admin user creating a report status.
 * - Member user creating a content report against a post.
 * - Community moderator updating the report's status and description.
 *
 * Proper token switching between roles is handled. Validations ensure that
 * updated report data match request and role-based access control is
 * functional.
 */
export async function test_api_content_report_update_by_community_moderator(
  connection: api.IConnection,
) {
  // 1. Register and authenticate communityModerator user
  const communityModeratorJoinBody = {
    email: `${RandomGenerator.alphaNumeric(6)}@moderator.com`,
    password: "StrongPass123!",
  } satisfies IRedditCommunityCommunityModerator.IJoin;
  const communityModerator =
    await api.functional.auth.communityModerator.join.joinCommunityModerator(
      connection,
      { body: communityModeratorJoinBody },
    );
  typia.assert(communityModerator);

  // 2. Register and authenticate member user
  const memberJoinBody = {
    email: `${RandomGenerator.alphaNumeric(6)}@member.com`,
    password: "StrongPass123!",
  } satisfies IRedditCommunityMember.ICreate;
  const member = await api.functional.auth.member.join(connection, {
    body: memberJoinBody,
  });
  typia.assert(member);

  // 3. Register and authenticate admin user
  const adminJoinBody = {
    email: `${RandomGenerator.alphaNumeric(6)}@admin.com`,
    password: "StrongPass123!",
  } satisfies IRedditCommunityAdmin.ICreate;
  const admin = await api.functional.auth.admin.join(connection, {
    body: adminJoinBody,
  });
  typia.assert(admin);

  // 4. Member creates a reddit community
  await api.functional.auth.member.login(connection, {
    body: {
      email: memberJoinBody.email,
      password: memberJoinBody.password,
    } satisfies IRedditCommunityMember.ILogin,
  });
  const communityCreateBody = {
    name: RandomGenerator.alphaNumeric(8),
    description: RandomGenerator.paragraph({
      sentences: 5,
      wordMin: 4,
      wordMax: 8,
    }),
  } satisfies IRedditCommunityCommunity.ICreate;
  const community =
    await api.functional.redditCommunity.member.communities.createCommunity(
      connection,
      { body: communityCreateBody },
    );
  typia.assert(community);

  // 5. Member creates a post in the community
  const postCreateBody = {
    reddit_community_community_id: community.id,
    post_type: "text",
    title: RandomGenerator.paragraph({ sentences: 3, wordMin: 4, wordMax: 8 }),
    body_text: RandomGenerator.content({
      paragraphs: 2,
      sentenceMin: 8,
      sentenceMax: 12,
      wordMin: 3,
      wordMax: 6,
    }),
  } satisfies IRedditCommunityPosts.ICreate;
  const post =
    await api.functional.redditCommunity.member.communities.posts.createPost(
      connection,
      {
        communityId: community.id,
        body: postCreateBody,
      },
    );
  typia.assert(post);

  // 6. Member creates a comment on the post
  const commentCreateBody = {
    reddit_community_post_id: post.id,
    body_text: RandomGenerator.paragraph({
      sentences: 4,
      wordMin: 3,
      wordMax: 7,
    }),
  } satisfies IRedditCommunityComment.ICreate;
  const comment =
    await api.functional.redditCommunity.member.posts.comments.create(
      connection,
      {
        postId: post.id,
        body: commentCreateBody,
      },
    );
  typia.assert(comment);

  // 7. Admin creates a report status entity
  await api.functional.auth.admin.login(connection, {
    body: {
      email: adminJoinBody.email,
      password: adminJoinBody.password,
    } satisfies IRedditCommunityAdmin.ILogin,
  });
  const reportStatusCreateBody = {
    name: `status_${RandomGenerator.alphaNumeric(5)}`,
    description: RandomGenerator.paragraph({
      sentences: 3,
      wordMin: 5,
      wordMax: 10,
    }),
  } satisfies IRedditCommunityReportStatus.ICreate;
  const reportStatus =
    await api.functional.redditCommunity.admin.reportStatuses.create(
      connection,
      { body: reportStatusCreateBody },
    );
  typia.assert(reportStatus);

  // 8. Member creates a content report referencing the post
  await api.functional.auth.member.login(connection, {
    body: {
      email: memberJoinBody.email,
      password: memberJoinBody.password,
    } satisfies IRedditCommunityMember.ILogin,
  });
  const reportCreateBody = {
    reporter_member_id: member.id,
    reported_post_id: post.id,
    status_id: reportStatus.id,
    category: "spam",
    description: RandomGenerator.content({
      paragraphs: 1,
      sentenceMin: 5,
      sentenceMax: 8,
      wordMin: 4,
      wordMax: 7,
    }),
  } satisfies IRedditCommunityReport.ICreate;
  const report = await api.functional.redditCommunity.reports.create(
    connection,
    { body: reportCreateBody },
  );
  typia.assert(report);

  // 9. Community moderator login for update operation
  await api.functional.auth.communityModerator.login.loginCommunityModerator(
    connection,
    {
      body: {
        email: communityModeratorJoinBody.email,
        password: communityModeratorJoinBody.password,
      } satisfies IRedditCommunityCommunityModerator.ILogin,
    },
  );

  // 10. Update the report's status, category, and description
  const reportUpdateBody = {
    status_id: reportStatus.id,
    category: "abuse",
    description: RandomGenerator.content({
      paragraphs: 1,
      sentenceMin: 3,
      sentenceMax: 5,
      wordMin: 5,
      wordMax: 10,
    }),
  } satisfies IRedditCommunityReport.IUpdate;
  const updatedReport =
    await api.functional.redditCommunity.communityModerator.reports.update(
      connection,
      {
        reportId: report.id,
        body: reportUpdateBody,
      },
    );
  typia.assert(updatedReport);

  // 11. Validate the update was applied correctly
  TestValidator.equals(
    "report update: id should remain the same",
    updatedReport.id,
    report.id,
  );
  TestValidator.equals(
    "report update: status_id should be updated",
    updatedReport.status_id,
    reportUpdateBody.status_id,
  );
  TestValidator.equals(
    "report update: category should be updated",
    updatedReport.category,
    reportUpdateBody.category,
  );
  TestValidator.equals(
    "report update: description should be updated",
    updatedReport.description,
    reportUpdateBody.description,
  );
}
