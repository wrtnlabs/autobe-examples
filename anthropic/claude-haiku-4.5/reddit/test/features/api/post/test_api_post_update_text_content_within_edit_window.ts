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
 * Test updating text post content within the 24-hour edit window.
 *
 * Validates that a member can successfully modify the text content of their own
 * post within the 24-hour edit window. The test creates the necessary platform
 * infrastructure (category, community), creates a text post with initial
 * markdown content, then updates it with new markdown content and verifies the
 * changes are reflected properly.
 *
 * Workflow:
 *
 * 1. Create an administrator account and register a content category
 * 2. Create a member account for the post creator
 * 3. Create a community in the category
 * 4. Create an initial text post with markdown content
 * 5. Update the post with new markdown content within edit window
 * 6. Verify updated post content and post_type remain correct
 * 7. Confirm updated_at timestamp is refreshed
 */
export async function test_api_post_update_text_content_within_edit_window(
  connection: api.IConnection,
) {
  // Step 1: Create administrator and category
  const adminEmail = typia.random<string & tags.Format<"email">>();
  const admin = await api.functional.auth.administrator.join(connection, {
    body: {
      email: adminEmail,
      password: "SecurePassword123!",
      username: RandomGenerator.alphaNumeric(8),
      name: RandomGenerator.name(2),
      href: "http://localhost:3000/admin",
      referrer: "http://localhost:3000",
      ip: "127.0.0.1",
    } satisfies ICommunityPlatformAdministrator.ICreate,
  });
  typia.assert(admin);

  const category =
    await api.functional.communityPlatform.administrator.categories.create(
      connection,
      {
        body: {
          name: "Technology",
          slug: "technology",
          display_order: 1,
          description: "Technology and programming discussions",
          icon_url: "http://localhost:3000/icons/technology.png",
        } satisfies ICommunityPlatformCategory.ICreate,
      },
    );
  typia.assert(category);

  // Step 2: Create member account
  const memberEmail = typia.random<string & tags.Format<"email">>();
  const member = await api.functional.auth.member.join(connection, {
    body: {
      email: memberEmail,
      username: RandomGenerator.alphaNumeric(10),
      password: "SecurePassword123!",
      href: "http://localhost:3000/join",
      referrer: "http://localhost:3000",
      ip: "127.0.0.1",
    } satisfies ICommunityPlatformMember.ICreate,
  });
  typia.assert(member);

  // Step 3: Create community
  const community =
    await api.functional.communityPlatform.member.communities.create(
      connection,
      {
        body: {
          name: "TypeScript Discussion",
          identifier: `ts_${RandomGenerator.alphaNumeric(6)}`,
          description: "Discussion about TypeScript best practices",
          visibility: "public",
          post_creation_restriction: "open_to_all",
          post_type_restriction: "text_only",
          category_slug: category.slug,
        } satisfies ICommunityPlatformCommunity.ICreate,
      },
    );
  typia.assert(community);

  // Step 4: Create initial text post
  const initialContent = RandomGenerator.paragraph({
    sentences: 5,
    wordMin: 4,
    wordMax: 8,
  });
  const post = await api.functional.communityPlatform.member.posts.create(
    connection,
    {
      body: {
        community_id: community.id,
        post_type: "text",
        title: "Initial Post Title",
        content_text: initialContent,
        is_nsfw: false,
        has_spoiler: false,
      } satisfies ICommunityPlatformPost.ICreate,
    },
  );
  typia.assert(post);

  TestValidator.equals("initial post type is text", post.post_type, "text");
  TestValidator.equals(
    "initial content matches input",
    post.content_text,
    initialContent,
  );
  TestValidator.equals(
    "initial visibility is public",
    post.visibility_status,
    "public",
  );

  const createdAt = new Date(post.created_at);
  const initialUpdatedAt = new Date(post.updated_at);

  // Step 5: Update post with new content within edit window
  const updatedContent = RandomGenerator.paragraph({
    sentences: 7,
    wordMin: 4,
    wordMax: 9,
  });
  const updatedPost =
    await api.functional.communityPlatform.member.posts.update(connection, {
      postId: post.id,
      body: {
        content_text: updatedContent,
      } satisfies ICommunityPlatformPost.IUpdate,
    });
  typia.assert(updatedPost);

  // Step 6: Verify post type remains text
  TestValidator.equals(
    "post type remains text after update",
    updatedPost.post_type,
    "text",
  );

  // Step 7: Verify content was updated
  TestValidator.equals(
    "content text is updated",
    updatedPost.content_text,
    updatedContent,
  );
  TestValidator.notEquals(
    "content differs from initial",
    updatedPost.content_text,
    initialContent,
  );

  // Step 8: Verify visibility status unchanged
  TestValidator.equals(
    "visibility status remains public",
    updatedPost.visibility_status,
    "public",
  );

  // Step 9: Verify timestamps
  TestValidator.equals(
    "created_at is unchanged",
    updatedPost.created_at,
    post.created_at,
  );

  const updatedAtTime = new Date(updatedPost.updated_at);
  TestValidator.predicate("updated_at timestamp is refreshed", () => {
    return updatedAtTime.getTime() >= initialUpdatedAt.getTime();
  });

  // Step 10: Verify post ID is unchanged
  TestValidator.equals("post id remains same", updatedPost.id, post.id);
}
