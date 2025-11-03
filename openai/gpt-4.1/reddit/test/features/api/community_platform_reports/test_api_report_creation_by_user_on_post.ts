import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAdmin";
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
 * Validate a user reporting an inappropriate post in a community platform.
 *
 * Scenario:
 *
 * 1. User registers (joins).
 * 2. User creates a community.
 * 3. User creates a post in that community.
 * 4. User reports the post as inappropriate content using one of the allowed
 *    reasons (e.g., 'spam').
 * 5. Validate that the report is created, is associated with the correct post,
 *    reporter is the user, status is 'open', and report_type matches.
 *    Optionally validate that the post_report property is present and
 *    references the same post id.
 */
export async function test_api_report_creation_by_user_on_post(
  connection: api.IConnection,
) {
  // 1. Register a user
  const registerInput = {
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(12),
    display_name: RandomGenerator.name(),
    href: "https://example.com/join",
    referrer: "https://example.com/landing",
  } satisfies ICommunityPlatformUser.IJoin;
  const user = await api.functional.auth.user.join(connection, {
    body: registerInput,
  });
  typia.assert(user);

  // 2. Create a community
  const communityInput = {
    name: RandomGenerator.alphabets(10).toLowerCase(),
    description: RandomGenerator.paragraph({
      sentences: 5,
      wordMin: 8,
      wordMax: 15,
    }),
  } satisfies ICommunityPlatformCommunity.ICreate;
  const community =
    await api.functional.communityPlatform.user.communities.create(connection, {
      body: communityInput,
    });
  typia.assert(community);

  // 3. Create a post in the community
  const postInput = {
    community_id: community.id,
    title: RandomGenerator.paragraph({ sentences: 2, wordMin: 5, wordMax: 12 }),
    text_body: RandomGenerator.content({
      paragraphs: 1,
      sentenceMin: 10,
      sentenceMax: 16,
      wordMin: 4,
      wordMax: 10,
    }),
  } satisfies ICommunityPlatformPost.ICreate;
  const post = await api.functional.communityPlatform.user.posts.create(
    connection,
    { body: postInput },
  );
  typia.assert(post);
  TestValidator.equals(
    "created post's community id",
    post.community.id,
    community.id,
  );
  TestValidator.equals("created post's author id", post.author.id, user.id);

  // 4. Report the post (e.g., reason = 'spam')
  const reportReasons = [
    "spam",
    "abuse",
    "off_topic",
    "harassment",
    "explicit_content",
    "other",
  ] as const;
  const selectedReason = RandomGenerator.pick(reportReasons);
  const reportDescription = RandomGenerator.paragraph({
    sentences: 3,
    wordMin: 5,
    wordMax: 12,
  });
  const reportInput = {
    report_type: selectedReason,
    description: reportDescription,
    target_post_id: post.id,
    target_comment_id: null,
  } satisfies ICommunityPlatformReports.ICreate;
  const report = await api.functional.communityPlatform.user.reports.create(
    connection,
    { body: reportInput },
  );
  typia.assert(report);

  // 5. Validate report properties
  TestValidator.equals(
    "reporter user is correct",
    report.reporter_user?.id,
    user.id,
  );
  TestValidator.equals(
    "report_type matches",
    report.report_type,
    selectedReason,
  );
  TestValidator.equals("status is open", report.status, "open");
  TestValidator.predicate(
    "report references a post",
    !!report.post_report && report.post_report.target_post_id === post.id,
  );
  TestValidator.equals(
    "report comment_report should be null or undefined",
    report.comment_report,
    null,
  );
  TestValidator.equals(
    "auto_hidden property is present",
    typeof report.auto_hidden,
    "boolean",
  );
}
