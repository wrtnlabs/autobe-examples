import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { ICommunityPlatformAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAdministrator";
import type { ICommunityPlatformCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCategory";
import type { ICommunityPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunity";
import type { ICommunityPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMember";
import type { ICommunityPlatformPost } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformPost";

/**
 * Test retrieval of text posts with markdown-formatted content.
 *
 * This test validates that text posts with markdown formatting are created and
 * retrieved correctly through the API. It verifies that markdown content
 * (headers, bold, italics, lists, code blocks) is preserved completely,
 * content_link fields are null for text posts, and post_type is correctly set
 * to 'text'.
 *
 * Test workflow:
 *
 * 1. Create administrator and member accounts for multi-actor authentication
 * 2. Create a community category (required for community creation)
 * 3. Create a community where the post will be published
 * 4. Create a text post with comprehensive markdown formatting
 * 5. Retrieve the created post by ID
 * 6. Validate that post_type is 'text'
 * 7. Validate that content_text contains the exact markdown content
 * 8. Validate that all content_link fields are null
 * 9. Validate post metadata (title, creator, community)
 * 10. Validate engagement metrics are initialized to 0
 * 11. Validate visibility_status is 'public'
 */
export async function test_api_post_retrieval_text_post_type(
  connection: api.IConnection,
) {
  // 1. Create administrator account for category creation
  const adminEmail = typia.random<string & tags.Format<"email">>();
  const administrator = await api.functional.auth.administrator.join(
    connection,
    {
      body: {
        email: adminEmail,
        password: "AdminPassword123!",
        username: RandomGenerator.alphaNumeric(8),
        name: RandomGenerator.name(),
        href: "https://example.com/admin/register",
        referrer: "https://example.com/",
      } satisfies ICommunityPlatformAdministrator.ICreate,
    },
  );
  typia.assert(administrator);

  // 2. Create a category for the community
  const category =
    await api.functional.communityPlatform.administrator.categories.create(
      connection,
      {
        body: {
          name: "Technology",
          slug: "technology",
          description: "Technology discussions and posts",
          display_order: 1,
        } satisfies ICommunityPlatformCategory.ICreate,
      },
    );
  typia.assert(category);

  // 3. Create member account for community and post creation
  const memberEmail = typia.random<string & tags.Format<"email">>();
  const member = await api.functional.auth.member.join(connection, {
    body: {
      email: memberEmail,
      username: RandomGenerator.alphaNumeric(8),
      password: "MemberPassword123!",
      href: "https://example.com/member/register",
      referrer: "https://example.com/",
    } satisfies ICommunityPlatformMember.ICreate,
  });
  typia.assert(member);

  // 4. Create a community for the post
  const community =
    await api.functional.communityPlatform.member.communities.create(
      connection,
      {
        body: {
          name: "Tech Discussion",
          identifier: `tech_${RandomGenerator.alphaNumeric(6)}`,
          description: "A community for technology discussions",
          visibility: "public",
          post_creation_restriction: "open_to_all",
          post_type_restriction: "all_types",
          category_slug: category.slug,
        } satisfies ICommunityPlatformCommunity.ICreate,
      },
    );
  typia.assert(community);

  // 5. Create a text post with comprehensive markdown formatting
  const markdownContent = `# Main Heading

## Subheading

This is **bold text** and this is *italic text* and this is ***bold italic***.

### Lists Example

- Item 1
- Item 2
  - Nested item 2.1
  - Nested item 2.2
- Item 3

1. First numbered item
2. Second numbered item
3. Third numbered item

### Code Block Example

\`\`\`typescript
const example = "code block";
function test() {
  return example;
}
\`\`\`

Inline \`code example\` is also supported.

#### Deeper Nesting

Testing multiple levels of markdown formatting.`;

  const createdPost =
    await api.functional.communityPlatform.member.posts.create(connection, {
      body: {
        community_id: community.id,
        post_type: "text",
        title: "Comprehensive Markdown Test Post",
        content_text: markdownContent,
        is_nsfw: false,
        has_spoiler: false,
      } satisfies ICommunityPlatformPost.ICreate,
    });
  typia.assert(createdPost);

  // 6. Retrieve the created post by ID
  const retrievedPost = await api.functional.communityPlatform.posts.at(
    connection,
    {
      postId: createdPost.id,
    },
  );
  typia.assert(retrievedPost);

  // 7. Validate post_type is 'text'
  TestValidator.equals(
    "post_type should be text",
    retrievedPost.post_type,
    "text",
  );

  // 8. Validate content_text contains the exact markdown content
  TestValidator.equals(
    "content_text should contain exact markdown",
    retrievedPost.content_text,
    markdownContent,
  );

  // 9. Validate all content_link fields are null for text posts
  TestValidator.predicate(
    "content_link_url should be null for text posts",
    retrievedPost.content_link_url === null ||
      retrievedPost.content_link_url === undefined,
  );

  TestValidator.predicate(
    "content_link_title should be null for text posts",
    retrievedPost.content_link_title === null ||
      retrievedPost.content_link_title === undefined,
  );

  TestValidator.predicate(
    "content_link_description should be null for text posts",
    retrievedPost.content_link_description === null ||
      retrievedPost.content_link_description === undefined,
  );

  TestValidator.predicate(
    "content_link_thumbnail_url should be null for text posts",
    retrievedPost.content_link_thumbnail_url === null ||
      retrievedPost.content_link_thumbnail_url === undefined,
  );

  // 10. Validate post title matches
  TestValidator.equals(
    "post title should match",
    retrievedPost.title,
    "Comprehensive Markdown Test Post",
  );

  // 11. Validate creator information is populated
  TestValidator.equals(
    "creator id should match member",
    retrievedPost.creator.id,
    member.id,
  );

  // 12. Validate community information is populated
  TestValidator.equals(
    "community id should match created community",
    retrievedPost.community.id,
    community.id,
  );

  // 13. Validate engagement metrics are initialized to 0
  TestValidator.equals(
    "initial vote_score should be 0",
    retrievedPost.vote_score,
    0,
  );

  TestValidator.equals(
    "initial upvote_count should be 0",
    retrievedPost.upvote_count,
    0,
  );

  TestValidator.equals(
    "initial downvote_count should be 0",
    retrievedPost.downvote_count,
    0,
  );

  TestValidator.equals(
    "initial comment_count should be 0",
    retrievedPost.comment_count,
    0,
  );

  // 14. Validate visibility_status is 'public'
  TestValidator.equals(
    "visibility_status should be public",
    retrievedPost.visibility_status,
    "public",
  );

  // 15. Validate is_nsfw and has_spoiler flags
  TestValidator.equals("is_nsfw should be false", retrievedPost.is_nsfw, false);

  TestValidator.equals(
    "has_spoiler should be false",
    retrievedPost.has_spoiler,
    false,
  );

  // 16. Validate post is not locked or pinned initially
  TestValidator.equals(
    "is_locked should be false initially",
    retrievedPost.is_locked,
    false,
  );

  TestValidator.equals(
    "is_pinned should be false initially",
    retrievedPost.is_pinned,
    false,
  );

  // 17. Validate deleted_at is null for active post
  TestValidator.predicate(
    "deleted_at should be null for active post",
    retrievedPost.deleted_at === null || retrievedPost.deleted_at === undefined,
  );
}
