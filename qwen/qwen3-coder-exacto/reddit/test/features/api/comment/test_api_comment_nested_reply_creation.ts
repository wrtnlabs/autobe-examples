import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { ICommunityForumAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityForumAuthorizationToken";
import type { ICommunityForumCommunityGroup } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityForumCommunityGroup";
import type { ICommunityForumCommunityPost } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityForumCommunityPost";
import type { ICommunityForumCommunityUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityForumCommunityUser";
import type { ICommunityForumPostComment } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityForumPostComment";

export async function test_api_comment_nested_reply_creation(
  connection: api.IConnection,
) {
  // Step 1: Create first user
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

  // Step 2: Create second user
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

  // Step 3: Create community using first user
  const communityCreate = {
    name: RandomGenerator.name(2),
    slug: RandomGenerator.alphabets(10),
    title: RandomGenerator.name(3),
    description: RandomGenerator.paragraph({ sentences: 5 }),
    rules: RandomGenerator.paragraph({ sentences: 3 }),
    privacy_level: "public" as const,
    status: "active" as const,
  } satisfies ICommunityForumCommunityGroup.ICreate;

  const community: ICommunityForumCommunityGroup =
    await api.functional.communityForum.user.communities.create(connection, {
      body: communityCreate,
    });
  typia.assert(community);

  // Step 4: Create post using first user
  const postCreate = {
    community_forum_community_id: community.id,
    title: RandomGenerator.name(4),
    type: "text" as const,
    body: RandomGenerator.paragraph({ sentences: 10 }),
  } satisfies ICommunityForumCommunityPost.ICreate;

  const post: ICommunityForumCommunityPost =
    await api.functional.communityForum.user.posts.create(connection, {
      body: postCreate,
    });
  typia.assert(post);

  // Step 5: Create initial parent comment using second user
  const commentCreate = {
    body: RandomGenerator.paragraph({ sentences: 5 }),
    href: "http://localhost:3000/test",
    referrer: "http://localhost:3000/",
  } satisfies ICommunityForumPostComment.ICreate;

  const parentComment: ICommunityForumPostComment =
    await api.functional.communityForum.user.posts.comments.create(connection, {
      postId: post.id,
      body: commentCreate,
    });
  typia.assert(parentComment);

  // Step 6: Create first-level reply to parent comment using first user
  const reply1Create = {
    body: RandomGenerator.paragraph({ sentences: 4 }),
    href: "http://localhost:3000/test",
    referrer: "http://localhost:3000/",
  } satisfies ICommunityForumPostComment.ICreate;

  const reply1: ICommunityForumPostComment =
    await api.functional.communityForum.user.comments.replies.create(
      connection,
      {
        commentId: parentComment.id,
        body: reply1Create,
      },
    );
  typia.assert(reply1);

  // Step 7: Create nested replies up to depth limit (10 levels)
  let currentCommentId = reply1.id;
  const replies: ICommunityForumPostComment[] = [reply1];

  for (let i = 2; i <= 10; i++) {
    const replyCreate = {
      body: RandomGenerator.paragraph({ sentences: 4 }),
      href: "http://localhost:3000/test",
      referrer: "http://localhost:3000/",
    } satisfies ICommunityForumPostComment.ICreate;

    const reply: ICommunityForumPostComment =
      await api.functional.communityForum.user.comments.replies.create(
        connection,
        {
          commentId: currentCommentId,
          body: replyCreate,
        },
      );
    typia.assert(reply);

    replies.push(reply);
    currentCommentId = reply.id;
  }

  // Step 8: Validate the reply chain structure
  TestValidator.equals("reply chain length should be 10", replies.length, 10);

  // Step 9: Test that reply depth limit is respected (try to create 11th level)
  const replyLimitCreate = {
    body: RandomGenerator.paragraph({ sentences: 4 }),
    href: "http://localhost:3000/test",
    referrer: "http://localhost:3000/",
  } satisfies ICommunityForumPostComment.ICreate;

  await TestValidator.error(
    "should fail to create reply beyond depth limit",
    async () => {
      await api.functional.communityForum.user.comments.replies.create(
        connection,
        {
          commentId: currentCommentId,
          body: replyLimitCreate,
        },
      );
    },
  );
}
