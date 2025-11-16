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
 * Test successful creation of a text-type post in a community.
 *
 * This test validates the complete workflow:
 *
 * 1. Create an authenticated member account via registration
 * 2. Create an administrator account and establish a category
 * 3. Switch back to member context and create a community
 * 4. Create a text post with required fields
 * 5. Verify the post object has correct properties, default values, and
 *    relationships
 *
 * The test ensures text posts initialize with zero engagement metrics, public
 * visibility, default content flags, and valid timestamps, with all non-text
 * content fields set to null.
 */
export async function test_api_post_creation_text_type(
  connection: api.IConnection,
) {
  // Step 1: Create authenticated member account
  const memberEmail = typia.random<string & tags.Format<"email">>();
  const memberData = {
    email: memberEmail,
    username: RandomGenerator.alphabets(10),
    password: "SecurePass123!",
    href: "http://localhost:3000/register",
    referrer: "http://localhost:3000",
  } satisfies ICommunityPlatformMember.ICreate;

  const memberAuth = await api.functional.auth.member.join(connection, {
    body: memberData,
  });
  typia.assert(memberAuth);
  TestValidator.predicate(
    "member authentication token should be issued",
    memberAuth.token.access !== null,
  );

  // Step 2: Create administrator account and category
  const adminEmail = typia.random<string & tags.Format<"email">>();
  const adminData = {
    email: adminEmail,
    password: "AdminPass123!",
    username: RandomGenerator.alphabets(10),
    name: RandomGenerator.name(),
    href: "http://localhost:3000/admin/register",
    referrer: "http://localhost:3000",
  } satisfies ICommunityPlatformAdministrator.ICreate;

  const adminAuth = await api.functional.auth.administrator.join(connection, {
    body: adminData,
  });
  typia.assert(adminAuth);

  // Create a category as administrator
  const categoryData = {
    name: RandomGenerator.name(),
    slug: RandomGenerator.alphabets(10),
    display_order: 1,
  } satisfies ICommunityPlatformCategory.ICreate;

  const category =
    await api.functional.communityPlatform.administrator.categories.create(
      connection,
      {
        body: categoryData,
      },
    );
  typia.assert(category);
  TestValidator.predicate(
    "category slug should be valid",
    category.slug.length > 0,
  );

  // Step 3: Switch back to member and create community
  const memberAuth2 = await api.functional.auth.member.login(connection, {
    body: {
      email: memberEmail,
      password: "SecurePass123!",
      href: "http://localhost:3000/login",
      referrer: "http://localhost:3000",
    } satisfies ICommunityPlatformMember.ILogin,
  });
  typia.assert(memberAuth2);

  const communityData = {
    name: RandomGenerator.name(),
    identifier: RandomGenerator.alphabets(10),
    description: RandomGenerator.paragraph({ sentences: 3 }),
    visibility: "public" as const,
    post_creation_restriction: "open_to_all" as const,
    post_type_restriction: "all_types" as const,
    category_slug: category.slug,
  } satisfies ICommunityPlatformCommunity.ICreate;

  const community =
    await api.functional.communityPlatform.member.communities.create(
      connection,
      {
        body: communityData,
      },
    );
  typia.assert(community);
  TestValidator.equals(
    "community identifier should match",
    community.identifier,
    communityData.identifier,
  );

  // Step 4: Create a text post
  const postData = {
    community_id: community.id,
    post_type: "text" as const,
    title: RandomGenerator.paragraph({ sentences: 2, wordMin: 5, wordMax: 10 }),
    content_text: RandomGenerator.content({ paragraphs: 2 }),
    is_nsfw: false,
    has_spoiler: false,
  } satisfies ICommunityPlatformPost.ICreate;

  const post = await api.functional.communityPlatform.member.posts.create(
    connection,
    {
      body: postData,
    },
  );
  typia.assert(post);

  // Step 5: Validate post properties
  TestValidator.predicate(
    "post ID should be a valid UUID",
    /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
      post.id,
    ),
  );

  TestValidator.equals(
    "post title should match input",
    post.title,
    postData.title,
  );
  TestValidator.equals(
    "post content_text should match input",
    post.content_text,
    postData.content_text,
  );
  TestValidator.equals("post post_type should be text", post.post_type, "text");

  // Validate engagement metrics initialization
  TestValidator.equals(
    "post vote_score should initialize to 0",
    post.vote_score,
    0,
  );
  TestValidator.equals(
    "post upvote_count should initialize to 0",
    post.upvote_count,
    0,
  );
  TestValidator.equals(
    "post downvote_count should initialize to 0",
    post.downvote_count,
    0,
  );
  TestValidator.equals(
    "post comment_count should initialize to 0",
    post.comment_count,
    0,
  );

  // Validate default flags and visibility
  TestValidator.equals(
    "post visibility_status should default to public",
    post.visibility_status,
    "public",
  );
  TestValidator.equals(
    "post is_nsfw should default to false",
    post.is_nsfw,
    false,
  );
  TestValidator.equals(
    "post has_spoiler should default to false",
    post.has_spoiler,
    false,
  );
  TestValidator.equals(
    "post is_locked should default to false",
    post.is_locked,
    false,
  );
  TestValidator.equals(
    "post is_pinned should default to false",
    post.is_pinned,
    false,
  );

  // Validate timestamps
  TestValidator.predicate(
    "post created_at should be a valid ISO date-time",
    /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}.\d{3}Z$/.test(post.created_at),
  );
  TestValidator.predicate(
    "post updated_at should be a valid ISO date-time",
    /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}.\d{3}Z$/.test(post.updated_at),
  );

  // Validate creator information
  TestValidator.predicate(
    "creator should have valid ID",
    /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
      post.creator.id,
    ),
  );
  TestValidator.equals(
    "creator username should match member username",
    post.creator.username,
    memberData.username,
  );

  // Validate community information
  TestValidator.equals(
    "community ID should match",
    post.community.id,
    community.id,
  );
  TestValidator.equals(
    "community identifier should match",
    post.community.identifier,
    community.identifier,
  );

  // Validate non-text content fields are null
  TestValidator.equals(
    "content_link_url should be null for text post",
    post.content_link_url,
    null,
  );
  TestValidator.equals(
    "content_link_title should be null for text post",
    post.content_link_title,
    null,
  );
  TestValidator.equals(
    "content_link_description should be null for text post",
    post.content_link_description,
    null,
  );
  TestValidator.equals(
    "content_link_thumbnail_url should be null for text post",
    post.content_link_thumbnail_url,
    null,
  );
}
