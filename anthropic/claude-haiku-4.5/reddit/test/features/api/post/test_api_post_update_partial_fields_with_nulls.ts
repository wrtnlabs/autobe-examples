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
 * Test partial updates using null values to indicate 'no change' on posts.
 *
 * This test validates that when updating a post, null values in the request do
 * not overwrite existing data. Only non-null fields should be modified, while
 * other fields retain their original values. This ensures proper partial update
 * semantics where null means "no change" rather than deletion.
 *
 * The test flow:
 *
 * 1. Create an administrator and category for post creation
 * 2. Create a member user account
 * 3. Create a community in the category
 * 4. Create a post with initial content (title, content_text, is_nsfw flag)
 * 5. Update the post with null values for most fields (title and is_nsfw only)
 * 6. Verify the response shows updated title and is_nsfw
 * 7. Verify unchanged fields retain their original values
 * 8. Validate that null values did not clear or modify other fields
 */
export async function test_api_post_update_partial_fields_with_nulls(
  connection: api.IConnection,
) {
  // Step 1: Create administrator account and category
  const adminEmail = typia.random<string & tags.Format<"email">>();
  const admin: ICommunityPlatformAdministrator.IAuthorized =
    await api.functional.auth.administrator.join(connection, {
      body: {
        email: adminEmail,
        password: RandomGenerator.alphabets(12),
        username: RandomGenerator.name(1),
        name: RandomGenerator.name(),
        href: "http://localhost:3000",
        referrer: "http://localhost:3000",
      } satisfies ICommunityPlatformAdministrator.ICreate,
    });
  typia.assert(admin);

  const category: ICommunityPlatformCategory =
    await api.functional.communityPlatform.administrator.categories.create(
      connection,
      {
        body: {
          name: RandomGenerator.name(),
          slug: RandomGenerator.alphabets(10),
          display_order: 1,
        } satisfies ICommunityPlatformCategory.ICreate,
      },
    );
  typia.assert(category);

  // Step 2: Create member user account
  const memberEmail = typia.random<string & tags.Format<"email">>();
  const member: ICommunityPlatformMember.IAuthorized =
    await api.functional.auth.member.join(connection, {
      body: {
        email: memberEmail,
        username: RandomGenerator.name(1),
        password: RandomGenerator.alphabets(12),
        href: "http://localhost:3000",
        referrer: "http://localhost:3000",
      } satisfies ICommunityPlatformMember.ICreate,
    });
  typia.assert(member);

  // Step 3: Create community
  const community: ICommunityPlatformCommunity =
    await api.functional.communityPlatform.member.communities.create(
      connection,
      {
        body: {
          name: RandomGenerator.name(),
          identifier: RandomGenerator.alphabets(10),
          category_slug: category.slug,
          visibility: "public",
          post_creation_restriction: "open_to_all",
          post_type_restriction: "all_types",
        } satisfies ICommunityPlatformCommunity.ICreate,
      },
    );
  typia.assert(community);

  // Step 4: Create initial post with multiple fields
  const originalTitle = RandomGenerator.paragraph({ sentences: 3 });
  const originalContent = RandomGenerator.content({ paragraphs: 2 });
  const originalPost: ICommunityPlatformPost =
    await api.functional.communityPlatform.member.posts.create(connection, {
      body: {
        community_id: community.id,
        post_type: "text",
        title: originalTitle,
        content_text: originalContent,
        is_nsfw: false,
        has_spoiler: true,
      } satisfies ICommunityPlatformPost.ICreate,
    });
  typia.assert(originalPost);

  TestValidator.equals(
    "original title matches",
    originalPost.title,
    originalTitle,
  );
  TestValidator.equals(
    "original content matches",
    originalPost.content_text,
    originalContent,
  );
  TestValidator.equals(
    "original is_nsfw is false",
    originalPost.is_nsfw,
    false,
  );
  TestValidator.equals(
    "original has_spoiler is true",
    originalPost.has_spoiler,
    true,
  );

  // Step 5: Update post with null values for unchanged fields
  const updatedTitle = RandomGenerator.paragraph({ sentences: 2 });
  const updatedPost: ICommunityPlatformPost =
    await api.functional.communityPlatform.member.posts.update(connection, {
      postId: originalPost.id,
      body: {
        title: updatedTitle,
        content_text: null, // No change
        is_nsfw: true, // Only flag update
        has_spoiler: null, // No change
      } satisfies ICommunityPlatformPost.IUpdate,
    });
  typia.assert(updatedPost);

  // Step 6: Verify updated fields
  TestValidator.equals("title was updated", updatedPost.title, updatedTitle);
  TestValidator.equals(
    "is_nsfw was updated to true",
    updatedPost.is_nsfw,
    true,
  );

  // Step 7: Verify unchanged fields retained original values
  TestValidator.equals(
    "content_text not overwritten by null",
    updatedPost.content_text,
    originalContent,
  );
  TestValidator.equals(
    "has_spoiler not overwritten by null",
    updatedPost.has_spoiler,
    true,
  );

  // Step 8: Validate comment count and vote counts unchanged
  TestValidator.equals(
    "comment count unchanged",
    updatedPost.comment_count,
    originalPost.comment_count,
  );
  TestValidator.equals(
    "vote score unchanged",
    updatedPost.vote_score,
    originalPost.vote_score,
  );
  TestValidator.equals(
    "upvote count unchanged",
    updatedPost.upvote_count,
    originalPost.upvote_count,
  );

  // Step 9: Test updating with all null values (should have no effect)
  const noChangePost: ICommunityPlatformPost =
    await api.functional.communityPlatform.member.posts.update(connection, {
      postId: originalPost.id,
      body: {
        title: null,
        content_text: null,
        is_nsfw: null,
        has_spoiler: null,
      } satisfies ICommunityPlatformPost.IUpdate,
    });
  typia.assert(noChangePost);

  // Verify all fields remain unchanged after null-only update
  TestValidator.equals(
    "title unchanged with all-null update",
    noChangePost.title,
    updatedTitle,
  );
  TestValidator.equals(
    "is_nsfw unchanged with all-null update",
    noChangePost.is_nsfw,
    true,
  );
  TestValidator.equals(
    "content_text unchanged with all-null update",
    noChangePost.content_text,
    originalContent,
  );
  TestValidator.equals(
    "has_spoiler unchanged with all-null update",
    noChangePost.has_spoiler,
    true,
  );
}
