import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IRedditCommunityCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityCommunity";
import type { IRedditCommunityCommunityCategories } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityCommunityCategories";
import type { IRedditCommunityMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityMember";
import type { IRedditCommunityPost } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityPost";
import type { IRedditCommunityPostType } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityPostType";

/**
 * Test updating both post content and type classification in a single operation
 * to validate compound field updates.
 *
 * This test validates the IRedditCommunityPost.IUpdate schema's flexibility
 * where multiple optional fields can be modified together in a single API call.
 * The scenario demonstrates transforming a text post to a link post by
 * simultaneously updating title, content, and adding a link URL, testing the
 * compound update capability of the update endpoint.
 *
 * 1. Create authenticated member account for post operations
 * 2. Create initial text post with title and content
 * 3. Perform simultaneous update changing title, content, and adding link URL
 * 4. Validate all fields were updated correctly and timestamps reflect
 *    modification
 * 5. Test post type classification change by updating reddit_post_type_id
 * 6. Verify atomic update behavior - all modifications applied together
 *
 * @param connection API connection for executing HTTP requests
 */
export async function test_api_post_update_content_and_type_simultaneous(
  connection: api.IConnection,
) {
  // Step 1: Create authenticated member account
  const member = await api.functional.auth.member.join(connection, {
    body: {
      nickname: RandomGenerator.name(),
      email: typia.random<string & tags.Format<"email">>(),
      password: "SecurePassword123!",
    } satisfies IRedditCommunityMember.ICreate,
  });
  typia.assert(member);

  // Step 2: Create initial text post with basic content
  const communityId = typia.random<string & tags.Format<"uuid">>();
  const textPostTypeId = typia.random<string & tags.Format<"uuid">>();
  const linkPostTypeId = typia.random<string & tags.Format<"uuid">>();

  const originalPost = await api.functional.redditCommunity.member.posts.create(
    connection,
    {
      body: {
        title: "Original Text Post Title",
        content:
          "This is the original text content for testing compound updates. It provides context that will be completely changed during the update operation.",
        reddit_community_id: communityId,
        reddit_post_type_id: textPostTypeId,
      } satisfies IRedditCommunityPost.ICreate,
    },
  );
  typia.assert(originalPost);

  TestValidator.equals(
    "original post should have text content",
    originalPost.content !== null,
    true,
  );
  TestValidator.equals(
    "original post should not have link URL",
    originalPost.link_url,
    null,
  );

  // Step 3: Simultaneous update - change multiple fields at once including post type
  const updateData = {
    title: "Updated Link Post Title - Transformed from Text",
    content:
      "This content has been updated and now includes link context. The entire post type is being transformed from text-only to link-enabled.",
    link_url: "https://example.com/interesting-article",
    reddit_post_type_id: linkPostTypeId, // Critical: Update post type classification
  } satisfies IRedditCommunityPost.IUpdate;

  const updatedPost = await api.functional.redditCommunity.member.posts.update(
    connection,
    {
      postId: originalPost.id,
      body: updateData,
    },
  );
  typia.assert(updatedPost);

  // Step 4: Validate all fields were updated correctly in atomic operation
  TestValidator.notEquals(
    "title should be updated",
    updatedPost.title,
    originalPost.title,
  );
  TestValidator.equals(
    "updated title should match input",
    updatedPost.title,
    updateData.title,
  );
  TestValidator.notEquals(
    "content should be updated",
    updatedPost.content,
    originalPost.content,
  );
  TestValidator.equals(
    "updated content should match input",
    updatedPost.content,
    updateData.content,
  );
  TestValidator.notEquals(
    "link_url should be added",
    updatedPost.link_url,
    null,
  );
  TestValidator.equals(
    "link_url should match input",
    updatedPost.link_url,
    updateData.link_url,
  );
  TestValidator.notEquals(
    "post type classification should be updated",
    updatedPost.post_type.id,
    originalPost.post_type.id,
  );

  // Validate timestamp progression
  TestValidator.predicate(
    "updated_at should be later than created_at",
    updatedPost.updated_at > updatedPost.created_at,
  );

  // Step 5: Test mass assignment protection - verify other fields unchanged
  TestValidator.equals(
    "post ID should remain the same",
    updatedPost.id,
    originalPost.id,
  );
  TestValidator.equals(
    "author should remain the same",
    updatedPost.author.id,
    originalPost.author.id,
  );
  TestValidator.equals(
    "community should remain the same",
    updatedPost.community.id,
    originalPost.community.id,
  );
  TestValidator.equals(
    "locked status should remain unchanged",
    updatedPost.is_locked,
    originalPost.is_locked,
  );
  TestValidator.equals(
    "pinned status should remain unchanged",
    updatedPost.is_pinned,
    originalPost.is_pinned,
  );

  // Step 6: Validate compound update atomicity - all specified fields changed together
  TestValidator.predicate(
    "all updated fields reflect new values simultaneously",
    updatedPost.title === updateData.title &&
      updatedPost.content === updateData.content &&
      updatedPost.link_url === updateData.link_url,
  );
}
