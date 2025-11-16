import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIRedditCommunityReport } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIRedditCommunityReport";
import type { IRedditCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunity";
import type { IRedditCommunityComment } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityComment";
import type { IRedditCommunityCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityCommunity";
import type { IRedditCommunityCommunityModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityCommunityModerator";
import type { IRedditCommunityGuest } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityGuest";
import type { IRedditCommunityPost } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityPost";
import type { IRedditCommunityReport } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityReport";

/**
 * Test report filtering by content type (post vs comment).
 *
 * This test validates that moderators can distinguish between reports targeting
 * posts versus reports targeting comments through the content_type filter
 * parameter.
 *
 * Workflow:
 *
 * 1. Authenticate as moderator and create community
 * 2. Authenticate as member and create test content (post and comment)
 * 3. Submit reports for both post and comment with different categories
 * 4. Switch back to moderator authentication
 * 5. Search reports filtering by content_type='post' - verify only post reports
 *    returned
 * 6. Search reports filtering by content_type='comment' - verify only comment
 *    reports returned
 */
export async function test_api_report_search_by_content_type(
  connection: api.IConnection,
) {
  // Step 1: Authenticate as moderator
  const moderatorData = {
    email: typia.random<string & tags.Format<"email">>(),
    password: typia.random<string & tags.MinLength<8>>(),
    nickname: RandomGenerator.name(),
    ip: null,
    href: typia.random<string & tags.Format<"uri">>(),
    referrer: typia.random<string & tags.Format<"uri">>(),
  } satisfies IRedditCommunityCommunityModerator.ICreate;

  const moderator: IRedditCommunityCommunityModerator.IAuthorized =
    await api.functional.auth.moderator.join(connection, {
      body: moderatorData,
    });
  typia.assert(moderator);

  // Step 2: Create community for content
  const communityData = {
    name: RandomGenerator.alphabets(10),
    display_title: RandomGenerator.name(3),
    description: RandomGenerator.paragraph({ sentences: 5 }),
    rules: RandomGenerator.paragraph({ sentences: 3 }),
    icon_url: typia.random<string & tags.Format<"uri">>(),
    banner_url: typia.random<string & tags.Format<"uri">>(),
  } satisfies IRedditCommunityCommunity.ICreate;

  const community: IRedditCommunityCommunity =
    await api.functional.redditCommunity.moderator.communities.create(
      connection,
      {
        body: communityData,
      },
    );
  typia.assert(community);

  // Step 3: Authenticate as member
  const memberData = {
    username: RandomGenerator.alphaNumeric(10),
    email: typia.random<string & tags.Format<"email">>(),
    password: typia.random<string & tags.MinLength<8>>(),
    display_name: RandomGenerator.name(),
    bio: RandomGenerator.paragraph({ sentences: 2 }),
    avatar_url: typia.random<string & tags.Format<"uri">>(),
    show_online_status: true,
    show_subscribed_communities: true,
    show_activity_feed: true,
    ip: null,
    href: typia.random<string & tags.Format<"uri">>(),
    referrer: typia.random<string & tags.Format<"uri">>(),
  } satisfies IRedditCommunityGuest.ICreate;

  const member: IRedditCommunityGuest.IAuthorized =
    await api.functional.auth.member.join(connection, {
      body: memberData,
    });
  typia.assert(member);

  // Step 4: Create a post
  const postData = {
    community_id: community.id,
    title: RandomGenerator.paragraph({ sentences: 1 }),
    post_type: "text" as const,
    body: RandomGenerator.content({ paragraphs: 2 }),
    url: null,
    image_url: null,
  } satisfies IRedditCommunityPost.ICreate;

  const post: IRedditCommunityPost =
    await api.functional.redditCommunity.member.posts.create(connection, {
      body: postData,
    });
  typia.assert(post);

  // Step 5: Create a comment on the post
  const commentData = {
    body: RandomGenerator.paragraph({ sentences: 3 }),
    parent_comment_id: null,
  } satisfies IRedditCommunityComment.ICreate;

  const comment: IRedditCommunityComment =
    await api.functional.redditCommunity.member.posts.comments.create(
      connection,
      {
        postId: post.id,
        body: commentData,
      },
    );
  typia.assert(comment);

  // Step 6: Submit report for the post with category 'spam'
  const postReportData = {
    content_type: "post" as const,
    target_content_id: post.id,
    reddit_community_community_id: community.id,
    category: "spam" as const,
    description: RandomGenerator.paragraph({ sentences: 2 }),
  } satisfies IRedditCommunityReport.ICreate;

  const postReport: IRedditCommunityReport =
    await api.functional.redditCommunity.member.reports.create(connection, {
      body: postReportData,
    });
  typia.assert(postReport);

  // Step 7: Submit report for the comment with category 'harassment'
  const commentReportData = {
    content_type: "comment" as const,
    target_content_id: comment.id,
    reddit_community_community_id: community.id,
    category: "harassment" as const,
    description: RandomGenerator.paragraph({ sentences: 2 }),
  } satisfies IRedditCommunityReport.ICreate;

  const commentReport: IRedditCommunityReport =
    await api.functional.redditCommunity.member.reports.create(connection, {
      body: commentReportData,
    });
  typia.assert(commentReport);

  // Step 8: Authenticate back as moderator
  await api.functional.auth.moderator.login(connection, {
    body: {
      email: moderatorData.email,
      password: moderatorData.password,
      ip: null,
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IRedditCommunityCommunityModerator.ILogin,
  });

  // Step 9: Search reports with content_type filter set to 'post'
  const postReportsRequest = {
    page: 1,
    limit: 10,
    content_type: "post" as const,
  } satisfies IRedditCommunityReport.IRequest;

  const postReportsResult: IPageIRedditCommunityReport.ISummary =
    await api.functional.redditCommunity.moderator.reports.index(connection, {
      body: postReportsRequest,
    });
  typia.assert(postReportsResult);

  // Step 10: Validate response contains only the post report
  TestValidator.predicate(
    "post reports should contain at least one report",
    postReportsResult.data.length > 0,
  );

  const foundPostReport = postReportsResult.data.find(
    (r) => r.id === postReport.id,
  );
  TestValidator.predicate(
    "post report should be found in results",
    foundPostReport !== undefined,
  );

  // Step 11: Verify content_type field in response matches 'post'
  if (foundPostReport) {
    TestValidator.equals(
      "report content_type should be 'post'",
      foundPostReport.content_type,
      "post",
    );
  }

  // Step 12: Search reports with content_type filter set to 'comment'
  const commentReportsRequest = {
    page: 1,
    limit: 10,
    content_type: "comment" as const,
  } satisfies IRedditCommunityReport.IRequest;

  const commentReportsResult: IPageIRedditCommunityReport.ISummary =
    await api.functional.redditCommunity.moderator.reports.index(connection, {
      body: commentReportsRequest,
    });
  typia.assert(commentReportsResult);

  // Step 13: Validate response contains only the comment report
  TestValidator.predicate(
    "comment reports should contain at least one report",
    commentReportsResult.data.length > 0,
  );

  const foundCommentReport = commentReportsResult.data.find(
    (r) => r.id === commentReport.id,
  );
  TestValidator.predicate(
    "comment report should be found in results",
    foundCommentReport !== undefined,
  );

  // Step 14: Verify content_type field in response matches 'comment'
  if (foundCommentReport) {
    TestValidator.equals(
      "report content_type should be 'comment'",
      foundCommentReport.content_type,
      "comment",
    );
  }
}
