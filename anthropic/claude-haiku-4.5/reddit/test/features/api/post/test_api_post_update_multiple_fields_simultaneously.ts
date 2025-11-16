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
 * Test updating multiple post fields in a single request.
 *
 * This test creates a post and then updates multiple fields simultaneously,
 * verifying that all changes are applied atomically and that the updated_at
 * timestamp is properly refreshed to reflect the modification.
 *
 * Test workflow:
 *
 * 1. Administrator joins and creates a content category
 * 2. Member joins and authenticates
 * 3. Member creates a community
 * 4. Member creates an initial post
 * 5. Member updates title, content, and is_nsfw flag together
 * 6. Verify all fields were updated correctly
 * 7. Confirm updated_at is newer than created_at
 */
export async function test_api_post_update_multiple_fields_simultaneously(
  connection: api.IConnection,
) {
  // Step 1: Administrator joins and creates a category
  const adminAuthResp: ICommunityPlatformAdministrator.IAuthorized =
    await api.functional.auth.administrator.join(connection, {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        password: RandomGenerator.alphaNumeric(12),
        username: RandomGenerator.alphabets(8),
        name: RandomGenerator.name(),
        href: typia.random<string & tags.Format<"uri">>(),
        referrer: typia.random<string & tags.Format<"uri">>(),
      } satisfies ICommunityPlatformAdministrator.ICreate,
    });
  typia.assert(adminAuthResp);

  const category: ICommunityPlatformCategory =
    await api.functional.communityPlatform.administrator.categories.create(
      connection,
      {
        body: {
          name: "Technology",
          slug: "technology",
          display_order: 1,
        } satisfies ICommunityPlatformCategory.ICreate,
      },
    );
  typia.assert(category);

  // Step 2: Member joins and authenticates
  const memberEmail = typia.random<string & tags.Format<"email">>();
  const memberAuthResp: ICommunityPlatformMember.IAuthorized =
    await api.functional.auth.member.join(connection, {
      body: {
        email: memberEmail,
        username: RandomGenerator.alphabets(8),
        password: RandomGenerator.alphaNumeric(12),
        href: typia.random<string & tags.Format<"uri">>(),
        referrer: typia.random<string & tags.Format<"uri">>(),
      } satisfies ICommunityPlatformMember.ICreate,
    });
  typia.assert(memberAuthResp);

  // Step 3: Member creates a community
  const community: ICommunityPlatformCommunity =
    await api.functional.communityPlatform.member.communities.create(
      connection,
      {
        body: {
          name: "Tech Discussions",
          identifier: RandomGenerator.alphabets(8).toLowerCase(),
          visibility: "public",
          post_creation_restriction: "open_to_all",
          post_type_restriction: "all_types",
          category_slug: category.slug,
        } satisfies ICommunityPlatformCommunity.ICreate,
      },
    );
  typia.assert(community);

  // Step 4: Member creates an initial post
  const initialTitle = RandomGenerator.paragraph({
    sentences: 3,
    wordMin: 2,
    wordMax: 5,
  });
  const initialContent = RandomGenerator.content({
    paragraphs: 2,
    sentenceMin: 5,
    sentenceMax: 8,
  });
  const post: ICommunityPlatformPost =
    await api.functional.communityPlatform.member.posts.create(connection, {
      body: {
        community_id: community.id,
        post_type: "text",
        title: initialTitle,
        content_text: initialContent,
        is_nsfw: false,
      } satisfies ICommunityPlatformPost.ICreate,
    });
  typia.assert(post);

  TestValidator.equals("initial post title matches", post.title, initialTitle);
  TestValidator.equals(
    "initial post content matches",
    post.content_text,
    initialContent,
  );
  TestValidator.equals("initial post is_nsfw is false", post.is_nsfw, false);

  // Small delay to ensure updated_at will be different
  await new Promise((resolve) => setTimeout(resolve, 100));

  // Step 5: Update multiple fields simultaneously
  const updatedTitle = RandomGenerator.paragraph({
    sentences: 3,
    wordMin: 2,
    wordMax: 5,
  });
  const updatedContent = RandomGenerator.content({
    paragraphs: 2,
    sentenceMin: 5,
    sentenceMax: 8,
  });
  const updatedPost: ICommunityPlatformPost =
    await api.functional.communityPlatform.member.posts.update(connection, {
      postId: post.id,
      body: {
        title: updatedTitle,
        content_text: updatedContent,
        is_nsfw: true,
      } satisfies ICommunityPlatformPost.IUpdate,
    });
  typia.assert(updatedPost);

  // Step 6: Verify all fields were updated correctly
  TestValidator.equals(
    "updated post title matches new value",
    updatedPost.title,
    updatedTitle,
  );
  TestValidator.equals(
    "updated post content matches new value",
    updatedPost.content_text,
    updatedContent,
  );
  TestValidator.equals(
    "updated post is_nsfw is true",
    updatedPost.is_nsfw,
    true,
  );

  // Verify other fields remained unchanged
  TestValidator.equals("post ID unchanged", updatedPost.id, post.id);
  TestValidator.equals(
    "post type unchanged",
    updatedPost.post_type,
    post.post_type,
  );
  TestValidator.equals(
    "community ID unchanged",
    updatedPost.community.id,
    community.id,
  );

  // Step 7: Confirm updated_at is newer than created_at
  const createdAtTime = new Date(post.created_at).getTime();
  const updatedAtTime = new Date(updatedPost.updated_at).getTime();
  TestValidator.predicate(
    "updated_at is more recent than created_at",
    updatedAtTime > createdAtTime,
  );

  // Step 8: Verify atomic update - all changes succeeded together
  TestValidator.predicate(
    "all fields updated atomically",
    updatedPost.title !== post.title &&
      updatedPost.content_text !== post.content_text &&
      updatedPost.is_nsfw !== post.is_nsfw,
  );
}
