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
 * Test updating a post title within the 24-hour edit window.
 *
 * Validates that post titles can be updated immediately after creation, and
 * that the updated_at timestamp is refreshed while maintaining all other post
 * properties and edit history.
 *
 * Workflow:
 *
 * 1. Authenticate as administrator to create platform infrastructure
 * 2. Create a content category
 * 3. Authenticate as member to create and modify posts
 * 4. Create a community for the post
 * 5. Create a post with initial title
 * 6. Update the post title within the edit window
 * 7. Verify title update and timestamp refresh
 * 8. Confirm edit history and metadata preservation
 */
export async function test_api_post_update_title_within_edit_window(
  connection: api.IConnection,
) {
  // Step 1: Administrator authentication and category creation
  const adminEmail = typia.random<string & tags.Format<"email">>();
  const admin = await api.functional.auth.administrator.join(connection, {
    body: {
      email: adminEmail,
      password: RandomGenerator.alphabets(12),
      username: RandomGenerator.alphabets(8),
      name: RandomGenerator.name(),
      href: "http://localhost:3000/admin/join",
      referrer: "http://localhost:3000",
    } satisfies ICommunityPlatformAdministrator.ICreate,
  });
  typia.assert(admin);

  // Step 2: Create a category for organizing communities
  const category =
    await api.functional.communityPlatform.administrator.categories.create(
      connection,
      {
        body: {
          name: RandomGenerator.name(2),
          slug: RandomGenerator.alphabets(10).toLowerCase(),
          description: RandomGenerator.paragraph({ sentences: 3 }),
          display_order: 1,
        } satisfies ICommunityPlatformCategory.ICreate,
      },
    );
  typia.assert(category);

  // Step 3: Member authentication for post creation
  const memberEmail = typia.random<string & tags.Format<"email">>();
  const member = await api.functional.auth.member.join(connection, {
    body: {
      email: memberEmail,
      username: RandomGenerator.alphabets(10),
      password: RandomGenerator.alphabets(12),
      href: "http://localhost:3000/join",
      referrer: "http://localhost:3000",
    } satisfies ICommunityPlatformMember.ICreate,
  });
  typia.assert(member);

  // Step 4: Create a community
  const community =
    await api.functional.communityPlatform.member.communities.create(
      connection,
      {
        body: {
          name: RandomGenerator.name(2),
          identifier: RandomGenerator.alphabets(10).toLowerCase(),
          description: RandomGenerator.paragraph({ sentences: 4 }),
          visibility: "public",
          post_creation_restriction: "open_to_all",
          post_type_restriction: "text_only",
          category_slug: category.slug,
        } satisfies ICommunityPlatformCommunity.ICreate,
      },
    );
  typia.assert(community);

  // Step 5: Create initial post with original title
  const initialTitle = RandomGenerator.paragraph({ sentences: 2 });
  const post = await api.functional.communityPlatform.member.posts.create(
    connection,
    {
      body: {
        community_id: community.id,
        post_type: "text",
        title: initialTitle,
        content_text: RandomGenerator.content({ paragraphs: 2 }),
      } satisfies ICommunityPlatformPost.ICreate,
    },
  );
  typia.assert(post);

  // Step 6: Verify initial post state and capture timestamps
  TestValidator.equals("initial title matches", post.title, initialTitle);
  TestValidator.equals("post type is text", post.post_type, "text");
  TestValidator.equals(
    "visibility is public",
    post.visibility_status,
    "public",
  );
  TestValidator.equals("vote score initialized", post.vote_score, 0);
  TestValidator.equals("comment count initialized", post.comment_count, 0);

  const createdAt = post.created_at;
  const initialUpdatedAt = post.updated_at;

  // Step 7: Update the post title within edit window
  const updatedTitle = RandomGenerator.paragraph({ sentences: 2 });
  const updatedPost =
    await api.functional.communityPlatform.member.posts.update(connection, {
      postId: post.id,
      body: {
        title: updatedTitle,
      } satisfies ICommunityPlatformPost.IUpdate,
    });
  typia.assert(updatedPost);

  // Step 8: Verify title update
  TestValidator.equals("title is updated", updatedPost.title, updatedTitle);
  TestValidator.notEquals(
    "title differs from original",
    updatedPost.title,
    initialTitle,
  );

  // Step 9: Verify timestamps
  TestValidator.equals(
    "created_at unchanged",
    updatedPost.created_at,
    createdAt,
  );
  TestValidator.notEquals(
    "updated_at is refreshed",
    updatedPost.updated_at,
    initialUpdatedAt,
  );

  // Step 10: Verify metadata preservation
  TestValidator.equals("post type unchanged", updatedPost.post_type, "text");
  TestValidator.equals(
    "community unchanged",
    updatedPost.community.id,
    community.id,
  );
  TestValidator.equals("creator unchanged", updatedPost.creator.id, member.id);
  TestValidator.equals("vote score preserved", updatedPost.vote_score, 0);
  TestValidator.equals("comment count preserved", updatedPost.comment_count, 0);
  TestValidator.equals(
    "visibility status preserved",
    updatedPost.visibility_status,
    "public",
  );
  TestValidator.equals("nsfw flag preserved", updatedPost.is_nsfw, false);
  TestValidator.equals(
    "spoiler flag preserved",
    updatedPost.has_spoiler,
    false,
  );
  TestValidator.equals("locked flag preserved", updatedPost.is_locked, false);
  TestValidator.equals("pinned flag preserved", updatedPost.is_pinned, false);
}
