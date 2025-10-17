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
 * Test the full workflow for deleting a content report by a community
 * moderator.
 *
 * This test covers the complete scenario from community moderator registration
 * and login, creation of a community, a post, a comment, then creation of a
 * report against the post and comment, and finally the deletion of the report
 * by its ID by the community moderator, validating permissions and operation
 * success.
 *
 * Steps:
 *
 * 1. Register a new community moderator user
 * 2. Login as the community moderator
 * 3. Create a community
 * 4. Create a post in the community
 * 5. Create a comment in the post
 * 6. Create a content report referencing the post and comment
 * 7. Delete the report by ID as the community moderator
 *
 * Validates the whole flow including authorization tokens and confirms
 * successful creation and deletion operations.
 */
export async function test_api_report_deletion_by_community_moderator(
  connection: api.IConnection,
) {
  // 1. Register a new community moderator user
  const communityModeratorEmail = typia.random<string & tags.Format<"email">>();
  const communityModeratorJoinBody = {
    email: communityModeratorEmail,
    password: "Password123!",
  } satisfies IRedditCommunityCommunityModerator.IJoin;

  const communityModerator: IRedditCommunityCommunityModerator.IAuthorized =
    await api.functional.auth.communityModerator.join.joinCommunityModerator(
      connection,
      {
        body: communityModeratorJoinBody,
      },
    );
  typia.assert(communityModerator);
  TestValidator.predicate(
    "community moderator token is non-empty",
    communityModerator.token.access.length > 0,
  );

  // 2. Login as the community moderator
  const communityModeratorLoginBody = {
    email: communityModeratorEmail,
    password: "Password123!",
  } satisfies IRedditCommunityCommunityModerator.ILogin;

  const cmLogin: IRedditCommunityCommunityModerator.IAuthorized =
    await api.functional.auth.communityModerator.login.loginCommunityModerator(
      connection,
      {
        body: communityModeratorLoginBody,
      },
    );
  typia.assert(cmLogin);
  TestValidator.predicate(
    "community moderator login token is non-empty",
    cmLogin.token.access.length > 0,
  );

  // 3. Create a community
  const communityCreateBody = {
    name: RandomGenerator.alphaNumeric(10),
    description: RandomGenerator.paragraph({ sentences: 3 }),
  } satisfies IRedditCommunityCommunity.ICreate;

  const community: IRedditCommunityCommunity =
    await api.functional.redditCommunity.member.communities.createCommunity(
      connection,
      {
        body: communityCreateBody,
      },
    );
  typia.assert(community);

  // 4. Create a post in the community
  const postCreateBody = {
    reddit_community_community_id: community.id,
    post_type: "text",
    title: RandomGenerator.paragraph({ sentences: 5 }),
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

  // 5. Create a comment in the post
  const commentCreateBody = {
    reddit_community_post_id: post.id,
    body_text: RandomGenerator.paragraph({ sentences: 3 }),
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

  // 6. Create a content report referencing the post and comment
  const reportCreateBody = {
    reporter_member_id: communityModerator.id,
    reported_post_id: post.id,
    reported_comment_id: comment.id,
    status_id: typia.random<string & tags.Format<"uuid">>(), // random UUID for status, as no predefined constants given
    category: "spam",
    description: RandomGenerator.paragraph({ sentences: 2 }),
  } satisfies IRedditCommunityReport.ICreate;

  const report: IRedditCommunityReport =
    await api.functional.redditCommunity.reports.create(connection, {
      body: reportCreateBody,
    });
  typia.assert(report);

  // 7. Delete the report by ID as the community moderator
  await api.functional.redditCommunity.communityModerator.reports.eraseReportById(
    connection,
    {
      reportId: report.id,
    },
  );
}
