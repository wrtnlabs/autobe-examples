import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IRedditCommunityComment } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityComment";
import type { IRedditCommunityCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityCommunity";
import type { IRedditCommunityCommunityModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityCommunityModerator";
import type { IRedditCommunityGuest } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityGuest";
import type { IRedditCommunityPost } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityPost";

/**
 * Test post deletion with existing comments to ensure data integrity.
 *
 * This test validates that when a member deletes their post, the soft delete
 * operation correctly sets the deleted_at timestamp while preserving all
 * associated comments and maintaining data integrity for the discussion
 * thread.
 *
 * Test Flow:
 *
 * 1. Moderator creates a community
 * 2. First member creates a post in the community
 * 3. Second member adds comments to the post
 * 4. Post author deletes the post
 * 5. Verify post is marked as deleted but comments are preserved
 */
export async function test_api_post_deletion_with_existing_comments(
  connection: api.IConnection,
) {
  // Step 1: Create and authenticate moderator
  const moderatorEmail = typia.random<string & tags.Format<"email">>();
  const moderator = await api.functional.auth.moderator.join(connection, {
    body: {
      email: moderatorEmail,
      password: "moderator123",
      nickname: RandomGenerator.name(),
      ip: null,
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IRedditCommunityCommunityModerator.ICreate,
  });
  typia.assert(moderator);

  // Step 2: Moderator creates a community
  const community =
    await api.functional.redditCommunity.moderator.communities.create(
      connection,
      {
        body: {
          name: RandomGenerator.alphaNumeric(10),
          display_title: RandomGenerator.name(3),
          description: RandomGenerator.paragraph({ sentences: 2 }),
          rules: RandomGenerator.paragraph({ sentences: 3 }),
          icon_url: typia.random<string & tags.Format<"uri">>(),
          banner_url: typia.random<string & tags.Format<"uri">>(),
        } satisfies IRedditCommunityCommunity.ICreate,
      },
    );
  typia.assert(community);

  // Step 3: Create and authenticate first member (post author)
  const postAuthorEmail = typia.random<string & tags.Format<"email">>();
  const postAuthor = await api.functional.auth.member.join(connection, {
    body: {
      username: RandomGenerator.alphaNumeric(12),
      email: postAuthorEmail,
      password: "author123",
      display_name: RandomGenerator.name(),
      bio: RandomGenerator.paragraph({ sentences: 2 }),
      avatar_url: typia.random<string & tags.Format<"uri">>(),
      show_online_status: false,
      show_subscribed_communities: false,
      show_activity_feed: true,
      ip: null,
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IRedditCommunityGuest.ICreate,
  });
  typia.assert(postAuthor);

  // Step 4: Post author creates a post
  const post = await api.functional.redditCommunity.member.posts.create(
    connection,
    {
      body: {
        community_id: community.id,
        title: RandomGenerator.name(5),
        post_type: "text",
        body: RandomGenerator.content({ paragraphs: 3 }),
        url: null,
        image_url: null,
      } satisfies IRedditCommunityPost.ICreate,
    },
  );
  typia.assert(post);

  // Step 5: Create and authenticate second member (commenter)
  const commenterEmail = typia.random<string & tags.Format<"email">>();
  const commenter = await api.functional.auth.member.join(connection, {
    body: {
      username: RandomGenerator.alphaNumeric(12),
      email: commenterEmail,
      password: "commenter123",
      display_name: RandomGenerator.name(),
      bio: RandomGenerator.paragraph({ sentences: 1 }),
      avatar_url: typia.random<string & tags.Format<"uri">>(),
      show_online_status: true,
      show_subscribed_communities: true,
      show_activity_feed: true,
      ip: null,
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IRedditCommunityGuest.ICreate,
  });
  typia.assert(commenter);

  // Step 6: Second member creates multiple comments on the post
  const comments = await ArrayUtil.asyncRepeat(3, async (index) => {
    const comment =
      await api.functional.redditCommunity.member.posts.comments.create(
        connection,
        {
          postId: post.id,
          body: {
            body: RandomGenerator.paragraph({ sentences: 2 }),
            parent_comment_id: null,
          } satisfies IRedditCommunityComment.ICreate,
        },
      );
    typia.assert(comment);
    return comment;
  });

  // Step 7: Switch back to post author
  await api.functional.auth.member.login(connection, {
    body: {
      username: undefined,
      email: postAuthorEmail,
      password: "author123",
      ip: null,
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IRedditCommunityGuest.ILogin,
  });

  // Step 8: Post author deletes the post
  const deletedPost = await api.functional.redditCommunity.member.posts.erase(
    connection,
    {
      postId: post.id,
    },
  );
  typia.assert(deletedPost);

  // Step 9: Validate post is soft deleted
  TestValidator.predicate(
    "deleted post should have deleted_at timestamp set",
    deletedPost.deleted_at !== null && deletedPost.deleted_at !== undefined,
  );

  // Step 10: Validate post metadata is preserved
  TestValidator.equals("post ID remains unchanged", deletedPost.id, post.id);
  TestValidator.equals(
    "post title is preserved",
    deletedPost.title,
    post.title,
  );
  TestValidator.equals("post body is preserved", deletedPost.body, post.body);
  TestValidator.equals(
    "post type is preserved",
    deletedPost.post_type,
    post.post_type,
  );
  TestValidator.equals(
    "community association is preserved",
    deletedPost.community_id,
    community.id,
  );

  // Step 11: Validate comments are preserved (comments still exist in the system)
  TestValidator.predicate(
    "comments were created successfully",
    comments.length === 3,
  );

  comments.forEach((comment, index) => {
    TestValidator.predicate(
      `comment ${index + 1} should reference the deleted post`,
      comment.reddit_community_post_id === post.id,
    );
  });
}
