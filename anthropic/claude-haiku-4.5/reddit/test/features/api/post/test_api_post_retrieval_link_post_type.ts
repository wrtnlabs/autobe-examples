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
 * Test retrieval of link posts with Open Graph metadata.
 *
 * This test validates the complete lifecycle of creating and retrieving a link
 * post:
 *
 * 1. Create administrator account for platform setup
 * 2. Create a category for community classification
 * 3. Authenticate as member and create a community
 * 4. Create a link post with external URL and Open Graph metadata
 * 5. Retrieve the link post and validate all fields are correctly populated
 *
 * Validates that:
 *
 * - Content_link_url, content_link_title, content_link_description, and
 *   content_link_thumbnail_url are populated
 * - Content_text is null for link posts
 * - Post_type is 'link'
 * - Engagement metrics are initialized to 0
 * - Visibility_status defaults to 'public'
 * - Creator and community information are properly included
 */
export async function test_api_post_retrieval_link_post_type(
  connection: api.IConnection,
) {
  // Step 1: Create administrator account for platform setup
  const adminEmail = typia.random<string & tags.Format<"email">>();
  const administrator: ICommunityPlatformAdministrator.IAuthorized =
    await api.functional.auth.administrator.join(connection, {
      body: {
        email: adminEmail,
        password: "TestAdmin123!@#",
        username: RandomGenerator.alphaNumeric(10),
        name: RandomGenerator.name(),
        href: "http://localhost:3000",
        referrer: "http://localhost:3000",
      } satisfies ICommunityPlatformAdministrator.ICreate,
    });
  typia.assert(administrator);

  // Step 2: Create a category for community classification
  const category: ICommunityPlatformCategory =
    await api.functional.communityPlatform.administrator.categories.create(
      connection,
      {
        body: {
          name: "Technology",
          slug: "technology",
          description: "Technology and software development discussions",
          display_order: 1,
        } satisfies ICommunityPlatformCategory.ICreate,
      },
    );
  typia.assert(category);

  // Step 3: Authenticate as member
  const memberEmail = typia.random<string & tags.Format<"email">>();
  const member: ICommunityPlatformMember.IAuthorized =
    await api.functional.auth.member.join(connection, {
      body: {
        email: memberEmail,
        username: RandomGenerator.alphaNumeric(12),
        password: "TestMember123!@#",
        href: "http://localhost:3000",
        referrer: "http://localhost:3000",
      } satisfies ICommunityPlatformMember.ICreate,
    });
  typia.assert(member);

  // Step 4: Create a community
  const community: ICommunityPlatformCommunity =
    await api.functional.communityPlatform.member.communities.create(
      connection,
      {
        body: {
          name: "Tech News & Updates",
          identifier: `tech_news_${RandomGenerator.alphaNumeric(6)}`,
          description: "Latest technology news and updates",
          visibility: "public",
          post_creation_restriction: "open_to_all",
          post_type_restriction: "all_types",
          category_slug: category.slug,
        } satisfies ICommunityPlatformCommunity.ICreate,
      },
    );
  typia.assert(community);

  // Step 5: Create a link post with Open Graph metadata
  const externalUrl = "https://example.com/article/interesting-tech-article";
  const linkPost: ICommunityPlatformPost =
    await api.functional.communityPlatform.member.posts.create(connection, {
      body: {
        community_id: community.id,
        post_type: "link",
        title: "Interesting Technology Article",
        content_link_url: externalUrl,
        content_link_title: "Breaking: New Framework Released",
        content_link_description:
          "A revolutionary new framework that simplifies web development",
        content_link_thumbnail_url:
          "https://example.com/images/framework-logo.jpg",
        is_nsfw: false,
        has_spoiler: false,
      } satisfies ICommunityPlatformPost.ICreate,
    });
  typia.assert(linkPost);

  // Step 6: Retrieve the link post and validate all fields
  const retrievedPost: ICommunityPlatformPost =
    await api.functional.communityPlatform.posts.at(connection, {
      postId: linkPost.id,
    });
  typia.assert(retrievedPost);

  // Validate post type is link
  TestValidator.equals(
    "post_type should be 'link'",
    retrievedPost.post_type,
    "link",
  );

  // Validate content_text is null for link posts
  TestValidator.equals(
    "content_text should be null for link posts",
    retrievedPost.content_text,
    null,
  );

  // Validate Open Graph metadata fields are populated
  TestValidator.equals(
    "content_link_url matches input URL",
    retrievedPost.content_link_url,
    externalUrl,
  );

  TestValidator.equals(
    "content_link_title matches input title",
    retrievedPost.content_link_title,
    "Breaking: New Framework Released",
  );

  TestValidator.equals(
    "content_link_description matches input description",
    retrievedPost.content_link_description,
    "A revolutionary new framework that simplifies web development",
  );

  TestValidator.equals(
    "content_link_thumbnail_url matches input thumbnail",
    retrievedPost.content_link_thumbnail_url,
    "https://example.com/images/framework-logo.jpg",
  );

  // Validate engagement metrics are initialized to 0
  TestValidator.equals(
    "vote_score should be initialized to 0",
    retrievedPost.vote_score,
    0,
  );

  TestValidator.equals(
    "upvote_count should be initialized to 0",
    retrievedPost.upvote_count,
    0,
  );

  TestValidator.equals(
    "downvote_count should be initialized to 0",
    retrievedPost.downvote_count,
    0,
  );

  TestValidator.equals(
    "comment_count should be initialized to 0",
    retrievedPost.comment_count,
    0,
  );

  // Validate visibility and default flags
  TestValidator.equals(
    "visibility_status should default to 'public'",
    retrievedPost.visibility_status,
    "public",
  );

  TestValidator.equals("is_nsfw should be false", retrievedPost.is_nsfw, false);

  TestValidator.equals(
    "has_spoiler should be false",
    retrievedPost.has_spoiler,
    false,
  );

  TestValidator.equals(
    "is_locked should be false",
    retrievedPost.is_locked,
    false,
  );

  TestValidator.equals(
    "is_pinned should be false",
    retrievedPost.is_pinned,
    false,
  );

  // Validate title is preserved
  TestValidator.equals(
    "title matches input title",
    retrievedPost.title,
    "Interesting Technology Article",
  );

  // Validate community reference
  TestValidator.equals(
    "community ID matches created community",
    retrievedPost.community.id,
    community.id,
  );

  // Validate creator reference
  TestValidator.equals(
    "creator ID matches authenticated member",
    retrievedPost.creator.id,
    member.id,
  );
}
