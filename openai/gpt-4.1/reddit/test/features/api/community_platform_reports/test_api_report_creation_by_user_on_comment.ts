import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAdmin";
import type { ICommunityPlatformComment } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformComment";
import type { ICommunityPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunity";
import type { ICommunityPlatformPost } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformPost";
import type { ICommunityPlatformPostImage } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformPostImage";
import type { ICommunityPlatformPostLinks } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformPostLinks";
import type { ICommunityPlatformPostTexts } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformPostTexts";
import type { ICommunityPlatformReportActions } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformReportActions";
import type { ICommunityPlatformReportOfComments } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformReportOfComments";
import type { ICommunityPlatformReportOfPosts } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformReportOfPosts";
import type { ICommunityPlatformReports } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformReports";
import type { ICommunityPlatformUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformUser";

/**
 * Validate creation of a content report by an authenticated user against a
 * comment.
 *
 * This test ensures a user can join the platform, create a community, post
 * content, comment, and then report the comment for inappropriate content. The
 * report must be persisted and relate back to the comment. Includes thorough
 * type safety and end-to-end validation.
 *
 * Steps:
 *
 * 1. User signs up (join)
 * 2. User creates a community
 * 3. User creates a post in the created community (as a text post)
 * 4. User adds a top-level comment to the post
 * 5. User reports the comment for an allowed (random) report_type (e.g., 'abuse',
 *    'spam')
 * 6. Assert the response is type correct, the report is for the correct comment,
 *    actor, and category, and status is 'open'
 */
export async function test_api_report_creation_by_user_on_comment(
  connection: api.IConnection,
) {
  // 1. User registration (join)
  const userEmail = typia.random<string & tags.Format<"email">>();
  const userHref = "https://test.e2e/register";
  const userReferrer = "https://test.e2e/referrer";
  const displayName = RandomGenerator.name();

  const authorizedUser = await api.functional.auth.user.join(connection, {
    body: {
      email: userEmail,
      password: "P@ssword1!",
      display_name: displayName,
      href: userHref,
      referrer: userReferrer,
      // ip is optional
    } satisfies ICommunityPlatformUser.IJoin,
  });
  typia.assert(authorizedUser);

  // 2. Create a community
  const community =
    await api.functional.communityPlatform.user.communities.create(connection, {
      body: {
        name: RandomGenerator.alphabets(8),
        description: RandomGenerator.paragraph({
          sentences: 5,
          wordMin: 5,
          wordMax: 10,
        }),
      } satisfies ICommunityPlatformCommunity.ICreate,
    });
  typia.assert(community);

  // 3. Create a post (simple text post)
  const post = await api.functional.communityPlatform.user.posts.create(
    connection,
    {
      body: {
        community_id: community.id,
        title: RandomGenerator.paragraph({
          sentences: 3,
          wordMin: 3,
          wordMax: 8,
        }),
        text_body: RandomGenerator.content({
          paragraphs: 2,
          sentenceMin: 5,
          sentenceMax: 10,
          wordMin: 3,
          wordMax: 8,
        }),
      } satisfies ICommunityPlatformPost.ICreate,
    },
  );
  typia.assert(post);

  // 4. Create a top-level comment on the post
  const comment = await api.functional.communityPlatform.user.comments.create(
    connection,
    {
      body: {
        post_id: post.id,
        body: RandomGenerator.paragraph({
          sentences: 4,
          wordMin: 2,
          wordMax: 6,
        }),
      } satisfies ICommunityPlatformComment.ICreate,
    },
  );
  typia.assert(comment);

  // 5. Report the comment (choose valid report_type from allowed values)
  const REPORT_TYPES = [
    "spam",
    "abuse",
    "off_topic",
    "harassment",
    "explicit_content",
    "other",
  ] as const;
  const reportType = RandomGenerator.pick(REPORT_TYPES);
  const reportDescription = RandomGenerator.paragraph({
    sentences: 6,
    wordMin: 3,
    wordMax: 8,
  });

  const report = await api.functional.communityPlatform.user.reports.create(
    connection,
    {
      body: {
        report_type: reportType,
        description: reportDescription,
        target_comment_id: comment.id,
        target_post_id: null, // mutually exclusive, only target_comment_id filled
      } satisfies ICommunityPlatformReports.ICreate,
    },
  );
  typia.assert(report);

  // 6. Assertions and type validations for response
  TestValidator.equals(
    "report is open immediately after creation",
    report.status,
    "open",
  );
  TestValidator.equals(
    "report type matches selected type",
    report.report_type,
    reportType,
  );
  TestValidator.equals(
    "reporter is correct user",
    report.reporter_user?.id,
    authorizedUser.id,
  );
  TestValidator.equals(
    "report is for a comment",
    typeof report.comment_report,
    "object",
  );
  TestValidator.equals(
    "comment_report's target_comment_id matches comment.id",
    report.comment_report?.target_comment_id,
    comment.id,
  );
  TestValidator.predicate(
    "auto_hidden must be boolean",
    typeof report.auto_hidden === "boolean",
  );
}
