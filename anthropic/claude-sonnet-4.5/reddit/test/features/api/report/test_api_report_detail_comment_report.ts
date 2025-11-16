import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IRedditCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunity";
import type { IRedditCommunityComment } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityComment";
import type { IRedditCommunityCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityCommunity";
import type { IRedditCommunityCommunityModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityCommunityModerator";
import type { IRedditCommunityGuest } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityGuest";
import type { IRedditCommunityPost } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityPost";
import type { IRedditCommunityReport } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityReport";

/**
 * Test retrieval of report details for a comment report to validate the
 * polymorphic structure handles both post and comment reports correctly.
 *
 * This test ensures comment reports include proper comment context and parent
 * post information.
 *
 * Workflow:
 *
 * 1. Authenticate as moderator
 * 2. Create community
 * 3. Authenticate as member
 * 4. Create a post
 * 5. Create a comment on the post with specific text
 * 6. Submit a report for the comment with category 'hate_speech' and description
 * 7. Authenticate back as moderator
 * 8. Retrieve the comment report by its ID
 * 9. Validate report.content_type is 'comment'
 * 10. Verify report.target_comment is populated with comment summary
 * 11. Verify report.target_comment.body contains the comment text
 * 12. Verify report.target_comment.post contains parent post summary
 * 13. Verify report.target_post is null (since this targets a comment)
 * 14. Verify comment nesting information (depth) is included
 * 15. Verify reporter and community information is present
 * 16. Validate all polymorphic relationships resolve correctly
 */
export async function test_api_report_detail_comment_report(
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

  // Step 2: Create community
  const communityData = {
    name: RandomGenerator.alphabets(10),
    display_title: RandomGenerator.name(2),
    description: RandomGenerator.paragraph({ sentences: 3 }),
    rules: RandomGenerator.paragraph({ sentences: 2 }),
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
    show_subscribed_communities: false,
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
    title: RandomGenerator.name(3),
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

  // Step 5: Create a comment on the post with specific text
  const commentText =
    "This is a test comment that will be reported for hate speech violation";
  const commentData = {
    body: commentText,
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

  // Step 6: Submit a report for the comment
  const reportDescription =
    "This comment contains hate speech and violates community guidelines";
  const reportData = {
    content_type: "comment" as const,
    target_content_id: comment.id,
    reddit_community_community_id: community.id,
    category: "hate_speech" as const,
    description: reportDescription,
  } satisfies IRedditCommunityReport.ICreate;

  const createdReport: IRedditCommunityReport =
    await api.functional.redditCommunity.member.reports.create(connection, {
      body: reportData,
    });
  typia.assert(createdReport);

  // Step 7: Authenticate back as moderator
  await api.functional.auth.moderator.login(connection, {
    body: {
      email: moderatorData.email,
      password: moderatorData.password,
      ip: null,
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IRedditCommunityCommunityModerator.ILogin,
  });

  // Step 8: Retrieve the comment report by its ID
  const retrievedReport: IRedditCommunityReport =
    await api.functional.redditCommunity.moderator.reports.at(connection, {
      reportId: createdReport.id,
    });
  typia.assert(retrievedReport);

  // Step 9: Validate report.content_type is 'comment'
  TestValidator.equals(
    "report content_type should be comment",
    retrievedReport.content_type,
    "comment",
  );

  // Step 10: Verify report.target_comment is populated
  TestValidator.predicate(
    "target_comment should be populated",
    retrievedReport.target_comment !== null &&
      retrievedReport.target_comment !== undefined,
  );

  // Step 11: Verify report.target_comment.body contains the comment text
  if (retrievedReport.target_comment) {
    TestValidator.equals(
      "target_comment body should match original comment text",
      retrievedReport.target_comment.body,
      commentText,
    );

    // Step 12: Verify target_comment.post contains parent post summary
    TestValidator.predicate(
      "target_comment.post should be populated with parent post summary",
      retrievedReport.target_comment.post !== null &&
        retrievedReport.target_comment.post !== undefined,
    );

    TestValidator.equals(
      "target_comment.post.id should match original post",
      retrievedReport.target_comment.post.id,
      post.id,
    );

    // Step 14: Verify comment depth information is included
    TestValidator.equals(
      "comment depth should be 0 for top-level comment",
      retrievedReport.target_comment.depth,
      0,
    );

    // Verify author information is present
    TestValidator.predicate(
      "target_comment.author should be populated",
      retrievedReport.target_comment.author !== null &&
        retrievedReport.target_comment.author !== undefined,
    );

    TestValidator.equals(
      "comment author should match member",
      retrievedReport.target_comment.author.id,
      member.id,
    );
  }

  // Step 13: Verify report.target_post is null
  TestValidator.equals(
    "target_post should be null for comment report",
    retrievedReport.target_post,
    null,
  );

  // Step 15: Verify reporter and community information is present
  TestValidator.predicate(
    "reporter information should be populated",
    retrievedReport.reporter !== null && retrievedReport.reporter !== undefined,
  );

  if (retrievedReport.reporter) {
    TestValidator.equals(
      "reporter should match member who submitted report",
      retrievedReport.reporter.id,
      member.id,
    );
  }

  TestValidator.predicate(
    "community information should be populated",
    retrievedReport.community !== null &&
      retrievedReport.community !== undefined,
  );

  if (retrievedReport.community) {
    TestValidator.equals(
      "community should match report community",
      retrievedReport.community.id,
      community.id,
    );
  }

  // Step 16: Validate all report fields
  TestValidator.equals(
    "report ID should match created report",
    retrievedReport.id,
    createdReport.id,
  );

  TestValidator.equals(
    "report category should be hate_speech",
    retrievedReport.category,
    "hate_speech",
  );

  TestValidator.equals(
    "report description should match submitted description",
    retrievedReport.description,
    reportDescription,
  );

  TestValidator.equals(
    "report status should be pending",
    retrievedReport.status,
    "pending",
  );

  TestValidator.predicate(
    "created_at timestamp should be present",
    retrievedReport.created_at !== null &&
      retrievedReport.created_at !== undefined,
  );

  TestValidator.predicate(
    "updated_at timestamp should be present",
    retrievedReport.updated_at !== null &&
      retrievedReport.updated_at !== undefined,
  );
}
