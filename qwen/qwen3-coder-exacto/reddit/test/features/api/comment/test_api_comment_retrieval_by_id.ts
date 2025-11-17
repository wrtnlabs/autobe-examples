import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { ICommunityForumAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityForumAuthorizationToken";
import type { ICommunityForumCommunityGroup } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityForumCommunityGroup";
import type { ICommunityForumCommunityPost } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityForumCommunityPost";
import type { ICommunityForumCommunityUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityForumCommunityUser";
import type { ICommunityForumPostComment } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityForumPostComment";

/**
 * Test retrieving detailed information about a specific forum comment by its
 * ID.
 *
 * This test validates that comments can be accessed directly via their unique
 * identifier, returning complete comment details including content, author
 * information, timestamps, and vote statistics. The test ensures that deleted
 * comments return appropriate 404 responses while maintaining access to
 * comments removed by moderators for transparency purposes.
 *
 * The test follows these steps:
 *
 * 1. Create a user through registration
 * 2. Create a community using that user
 * 3. Create a post within that community
 * 4. Create a comment on that post
 * 5. Retrieve the comment by its ID and validate the response
 */
export async function test_api_comment_retrieval_by_id(
  connection: api.IConnection,
) {
  // Step 1: Create a user through registration
  const userEmail = `${RandomGenerator.alphabets(10)}@test.com`;
  const userPassword = "password123";
  const userUsername = RandomGenerator.alphabets(8);

  const user: ICommunityForumCommunityUser.IAuthorized =
    await api.functional.auth.user.join(connection, {
      body: {
        email: userEmail,
        password: userPassword,
        username: userUsername,
      } satisfies ICommunityForumCommunityUser.IJoin,
    });
  typia.assert(user);

  // Step 2: Create a community using that user
  const communityName = RandomGenerator.alphabets(10);
  const communitySlug = RandomGenerator.alphabets(10);

  const community: ICommunityForumCommunityGroup =
    await api.functional.communityForum.user.communities.create(connection, {
      body: {
        name: communityName,
        slug: communitySlug,
        title: RandomGenerator.name(3),
        description: RandomGenerator.paragraph(),
        rules: RandomGenerator.paragraph(),
        privacy_level: "public",
        status: "active",
      } satisfies ICommunityForumCommunityGroup.ICreate,
    });
  typia.assert(community);

  // Step 3: Create a post within that community
  const postTitle = RandomGenerator.name(5);

  const post: ICommunityForumCommunityPost =
    await api.functional.communityForum.user.posts.create(connection, {
      body: {
        community_forum_community_id: community.id,
        title: postTitle,
        type: "text",
        body: RandomGenerator.paragraph(),
      } satisfies ICommunityForumCommunityPost.ICreate,
    });
  typia.assert(post);

  // Step 4: Create a comment on that post
  const commentBody = RandomGenerator.paragraph({ sentences: 3 });

  const comment: ICommunityForumPostComment =
    await api.functional.communityForum.user.posts.comments.create(connection, {
      postId: post.id,
      body: {
        body: commentBody,
        ip: "127.0.0.1",
        href: "http://localhost/test",
        referrer: "http://localhost/",
      } satisfies ICommunityForumPostComment.ICreate,
    });
  typia.assert(comment);

  // Step 5: Retrieve the comment by its ID and validate the response
  const retrievedComment: ICommunityForumPostComment =
    await api.functional.communityForum.comments.at(connection, {
      commentId: comment.id,
    });
  typia.assert(retrievedComment);

  // Validate that the retrieved comment matches the created comment
  TestValidator.equals(
    "comment ID should match",
    retrievedComment.id,
    comment.id,
  );
  TestValidator.equals(
    "comment body should match",
    retrievedComment.body,
    comment.body,
  );
  TestValidator.equals(
    "comment post ID should match",
    retrievedComment.community_forum_post_id,
    post.id,
  );
  TestValidator.equals(
    "comment user ID should match",
    retrievedComment.community_forum_user_id,
    user.id,
  );
  TestValidator.predicate(
    "comment should have creation timestamp",
    () =>
      retrievedComment.created_at !== undefined &&
      retrievedComment.created_at !== null,
  );

  // Additional validations for timestamp formats
  typia.assert<string & tags.Format<"date-time">>(retrievedComment.created_at);

  if (retrievedComment.updated_at !== undefined) {
    typia.assert<string & tags.Format<"date-time">>(
      retrievedComment.updated_at,
    );
  }

  if (
    retrievedComment.deleted_at !== undefined &&
    retrievedComment.deleted_at !== null
  ) {
    typia.assert<string & tags.Format<"date-time">>(
      retrievedComment.deleted_at,
    );
  }
}
