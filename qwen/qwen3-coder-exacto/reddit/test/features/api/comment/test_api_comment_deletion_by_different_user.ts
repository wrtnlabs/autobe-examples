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
 * Test that users cannot delete comments created by other users.
 *
 * This test verifies the security boundary that only comment authors can remove
 * their own comments. The workflow involves:
 *
 * 1. Creating first user (comment author)
 * 2. Creating a community with the first user
 * 3. Creating a post in that community
 * 4. Creating a comment on that post by the first user
 * 5. Creating second user (attempting unauthorized deletion)
 * 6. Attempting to delete the comment with the second user's credentials
 * 7. Verifying that the deletion attempt fails with appropriate error
 */
export async function test_api_comment_deletion_by_different_user(
  connection: api.IConnection,
) {
  // Step 1: Create first user (comment author)
  const firstUserJoin = {
    email: `${RandomGenerator.alphabets(10)}@test.com`,
    password: "password123",
    username:
      RandomGenerator.name(1).replace(/\s+/g, "_").toLowerCase() +
      "_" +
      RandomGenerator.alphabets(5),
  } satisfies ICommunityForumCommunityUser.IJoin;

  const firstUser: ICommunityForumCommunityUser.IAuthorized =
    await api.functional.auth.user.join(connection, {
      body: firstUserJoin,
    });
  typia.assert(firstUser);

  // Step 2: Create community with first user
  const communityData = {
    name:
      RandomGenerator.name(2).replace(/\s+/g, "-").toLowerCase() +
      "-" +
      RandomGenerator.alphabets(5),
    slug:
      RandomGenerator.name(1).replace(/\s+/g, "-").toLowerCase() +
      "-" +
      RandomGenerator.alphabets(5),
    title: RandomGenerator.name(3),
    description: RandomGenerator.paragraph({
      sentences: 5,
      wordMin: 3,
      wordMax: 8,
    }),
    rules: RandomGenerator.paragraph({ sentences: 3, wordMin: 4, wordMax: 7 }),
    privacy_level: "public" as const,
    status: "active" as const,
  } satisfies ICommunityForumCommunityGroup.ICreate;

  const community: ICommunityForumCommunityGroup =
    await api.functional.communityForum.user.communities.create(connection, {
      body: communityData,
    });
  typia.assert(community);

  // Step 3: Create post in the community
  const postData = {
    community_forum_community_id: community.id,
    title: RandomGenerator.name(5),
    type: "text" as const,
    body: RandomGenerator.content({
      paragraphs: 2,
      sentenceMin: 5,
      sentenceMax: 10,
      wordMin: 3,
      wordMax: 7,
    }),
  } satisfies ICommunityForumCommunityPost.ICreate;

  const post: ICommunityForumCommunityPost =
    await api.functional.communityForum.user.posts.create(connection, {
      body: postData,
    });
  typia.assert(post);

  // Step 4: Create comment by first user
  const commentData = {
    body: RandomGenerator.paragraph({ sentences: 4, wordMin: 4, wordMax: 8 }),
    href: `https://test.com/post/${post.id}`,
    referrer: "https://test.com/community/" + community.slug,
  } satisfies ICommunityForumPostComment.ICreate;

  const comment: ICommunityForumPostComment =
    await api.functional.communityForum.user.posts.comments.create(connection, {
      postId: post.id,
      body: commentData,
    });
  typia.assert(comment);

  // Step 5: Create second user (attempting unauthorized deletion)
  const secondUserJoin = {
    email: `${RandomGenerator.alphabets(10)}@test.com`,
    password: "password123",
    username:
      RandomGenerator.name(1).replace(/\s+/g, "_").toLowerCase() +
      "_" +
      RandomGenerator.alphabets(5),
  } satisfies ICommunityForumCommunityUser.IJoin;

  const secondUser: ICommunityForumCommunityUser.IAuthorized =
    await api.functional.auth.user.join(connection, {
      body: secondUserJoin,
    });
  typia.assert(secondUser);

  // Step 6: Attempt to delete comment with second user (should fail)
  await TestValidator.httpError(
    "different user should not be able to delete another user's comment",
    403,
    async () =>
      await api.functional.communityForum.user.comments.erase(connection, {
        commentId: comment.id,
      }),
  );
}
