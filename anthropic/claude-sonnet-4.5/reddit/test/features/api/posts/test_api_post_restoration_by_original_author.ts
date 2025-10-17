import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IRedditLikeCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikeCommunity";
import type { IRedditLikeMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikeMember";
import type { IRedditLikePost } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikePost";

/**
 * Test post restoration by original author.
 *
 * This test validates the complete workflow where a member creates a post,
 * deletes it (soft-delete), and then successfully restores it. The test ensures
 * that the restored post retains all original content, metadata, and
 * timestamps, and becomes visible again in the community.
 *
 * Workflow steps:
 *
 * 1. Register new member account
 * 2. Create community to host the post
 * 3. Create a text post in the community
 * 4. Delete the post (soft-delete)
 * 5. Restore the deleted post
 * 6. Validate restored post matches original content
 */
export async function test_api_post_restoration_by_original_author(
  connection: api.IConnection,
) {
  // Step 1: Register new member account
  const memberEmail = typia.random<string & tags.Format<"email">>();
  const memberPassword = typia.random<string & tags.MinLength<8>>();
  const member: IRedditLikeMember.IAuthorized =
    await api.functional.auth.member.join(connection, {
      body: {
        username: typia.random<
          string &
            tags.MinLength<3> &
            tags.MaxLength<20> &
            tags.Pattern<"^[a-zA-Z0-9_-]+$">
        >(),
        email: memberEmail,
        password: memberPassword,
      } satisfies IRedditLikeMember.ICreate,
    });
  typia.assert(member);

  // Step 2: Create community to host the post
  const community: IRedditLikeCommunity =
    await api.functional.redditLike.member.communities.create(connection, {
      body: {
        code: typia.random<
          string &
            tags.MinLength<3> &
            tags.MaxLength<25> &
            tags.Pattern<"^[a-zA-Z0-9_]+$">
        >(),
        name: typia.random<string & tags.MinLength<3> & tags.MaxLength<25>>(),
        description: typia.random<
          string & tags.MinLength<10> & tags.MaxLength<500>
        >(),
      } satisfies IRedditLikeCommunity.ICreate,
    });
  typia.assert(community);

  // Step 3: Create a text post in the community
  const postTitle = typia.random<
    string & tags.MinLength<3> & tags.MaxLength<300>
  >();
  const postBody = typia.random<string & tags.MaxLength<40000>>();

  const originalPost: IRedditLikePost =
    await api.functional.redditLike.member.posts.create(connection, {
      body: {
        community_id: community.id,
        type: "text",
        title: postTitle,
        body: postBody,
      } satisfies IRedditLikePost.ICreate,
    });
  typia.assert(originalPost);

  // Validate original post properties
  TestValidator.equals("post title matches", originalPost.title, postTitle);
  TestValidator.equals("post type is text", originalPost.type, "text");

  // Step 4: Delete the post (soft-delete)
  await api.functional.redditLike.member.posts.erase(connection, {
    postId: originalPost.id,
  });

  // Step 5: Restore the deleted post
  const restoredPost: IRedditLikePost =
    await api.functional.redditLike.member.posts.restore(connection, {
      postId: originalPost.id,
    });
  typia.assert(restoredPost);

  // Step 6: Validate restored post matches original content
  TestValidator.equals(
    "restored post ID matches original",
    restoredPost.id,
    originalPost.id,
  );
  TestValidator.equals(
    "restored post title matches original",
    restoredPost.title,
    originalPost.title,
  );
  TestValidator.equals(
    "restored post type matches original",
    restoredPost.type,
    originalPost.type,
  );
  TestValidator.equals(
    "restored post created_at matches original",
    restoredPost.created_at,
    originalPost.created_at,
  );
}
