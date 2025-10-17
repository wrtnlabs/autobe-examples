import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IRedditLikeCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikeCommunity";
import type { IRedditLikeContentReport } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikeContentReport";
import type { IRedditLikeMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikeMember";
import type { IRedditLikeModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikeModerator";
import type { IRedditLikePost } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikePost";

/**
 * Test the complete workflow of retrieving a specific content report by a
 * moderator.
 *
 * This test validates the full moderator content review workflow:
 *
 * 1. Create a member account who will create community and post
 * 2. Member creates a community (becoming primary moderator automatically)
 * 3. Member creates a post in that community
 * 4. Submit a content report for the post
 * 5. Create a moderator account
 * 6. Authenticate as moderator and retrieve the content report details
 *
 * The test verifies that moderators can access complete report information
 * including violation categories, reporter information, reported content
 * references, review status, and submission timestamps.
 */
export async function test_api_content_report_moderator_retrieval_workflow(
  connection: api.IConnection,
) {
  // Step 1: Create member account who will create community and post
  const memberEmail = typia.random<string & tags.Format<"email">>();
  const memberPassword = typia.random<string & tags.MinLength<8>>();

  const member = await api.functional.auth.member.join(connection, {
    body: {
      username: typia.random<
        string &
          tags.MinLength<3> &
          tags.MaxLength<20> &
          tags.Pattern<"^[a-zA-Z0-9_-]+$">
      >(),
      email: memberEmail,
      password: memberPassword,
    } satisfies IRedditLikeMember.ICreate,
  });
  typia.assert(member);

  // Step 2: Member creates a community (automatically becomes primary moderator)
  const community = await api.functional.redditLike.member.communities.create(
    connection,
    {
      body: {
        code: typia.random<
          string &
            tags.MinLength<3> &
            tags.MaxLength<25> &
            tags.Pattern<"^[a-zA-Z0-9_]+$">
        >(),
        name: RandomGenerator.name(2),
        description: RandomGenerator.paragraph({
          sentences: 3,
          wordMin: 5,
          wordMax: 10,
        }),
        privacy_type: "public",
        posting_permission: "anyone_subscribed",
        allow_text_posts: true,
        allow_link_posts: true,
        allow_image_posts: true,
        primary_category: "discussion",
      } satisfies IRedditLikeCommunity.ICreate,
    },
  );
  typia.assert(community);

  // Step 3: Member creates a post in the community
  const postTypes = ["text", "link", "image"] as const;
  const selectedPostType = RandomGenerator.pick(postTypes);

  const postBody = {
    community_id: community.id,
    type: selectedPostType,
    title: RandomGenerator.paragraph({ sentences: 2, wordMin: 3, wordMax: 8 }),
    body:
      selectedPostType === "text"
        ? RandomGenerator.content({ paragraphs: 2 })
        : undefined,
    url:
      selectedPostType === "link" ? "https://example.com/article" : undefined,
    image_url:
      selectedPostType === "image"
        ? "https://example.com/image.jpg"
        : undefined,
    caption:
      selectedPostType === "image"
        ? RandomGenerator.paragraph({ sentences: 1 })
        : undefined,
  } satisfies IRedditLikePost.ICreate;

  const post = await api.functional.redditLike.member.posts.create(connection, {
    body: postBody,
  });
  typia.assert(post);

  // Step 4: Submit a content report for the post
  const violationCategories = [
    "spam",
    "harassment",
    "hate_speech",
    "violence",
    "misinformation",
  ] as const;
  const selectedViolations = RandomGenerator.sample(
    [...violationCategories],
    typia.random<
      number & tags.Type<"uint32"> & tags.Minimum<1> & tags.Maximum<3>
    >(),
  );

  const report = await api.functional.redditLike.content_reports.create(
    connection,
    {
      body: {
        reported_post_id: post.id,
        community_id: community.id,
        content_type: "post",
        violation_categories: selectedViolations.join(","),
        additional_context: RandomGenerator.paragraph({
          sentences: 2,
          wordMin: 5,
          wordMax: 10,
        }),
      } satisfies IRedditLikeContentReport.ICreate,
    },
  );
  typia.assert(report);

  // Step 5: Create moderator account
  const moderatorEmail = typia.random<string & tags.Format<"email">>();
  const moderatorPassword = typia.random<string & tags.MinLength<8>>();

  const moderator = await api.functional.auth.moderator.join(connection, {
    body: {
      username: typia.random<
        string &
          tags.MinLength<3> &
          tags.MaxLength<20> &
          tags.Pattern<"^[a-zA-Z0-9_-]+$">
      >(),
      email: moderatorEmail,
      password: moderatorPassword,
    } satisfies IRedditLikeModerator.ICreate,
  });
  typia.assert(moderator);

  // Step 6: Retrieve the content report as moderator
  const retrievedReport = await api.functional.redditLike.content_reports.at(
    connection,
    {
      reportId: report.id,
    },
  );
  typia.assert(retrievedReport);

  // Validate that retrieved report matches the created report
  TestValidator.equals("report ID matches", retrievedReport.id, report.id);
  TestValidator.equals(
    "content type is post",
    retrievedReport.content_type,
    "post",
  );
  TestValidator.equals(
    "violation categories match",
    retrievedReport.violation_categories,
    selectedViolations.join(","),
  );
  TestValidator.equals("status is pending", retrievedReport.status, "pending");
  TestValidator.predicate(
    "report has creation timestamp",
    retrievedReport.created_at !== undefined &&
      retrievedReport.created_at.length > 0,
  );
}
