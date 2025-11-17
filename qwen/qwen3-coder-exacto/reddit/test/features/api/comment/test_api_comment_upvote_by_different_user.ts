import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { ICommunityForumAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityForumAuthorizationToken";
import type { ICommunityForumCommunityGroup } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityForumCommunityGroup";
import type { ICommunityForumCommunityPost } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityForumCommunityPost";
import type { ICommunityForumCommunityUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityForumCommunityUser";
import type { ICommunityForumPostComment } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityForumPostComment";
import type { ICommunityForumPostCommentVote } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityForumPostCommentVote";

export async function test_api_comment_upvote_by_different_user(
  connection: api.IConnection,
) {
  // Step 1: Create first user (comment author)
  const user1Join = {
    email: `${RandomGenerator.alphabets(8)}@test.com`,
    password: "password123",
    username:
      RandomGenerator.name(1).replace(/\s+/g, "_").toLowerCase() +
      "_" +
      RandomGenerator.alphabets(4),
  } satisfies ICommunityForumCommunityUser.IJoin;

  const user1: ICommunityForumCommunityUser.IAuthorized =
    await api.functional.auth.user.join(connection, {
      body: user1Join,
    });
  typia.assert(user1);

  // Step 2: Create a community with the first user
  const communityCreate = {
    name:
      RandomGenerator.name(2).replace(/\s+/g, "-").toLowerCase() +
      "-" +
      RandomGenerator.alphabets(4),
    slug:
      RandomGenerator.name(1).replace(/\s+/g, "-").toLowerCase() +
      "-" +
      RandomGenerator.alphabets(4),
    title: RandomGenerator.paragraph({ sentences: 3 }),
    description: RandomGenerator.content({ paragraphs: 2 }),
    rules: RandomGenerator.content({ paragraphs: 1 }),
    privacy_level: "public",
    status: "active",
  } satisfies ICommunityForumCommunityGroup.ICreate;

  const community: ICommunityForumCommunityGroup =
    await api.functional.communityForum.user.communities.create(connection, {
      body: communityCreate,
    });
  typia.assert(community);

  // Step 3: Create a post in that community
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

  // Step 4: Create a comment on that post
  const commentCreate = {
    body: RandomGenerator.paragraph({ sentences: 5, wordMin: 3, wordMax: 10 }),
    href: "http://localhost/test",
    referrer: "http://localhost/",
  } satisfies ICommunityForumPostComment.ICreate;

  const comment: ICommunityForumPostComment =
    await api.functional.communityForum.user.posts.comments.create(connection, {
      postId: post.id,
      body: commentCreate,
    });
  typia.assert(comment);

  // Step 5: Create second user (voter)
  const user2Join = {
    email: `${RandomGenerator.alphabets(8)}@test.com`,
    password: "password123",
    username:
      RandomGenerator.name(1).replace(/\s+/g, "_").toLowerCase() +
      "_" +
      RandomGenerator.alphabets(4),
  } satisfies ICommunityForumCommunityUser.IJoin;

  const user2: ICommunityForumCommunityUser.IAuthorized =
    await api.functional.auth.user.join(connection, {
      body: user2Join,
    });
  typia.assert(user2);

  // Step 6: Create third user (another voter)
  const user3Join = {
    email: `${RandomGenerator.alphabets(8)}@test.com`,
    password: "password123",
    username:
      RandomGenerator.name(1).replace(/\s+/g, "_").toLowerCase() +
      "_" +
      RandomGenerator.alphabets(4),
  } satisfies ICommunityForumCommunityUser.IJoin;

  const user3: ICommunityForumCommunityUser.IAuthorized =
    await api.functional.auth.user.join(connection, {
      body: user3Join,
    });
  typia.assert(user3);

  // Step 7: Second user upvotes the comment
  // Switch to user2 connection
  const user2Connection: api.IConnection = {
    ...connection,
    headers: {
      ...connection.headers,
      Authorization: `Bearer ${user2.token.access}`,
    },
  };

  const vote1Create = {
    is_upvote: true,
  } satisfies ICommunityForumPostCommentVote.ICreate;

  const vote1: ICommunityForumPostCommentVote =
    await api.functional.communityForum.user.comments.votes.create(
      user2Connection,
      {
        commentId: comment.id,
        body: vote1Create,
      },
    );
  typia.assert(vote1);
  TestValidator.equals("first vote is upvote", vote1.is_upvote, true);
  TestValidator.equals("first vote user matches", vote1.user.id, user2.id);

  // Step 8: Third user upvotes the comment
  // Switch to user3 connection
  const user3Connection: api.IConnection = {
    ...connection,
    headers: {
      ...connection.headers,
      Authorization: `Bearer ${user3.token.access}`,
    },
  };

  const vote2Create = {
    is_upvote: true,
  } satisfies ICommunityForumPostCommentVote.ICreate;

  const vote2: ICommunityForumPostCommentVote =
    await api.functional.communityForum.user.comments.votes.create(
      user3Connection,
      {
        commentId: comment.id,
        body: vote2Create,
      },
    );
  typia.assert(vote2);
  TestValidator.equals("second vote is upvote", vote2.is_upvote, true);
  TestValidator.equals("second vote user matches", vote2.user.id, user3.id);

  // Verify that we have two distinct votes
  TestValidator.notEquals(
    "votes are from different users",
    vote1.user.id,
    vote2.user.id,
  );
}
