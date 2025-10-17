import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIRedditLikeContentReport } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIRedditLikeContentReport";
import type { IRedditLikeAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikeAdmin";
import type { IRedditLikeComment } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikeComment";
import type { IRedditLikeCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikeCommunity";
import type { IRedditLikeContentReport } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikeContentReport";
import type { IRedditLikeMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikeMember";
import type { IRedditLikePost } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikePost";

/**
 * Test comprehensive content report creation with diverse violation categories.
 *
 * This test validates that content reports are properly created with different
 * violation categories (spam, harassment, hate speech, violence) and that
 * administrators can retrieve and identify these reports through the moderation
 * queue. While the API doesn't support filtering by violation categories in the
 * request parameters, it properly stores and returns violation category
 * information in responses, enabling administrators to review different types
 * of violations.
 *
 * Test workflow:
 *
 * 1. Create administrator account for accessing platform-wide reports
 * 2. Create member account for content creation and report submission
 * 3. Create a community to contain reportable content
 * 4. Create posts and comments that will be reported
 * 5. Submit reports with diverse violation categories (spam, harassment, hate
 *    speech, violence)
 * 6. Retrieve reports as administrator using available filters
 * 7. Validate that reports contain correct violation category information
 * 8. Verify that different violation types are properly recorded and retrievable
 */
export async function test_api_content_reports_violation_category_filtering(
  connection: api.IConnection,
) {
  // 1. Create administrator account
  const adminPassword = RandomGenerator.alphaNumeric(12);
  const admin = await api.functional.auth.admin.join(connection, {
    body: {
      username: RandomGenerator.alphaNumeric(10),
      email: typia.random<string & tags.Format<"email">>(),
      password: adminPassword,
    } satisfies IRedditLikeAdmin.ICreate,
  });
  typia.assert(admin);

  // 2. Create member account for content and reports
  const member = await api.functional.auth.member.join(connection, {
    body: {
      username: RandomGenerator.alphaNumeric(10),
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(12),
    } satisfies IRedditLikeMember.ICreate,
  });
  typia.assert(member);

  // 3. Create community for posts and comments
  const community = await api.functional.redditLike.member.communities.create(
    connection,
    {
      body: {
        code: RandomGenerator.alphabets(10),
        name: RandomGenerator.name(2),
        description: RandomGenerator.paragraph({ sentences: 3 }),
      } satisfies IRedditLikeCommunity.ICreate,
    },
  );
  typia.assert(community);

  // 4. Create posts for reporting with different violation types
  const spamPost = await api.functional.redditLike.member.posts.create(
    connection,
    {
      body: {
        community_id: community.id,
        type: "text",
        title: "Buy now! Limited offer!",
        body: "Click here for amazing deals!",
      } satisfies IRedditLikePost.ICreate,
    },
  );
  typia.assert(spamPost);

  const harassmentPost = await api.functional.redditLike.member.posts.create(
    connection,
    {
      body: {
        community_id: community.id,
        type: "text",
        title: "Threatening message",
        body: "This is harassment content",
      } satisfies IRedditLikePost.ICreate,
    },
  );
  typia.assert(harassmentPost);

  const hateSpeechPost = await api.functional.redditLike.member.posts.create(
    connection,
    {
      body: {
        community_id: community.id,
        type: "text",
        title: "Discriminatory content",
        body: "This contains hate speech",
      } satisfies IRedditLikePost.ICreate,
    },
  );
  typia.assert(hateSpeechPost);

  // 5. Create comment for violence report
  const violenceComment =
    await api.functional.redditLike.member.comments.create(connection, {
      body: {
        reddit_like_post_id: spamPost.id,
        content_text: "This comment contains violent threats",
      } satisfies IRedditLikeComment.ICreate,
    });
  typia.assert(violenceComment);

  // 6. Submit reports with different violation categories
  const spamReport = await api.functional.redditLike.content_reports.create(
    connection,
    {
      body: {
        reported_post_id: spamPost.id,
        community_id: community.id,
        content_type: "post",
        violation_categories: "spam",
        additional_context: "Promotional spam content",
      } satisfies IRedditLikeContentReport.ICreate,
    },
  );
  typia.assert(spamReport);
  TestValidator.equals(
    "spam report should have spam violation category",
    spamReport.violation_categories,
    "spam",
  );

  const harassmentReport =
    await api.functional.redditLike.content_reports.create(connection, {
      body: {
        reported_post_id: harassmentPost.id,
        community_id: community.id,
        content_type: "post",
        violation_categories: "harassment",
        additional_context: "Threatening and harassing content",
      } satisfies IRedditLikeContentReport.ICreate,
    });
  typia.assert(harassmentReport);
  TestValidator.equals(
    "harassment report should have harassment violation category",
    harassmentReport.violation_categories,
    "harassment",
  );

  const hateSpeechReport =
    await api.functional.redditLike.content_reports.create(connection, {
      body: {
        reported_post_id: hateSpeechPost.id,
        community_id: community.id,
        content_type: "post",
        violation_categories: "hate_speech",
        additional_context: "Contains discriminatory language",
      } satisfies IRedditLikeContentReport.ICreate,
    });
  typia.assert(hateSpeechReport);
  TestValidator.equals(
    "hate speech report should have hate_speech violation category",
    hateSpeechReport.violation_categories,
    "hate_speech",
  );

  const violenceReport = await api.functional.redditLike.content_reports.create(
    connection,
    {
      body: {
        reported_comment_id: violenceComment.id,
        community_id: community.id,
        content_type: "comment",
        violation_categories: "violence",
        additional_context: "Contains violent threats",
      } satisfies IRedditLikeContentReport.ICreate,
    },
  );
  typia.assert(violenceReport);
  TestValidator.equals(
    "violence report should have violence violation category",
    violenceReport.violation_categories,
    "violence",
  );

  const mixedReport = await api.functional.redditLike.content_reports.create(
    connection,
    {
      body: {
        reported_post_id: spamPost.id,
        community_id: community.id,
        content_type: "post",
        violation_categories: "spam,harassment",
        additional_context: "Multiple violations detected",
      } satisfies IRedditLikeContentReport.ICreate,
    },
  );
  typia.assert(mixedReport);
  TestValidator.equals(
    "mixed report should have multiple violation categories",
    mixedReport.violation_categories,
    "spam,harassment",
  );

  // 7. Switch to admin account to retrieve reports
  await api.functional.auth.admin.join(connection, {
    body: {
      username: admin.username,
      email: admin.email,
      password: adminPassword,
    } satisfies IRedditLikeAdmin.ICreate,
  });

  // 8. Retrieve all reports for the community
  const allReports =
    await api.functional.redditLike.admin.content_reports.index(connection, {
      body: {
        page: 1,
        limit: 50,
        community_id: community.id,
      } satisfies IRedditLikeContentReport.IRequest,
    });
  typia.assert(allReports);

  TestValidator.predicate(
    "should retrieve all created reports",
    allReports.data.length >= 5,
  );

  // 9. Validate that reports contain correct violation categories
  const retrievedSpamReports = allReports.data.filter((report) =>
    report.violation_categories.includes("spam"),
  );
  TestValidator.predicate(
    "should find spam reports in results",
    retrievedSpamReports.length >= 2,
  );

  const retrievedHarassmentReports = allReports.data.filter((report) =>
    report.violation_categories.includes("harassment"),
  );
  TestValidator.predicate(
    "should find harassment reports in results",
    retrievedHarassmentReports.length >= 2,
  );

  const retrievedHateSpeechReports = allReports.data.filter((report) =>
    report.violation_categories.includes("hate_speech"),
  );
  TestValidator.predicate(
    "should find hate speech reports in results",
    retrievedHateSpeechReports.length >= 1,
  );

  const retrievedViolenceReports = allReports.data.filter((report) =>
    report.violation_categories.includes("violence"),
  );
  TestValidator.predicate(
    "should find violence reports in results",
    retrievedViolenceReports.length >= 1,
  );

  // 10. Test filtering by content type (post vs comment)
  const postReports =
    await api.functional.redditLike.admin.content_reports.index(connection, {
      body: {
        page: 1,
        limit: 50,
        community_id: community.id,
        content_type: "post",
      } satisfies IRedditLikeContentReport.IRequest,
    });
  typia.assert(postReports);

  TestValidator.predicate(
    "should retrieve post reports",
    postReports.data.length >= 4,
  );
  TestValidator.predicate(
    "all retrieved reports should be post type",
    postReports.data.every((report) => report.content_type === "post"),
  );

  const commentReports =
    await api.functional.redditLike.admin.content_reports.index(connection, {
      body: {
        page: 1,
        limit: 50,
        community_id: community.id,
        content_type: "comment",
      } satisfies IRedditLikeContentReport.IRequest,
    });
  typia.assert(commentReports);

  TestValidator.predicate(
    "should retrieve comment reports",
    commentReports.data.length >= 1,
  );
  TestValidator.predicate(
    "all retrieved reports should be comment type",
    commentReports.data.every((report) => report.content_type === "comment"),
  );

  // 11. Validate pagination data
  TestValidator.equals(
    "pagination current page should be 1",
    allReports.pagination.current,
    1,
  );
  TestValidator.predicate(
    "pagination records should be at least as many as data items",
    allReports.pagination.records >= allReports.data.length,
  );
}
