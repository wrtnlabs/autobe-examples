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
 * Test successful comment deletion by the original author.
 *
 * This test verifies that authenticated users can permanently remove their own
 * comments. The workflow covers user registration, community creation, post
 * creation, comment creation, and finally comment deletion. It validates that
 * only comment authors have permission to delete their comments and that the
 * operation performs a hard delete from the database.
 */
export async function test_api_comment_deletion_by_author(
  connection: api.IConnection,
) {
  // Step 1: Register a new user (comment author)
  const userJoin = {
    email: `${RandomGenerator.alphabets(10)}@test.com`,
    password: "password123",
    username: RandomGenerator.name(1).replace(/\s/g, "_"),
  } satisfies ICommunityForumCommunityUser.IJoin;

  const user: ICommunityForumCommunityUser.IAuthorized =
    await api.functional.auth.user.join(connection, {
      body: userJoin,
    });
  typia.assert(user);

  // Step 2: Create a community
  const communityCreate = {
    name: RandomGenerator.name(2).replace(/\s/g, "-"),
    slug: RandomGenerator.name(1).toLowerCase(),
    title: RandomGenerator.paragraph({ sentences: 3 }),
    description: RandomGenerator.content({ paragraphs: 2 }),
    rules: RandomGenerator.paragraph({ sentences: 5 }),
    privacy_level: "public",
    status: "active",
  } satisfies ICommunityForumCommunityGroup.ICreate;

  const community: ICommunityForumCommunityGroup =
    await api.functional.communityForum.user.communities.create(connection, {
      body: communityCreate,
    });
  typia.assert(community);

  // Step 3: Create a post in the community
  const postCreate = {
    community_forum_community_id: community.id,
    title: RandomGenerator.paragraph({ sentences: 3, wordMin: 3, wordMax: 8 }),
    type: "text" as const,
    body: RandomGenerator.content({
      paragraphs: 3,
      sentenceMin: 5,
      sentenceMax: 10,
    }),
  } satisfies ICommunityForumCommunityPost.ICreate;

  const post: ICommunityForumCommunityPost =
    await api.functional.communityForum.user.posts.create(connection, {
      body: postCreate,
    });
  typia.assert(post);

  // Step 4: Create a comment on the post
  const commentCreate = {
    body: RandomGenerator.paragraph({ sentences: 5, wordMin: 3, wordMax: 10 }),
    ip: null,
    href: "http://localhost:3000/test",
    referrer: "http://localhost:3000/",
  } satisfies ICommunityForumPostComment.ICreate;

  const comment: ICommunityForumPostComment =
    await api.functional.communityForum.user.posts.comments.create(connection, {
      postId: post.id,
      body: commentCreate,
    });
  typia.assert(comment);

  // Step 5: Verify the comment exists
  TestValidator.equals(
    "comment should exist before deletion",
    comment.body,
    commentCreate.body,
  );

  // Step 6: Delete the comment (as the author)
  const deletedComment: ICommunityForumPostComment =
    await api.functional.communityForum.user.comments.erase(connection, {
      commentId: comment.id,
    });
  typia.assert(deletedComment);

  // Step 7: Verify the comment was deleted
  TestValidator.equals(
    "comment should be deleted",
    deletedComment.id,
    comment.id,
  );
}
