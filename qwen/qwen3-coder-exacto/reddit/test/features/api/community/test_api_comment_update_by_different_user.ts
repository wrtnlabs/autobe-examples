import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { ICommunityForumAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityForumAuthorizationToken";
import type { ICommunityForumCommunityGroup } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityForumCommunityGroup";
import type { ICommunityForumCommunityPost } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityForumCommunityPost";
import type { ICommunityForumCommunityUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityForumCommunityUser";
import type { ICommunityForumPostComment } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityForumPostComment";

export async function test_api_comment_update_by_different_user(
  connection: api.IConnection,
) {
  // Step 1: Create first user (comment author)
  const user1Join = {
    email: `${RandomGenerator.alphabets(10)}@test.com`,
    password: "password123",
    username: RandomGenerator.alphabets(8),
  } satisfies ICommunityForumCommunityUser.IJoin;

  const user1: ICommunityForumCommunityUser.IAuthorized =
    await api.functional.auth.user.join(connection, {
      body: user1Join,
    });
  typia.assert(user1);

  // Step 2: Create community with first user
  const communityCreate = {
    name: RandomGenerator.name(2).replace(/\s+/g, "-").toLowerCase(),
    slug: RandomGenerator.name(1).toLowerCase(),
    title: RandomGenerator.paragraph({ sentences: 3 }),
    description: RandomGenerator.paragraph({ sentences: 5 }),
    rules: RandomGenerator.paragraph({ sentences: 4 }),
    privacy_level: "public",
    status: "active",
  } satisfies ICommunityForumCommunityGroup.ICreate;

  const community: ICommunityForumCommunityGroup =
    await api.functional.communityForum.user.communities.create(connection, {
      body: communityCreate,
    });
  typia.assert(community);

  // Step 3: Create second user (attempting to update comment)
  const user2Join = {
    email: `${RandomGenerator.alphabets(10)}@test.com`,
    password: "password123",
    username: RandomGenerator.alphabets(8),
  } satisfies ICommunityForumCommunityUser.IJoin;

  const user2: ICommunityForumCommunityUser.IAuthorized =
    await api.functional.auth.user.join(connection, {
      body: user2Join,
    });
  typia.assert(user2);

  // Step 4: Create post with first user
  const postCreate = {
    community_forum_community_id: community.id,
    title: RandomGenerator.paragraph({ sentences: 3 }),
    type: "text",
    body: RandomGenerator.content({ paragraphs: 2 }),
  } satisfies ICommunityForumCommunityPost.ICreate;

  const post: ICommunityForumCommunityPost =
    await api.functional.communityForum.user.posts.create(connection, {
      body: postCreate,
    });
  typia.assert(post);

  // Step 5: Create comment with first user
  const commentCreate = {
    body: RandomGenerator.paragraph({ sentences: 5 }),
    href: "http://localhost:3000/test",
    referrer: "http://localhost:3000/",
  } satisfies ICommunityForumPostComment.ICreate;

  const comment: ICommunityForumPostComment =
    await api.functional.communityForum.user.posts.comments.create(connection, {
      postId: post.id,
      body: commentCreate,
    });
  typia.assert(comment);

  // Step 6: Attempt to update comment with second user (should fail)
  const commentUpdate = {
    body: RandomGenerator.paragraph({ sentences: 5 }),
  } satisfies ICommunityForumPostComment.IUpdate;

  await TestValidator.httpError(
    "updating comment by different user should fail with 403",
    403,
    async () => {
      await api.functional.communityForum.user.comments.update(connection, {
        commentId: comment.id,
        body: commentUpdate,
      });
    },
  );
}
