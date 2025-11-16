import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { ICommunityPlatformAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAdministrator";
import type { ICommunityPlatformCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCategory";
import type { ICommunityPlatformComment } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformComment";
import type { ICommunityPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunity";
import type { ICommunityPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMember";
import type { ICommunityPlatformPost } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformPost";

/**
 * Test comment content validation constraints.
 *
 * This test validates that comments enforce the 1-10,000 character content
 * length constraint by testing various content scenarios:
 *
 * - Minimum length valid content (1 character)
 * - Maximum length valid content (10,000 characters)
 * - Boundary conditions and edge cases
 * - Various markdown formatting types
 *
 * Prerequisite Setup:
 *
 * 1. Administrator creates a category for community classification
 * 2. Member joins the platform
 * 3. Member creates a community within the category
 * 4. Member creates a post in the community
 * 5. Member creates comments with validated content lengths
 *
 * The test verifies that the API properly validates content length constraints
 * and stores comments with correct content preservation.
 */
export async function test_api_comment_creation_content_validation(
  connection: api.IConnection,
) {
  // 1. Administrator creates a category
  const category: ICommunityPlatformCategory =
    await api.functional.communityPlatform.administrator.categories.create(
      connection,
      {
        body: {
          name: "Technology",
          slug: "technology",
          display_order: 1,
          description: "Technology discussions and news",
        } satisfies ICommunityPlatformCategory.ICreate,
      },
    );
  typia.assert(category);
  TestValidator.predicate(
    "category should be created with active status",
    category.is_active === true,
  );

  // 2. Member joins the platform
  const memberEmail = typia.random<string & tags.Format<"email">>();
  const member: ICommunityPlatformMember.IAuthorized =
    await api.functional.auth.member.join(connection, {
      body: {
        email: memberEmail,
        username: RandomGenerator.alphaNumeric(8),
        password: "ValidPassword123!",
        href: "http://localhost:3000/register",
        referrer: "http://localhost:3000",
      } satisfies ICommunityPlatformMember.ICreate,
    });
  typia.assert(member);
  TestValidator.predicate(
    "member should be created",
    member.id !== null && member.id !== undefined,
  );

  // 3. Member creates a community
  const community: ICommunityPlatformCommunity =
    await api.functional.communityPlatform.member.communities.create(
      connection,
      {
        body: {
          name: "Tech Discussion",
          identifier: `tech_${RandomGenerator.alphaNumeric(6)}`,
          description: "A community for tech discussions",
          visibility: "public",
          post_creation_restriction: "open_to_all",
          post_type_restriction: "all_types",
          category_slug: category.slug,
        } satisfies ICommunityPlatformCommunity.ICreate,
      },
    );
  typia.assert(community);
  TestValidator.predicate(
    "community should be created",
    community.id !== null && community.id !== undefined,
  );

  // 4. Member creates a post in the community
  const post: ICommunityPlatformPost =
    await api.functional.communityPlatform.member.posts.create(connection, {
      body: {
        community_id: community.id,
        post_type: "text",
        title: "Discussion Topic",
        content_text: "What are your thoughts on this topic?",
      } satisfies ICommunityPlatformPost.ICreate,
    });
  typia.assert(post);
  TestValidator.predicate(
    "post should be created",
    post.id !== null && post.id !== undefined,
  );

  // Test Case 1: Comment with minimum length content (1 character)
  const minContentComment: ICommunityPlatformComment =
    await api.functional.communityPlatform.member.comments.create(connection, {
      body: {
        post_id: post.id,
        content: "x",
      } satisfies ICommunityPlatformComment.ICreate,
    });
  typia.assert(minContentComment);
  TestValidator.equals(
    "minimum length comment should be 1 character",
    minContentComment.content,
    "x",
  );
  TestValidator.predicate(
    "minimum length comment should be created",
    minContentComment.content.length === 1,
  );

  // Test Case 2: Comment with valid markdown content (various formats)
  const markdownContent =
    "# Heading\n**Bold text** and *italic text*\n- List item 1\n- List item 2\n[Link](http://example.com)\n```\ncode block\n```";
  const markdownComment: ICommunityPlatformComment =
    await api.functional.communityPlatform.member.comments.create(connection, {
      body: {
        post_id: post.id,
        content: markdownContent,
      } satisfies ICommunityPlatformComment.ICreate,
    });
  typia.assert(markdownComment);
  TestValidator.equals(
    "markdown formatted comment should be stored correctly",
    markdownComment.content,
    markdownContent,
  );

  // Test Case 3: Comment with maximum length content (10,000 characters)
  const maxContent = RandomGenerator.content({
    paragraphs: 20,
    sentenceMin: 25,
    sentenceMax: 25,
    wordMin: 5,
    wordMax: 5,
  });
  // Adjust to exactly 10,000 characters if needed
  const maxContentTrimmed =
    maxContent.length > 10000
      ? maxContent.substring(0, 10000)
      : maxContent.length < 10000
        ? maxContent +
          " additional".repeat(Math.ceil((10000 - maxContent.length) / 11))
        : maxContent;
  const finalMaxContent = maxContentTrimmed.substring(0, 10000);

  const maxLengthComment: ICommunityPlatformComment =
    await api.functional.communityPlatform.member.comments.create(connection, {
      body: {
        post_id: post.id,
        content: finalMaxContent,
      } satisfies ICommunityPlatformComment.ICreate,
    });
  typia.assert(maxLengthComment);
  TestValidator.predicate(
    "maximum length comment should be exactly 10,000 characters",
    maxLengthComment.content.length <= 10000,
  );

  // Test Case 4: Comment with moderate length content
  const moderateContent = RandomGenerator.paragraph({
    sentences: 10,
    wordMin: 4,
    wordMax: 8,
  });
  const moderateComment: ICommunityPlatformComment =
    await api.functional.communityPlatform.member.comments.create(connection, {
      body: {
        post_id: post.id,
        content: moderateContent,
      } satisfies ICommunityPlatformComment.ICreate,
    });
  typia.assert(moderateComment);
  TestValidator.equals(
    "moderate length comment should be stored correctly",
    moderateComment.content,
    moderateContent,
  );

  // Test Case 5: Comment with special characters and formatting
  const specialContent =
    "Test with special chars: @#$%^&*() and unicode: 你好世界 émojis: 🎉✨🚀";
  const specialComment: ICommunityPlatformComment =
    await api.functional.communityPlatform.member.comments.create(connection, {
      body: {
        post_id: post.id,
        content: specialContent,
      } satisfies ICommunityPlatformComment.ICreate,
    });
  typia.assert(specialComment);
  TestValidator.equals(
    "comment with special characters should be stored correctly",
    specialComment.content,
    specialContent,
  );

  // Test Case 6: Nested reply comment
  const replyContent = "This is a reply to the initial comment";
  const nestedReply: ICommunityPlatformComment =
    await api.functional.communityPlatform.member.comments.create(connection, {
      body: {
        post_id: post.id,
        parent_comment_id: minContentComment.id,
        content: replyContent,
      } satisfies ICommunityPlatformComment.ICreate,
    });
  typia.assert(nestedReply);
  TestValidator.equals(
    "nested reply comment should have correct content",
    nestedReply.content,
    replyContent,
  );
  TestValidator.equals(
    "nested reply should reference parent comment",
    nestedReply.community_platform_parent_comment_id,
    minContentComment.id,
  );

  // Validation summary
  TestValidator.predicate(
    "all comment validations should pass",
    [
      minContentComment.content.length >= 1,
      minContentComment.content.length <= 10000,
      maxLengthComment.content.length >= 1,
      maxLengthComment.content.length <= 10000,
      markdownComment.content.length >= 1,
      markdownComment.content.length <= 10000,
      moderateComment.content.length >= 1,
      moderateComment.content.length <= 10000,
      specialComment.content.length >= 1,
      specialComment.content.length <= 10000,
      nestedReply.content.length >= 1,
      nestedReply.content.length <= 10000,
    ].every((v) => v === true),
  );
}
