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
 * Test successful creation of a link post with external URL reference.
 *
 * Member creates a post with post_type='link', providing title,
 * content_link_url (valid HTTP/HTTPS URL), and optional Open Graph metadata
 * fields (title, description, thumbnail). The test verifies that the post is
 * created with proper field population, engagement metrics initialized to zero,
 * visibility defaulting to public, and creator properly attributed. If metadata
 * is provided by client, it is stored; if omitted, the backend should
 * auto-extract from URL.
 *
 * Test workflow:
 *
 * 1. Create administrator account for category management
 * 2. Create a community category
 * 3. Create member account for post creation
 * 4. Authenticate member
 * 5. Create link post with URL and optional metadata
 * 6. Verify post structure, fields, engagement metrics, and attribution
 * 7. Test with both provided metadata and auto-extraction scenarios
 */
export async function test_api_post_creation_link_post(
  connection: api.IConnection,
) {
  // Step 1: Create administrator account
  const adminPassword = "Admin@" + RandomGenerator.alphaNumeric(8);
  const admin: ICommunityPlatformAdministrator.IAuthorized =
    await api.functional.auth.administrator.join(connection, {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        password: adminPassword,
        username: RandomGenerator.alphabets(10),
        name: RandomGenerator.name(),
        href: "http://localhost:3000/admin",
        referrer: "http://localhost:3000",
      } satisfies ICommunityPlatformAdministrator.ICreate,
    });
  typia.assert(admin);

  // Step 2: Create a community category
  const category: ICommunityPlatformCategory =
    await api.functional.communityPlatform.administrator.categories.create(
      connection,
      {
        body: {
          name: "Technology",
          slug: "technology",
          description: "Community for technology discussions",
          display_order: 1,
        } satisfies ICommunityPlatformCategory.ICreate,
      },
    );
  typia.assert(category);

  // Step 3: Create member account
  const memberEmail = typia.random<string & tags.Format<"email">>();
  const memberPassword = "Member@" + RandomGenerator.alphaNumeric(8);
  const member: ICommunityPlatformMember.IAuthorized =
    await api.functional.auth.member.join(connection, {
      body: {
        email: memberEmail,
        username: RandomGenerator.alphabets(10),
        password: memberPassword,
        href: "http://localhost:3000/join",
        referrer: "http://localhost:3000",
      } satisfies ICommunityPlatformMember.ICreate,
    });
  typia.assert(member);

  // Step 4: Authenticate member for subsequent requests
  await api.functional.auth.member.login(connection, {
    body: {
      email: memberEmail,
      password: memberPassword,
      href: "http://localhost:3000/posts",
      referrer: "http://localhost:3000",
    } satisfies ICommunityPlatformMember.ILogin,
  });

  // Step 5: Create link post with provided metadata
  const linkUrl = "https://example.com/article";
  const postWithMetadata: ICommunityPlatformPost =
    await api.functional.communityPlatform.member.posts.create(connection, {
      body: {
        community_id: category.id,
        post_type: "link",
        title: RandomGenerator.paragraph({ sentences: 3 }),
        content_link_url: linkUrl,
        content_link_title: "Example Article Title",
        content_link_description: "This is an example article description",
        content_link_thumbnail_url: "https://example.com/image.jpg",
        is_nsfw: false,
        has_spoiler: false,
      } satisfies ICommunityPlatformPost.ICreate,
    });
  typia.assert(postWithMetadata);

  // Step 6: Verify post with provided metadata
  TestValidator.equals(
    "post type should be link",
    postWithMetadata.post_type,
    "link",
  );
  TestValidator.equals(
    "content_link_url should match input",
    postWithMetadata.content_link_url,
    linkUrl,
  );
  TestValidator.equals(
    "content_link_title should match provided metadata",
    postWithMetadata.content_link_title,
    "Example Article Title",
  );
  TestValidator.equals(
    "content_link_description should match provided metadata",
    postWithMetadata.content_link_description,
    "This is an example article description",
  );
  TestValidator.equals(
    "content_link_thumbnail_url should match provided metadata",
    postWithMetadata.content_link_thumbnail_url,
    "https://example.com/image.jpg",
  );
  TestValidator.equals(
    "content_text should be null for link posts",
    postWithMetadata.content_text,
    null,
  );
  TestValidator.equals(
    "vote_score should initialize to zero",
    postWithMetadata.vote_score,
    0,
  );
  TestValidator.equals(
    "upvote_count should initialize to zero",
    postWithMetadata.upvote_count,
    0,
  );
  TestValidator.equals(
    "downvote_count should initialize to zero",
    postWithMetadata.downvote_count,
    0,
  );
  TestValidator.equals(
    "comment_count should initialize to zero",
    postWithMetadata.comment_count,
    0,
  );
  TestValidator.equals(
    "visibility_status should default to public",
    postWithMetadata.visibility_status,
    "public",
  );
  TestValidator.equals(
    "is_nsfw should match input",
    postWithMetadata.is_nsfw,
    false,
  );
  TestValidator.equals(
    "has_spoiler should match input",
    postWithMetadata.has_spoiler,
    false,
  );
  TestValidator.predicate(
    "creator should be properly attributed",
    postWithMetadata.creator.id === member.id,
  );
  TestValidator.equals(
    "community should match provided community_id",
    postWithMetadata.community.id,
    category.id,
  );

  // Step 7: Create link post without explicit metadata (backend should auto-extract)
  const postWithoutMetadata: ICommunityPlatformPost =
    await api.functional.communityPlatform.member.posts.create(connection, {
      body: {
        community_id: category.id,
        post_type: "link",
        title: RandomGenerator.paragraph({ sentences: 3 }),
        content_link_url: "https://www.example.org/page",
        is_nsfw: false,
        has_spoiler: false,
      } satisfies ICommunityPlatformPost.ICreate,
    });
  typia.assert(postWithoutMetadata);

  // Step 8: Verify post without explicit metadata
  TestValidator.equals(
    "post type should be link",
    postWithoutMetadata.post_type,
    "link",
  );
  TestValidator.equals(
    "content_link_url should be populated",
    postWithoutMetadata.content_link_url,
    "https://www.example.org/page",
  );
  TestValidator.equals(
    "content_text should be null for link posts",
    postWithoutMetadata.content_text,
    null,
  );
  TestValidator.equals(
    "vote_score should initialize to zero",
    postWithoutMetadata.vote_score,
    0,
  );
  TestValidator.equals(
    "upvote_count should initialize to zero",
    postWithoutMetadata.upvote_count,
    0,
  );
  TestValidator.equals(
    "downvote_count should initialize to zero",
    postWithoutMetadata.downvote_count,
    0,
  );
  TestValidator.equals(
    "comment_count should initialize to zero",
    postWithoutMetadata.comment_count,
    0,
  );
  TestValidator.equals(
    "visibility_status should default to public",
    postWithoutMetadata.visibility_status,
    "public",
  );
  TestValidator.predicate(
    "creator should be properly attributed",
    postWithoutMetadata.creator.id === member.id,
  );
}
