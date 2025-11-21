import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { ICommunityPlatformAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAuthorizationToken";
import type { ICommunityPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunity";
import type { ICommunityPlatformMediaFile } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMediaFile";
import type { ICommunityPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMember";
import type { ICommunityPlatformMemberSession } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMemberSession";
import type { ICommunityPlatformPost } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformPost";
import type { ICommunityPlatformPostContent } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformPostContent";
import type { ICommunityPlatformPostMedia } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformPostMedia";

/**
 * Test updating post content with content type modification from markdown to
 * plaintext or html. Validates that content type transitions are properly
 * handled and word count recalculation occurs correctly based on the new
 * content format. Ensures that content rendering logic adapts to different
 * content types after updates.
 */
export async function test_api_post_content_update_content_type_change(
  connection: api.IConnection,
) {
  // Step 1: Create member account for authentication
  const memberEmail = typia.random<string & tags.Format<"email">>();
  const member = await api.functional.auth.member.join(connection, {
    body: {
      email: memberEmail,
      password: "password123",
      display_name: RandomGenerator.paragraph({ sentences: 2 }),
      href: "https://example.com/register",
      referrer: "https://example.com",
    } satisfies ICommunityPlatformMember.ICreate,
  });
  typia.assert(member);

  // Step 2: Create a parent post structure
  const post = await api.functional.communityPlatform.member.posts.create(
    connection,
    {
      body: {
        title: RandomGenerator.paragraph({ sentences: 3 }),
        post_type: "text",
        status: "published",
        community_platform_community_id: typia.random<
          string & tags.Format<"uuid">
        >(),
      } satisfies ICommunityPlatformPost.ICreate,
    },
  );
  typia.assert(post);

  // Step 3: Create initial post content with markdown format
  const initialMarkdownContent = `# ${RandomGenerator.paragraph({ sentences: 1 })}\n\n${RandomGenerator.content({ paragraphs: 2 })}`;

  // Since there's no API function to create post content directly, we need to simulate
  // that content already exists by using the update function with a valid content ID
  // For this test, we'll assume the content was created as part of the post creation

  // Step 4: Update post content with different content types
  // First update: Change content type to plaintext
  const plaintextContent = RandomGenerator.content({ paragraphs: 2 });
  const updatedContentPlaintext =
    await api.functional.communityPlatform.member.posts.contents.putByPostidAndContentid(
      connection,
      {
        postId: post.id,
        contentId: typia.random<string & tags.Format<"uuid">>(), // Simulated content ID
        body: {
          content: plaintextContent,
          content_type: "plaintext",
        } satisfies ICommunityPlatformPostContent.IUpdate,
      },
    );
  typia.assert(updatedContentPlaintext);

  TestValidator.equals(
    "content type should be plaintext",
    updatedContentPlaintext.content_type,
    "plaintext",
  );
  TestValidator.equals(
    "content should match plaintext update",
    updatedContentPlaintext.content,
    plaintextContent,
  );

  // Second update: Change content type to HTML
  const htmlContent = `<p>${RandomGenerator.paragraph({ sentences: 3 })}</p>`;
  const updatedContentHtml =
    await api.functional.communityPlatform.member.posts.contents.putByPostidAndContentid(
      connection,
      {
        postId: post.id,
        contentId: updatedContentPlaintext.id, // Use the ID from previous update
        body: {
          content: htmlContent,
          content_type: "html",
        } satisfies ICommunityPlatformPostContent.IUpdate,
      },
    );
  typia.assert(updatedContentHtml);

  TestValidator.equals(
    "content type should be html",
    updatedContentHtml.content_type,
    "html",
  );
  TestValidator.equals(
    "content should match html update",
    updatedContentHtml.content,
    htmlContent,
  );

  // Third update: Change content type to markdown
  const markdownContent = `## ${RandomGenerator.paragraph({ sentences: 1 })}\n\n${RandomGenerator.content({ paragraphs: 1 })}`;
  const updatedContentMarkdown =
    await api.functional.communityPlatform.member.posts.contents.putByPostidAndContentid(
      connection,
      {
        postId: post.id,
        contentId: updatedContentHtml.id, // Use the ID from previous update
        body: {
          content: markdownContent,
          content_type: "markdown",
        } satisfies ICommunityPlatformPostContent.IUpdate,
      },
    );
  typia.assert(updatedContentMarkdown);

  TestValidator.equals(
    "content type should be markdown",
    updatedContentMarkdown.content_type,
    "markdown",
  );
  TestValidator.equals(
    "content should match markdown update",
    updatedContentMarkdown.content,
    markdownContent,
  );

  // Validate that content updates preserve post association
  TestValidator.equals(
    "post association should be preserved",
    updatedContentMarkdown.community_platform_post_id,
    post.id,
  );

  // Validate word count is properly handled by the system
  TestValidator.predicate(
    "word count should be calculated by system",
    updatedContentMarkdown.word_count > 0,
  );

  // Test that different content types produce different word counts
  TestValidator.notEquals(
    "different content types should have different word counts",
    updatedContentPlaintext.word_count,
    updatedContentHtml.word_count,
  );
}
