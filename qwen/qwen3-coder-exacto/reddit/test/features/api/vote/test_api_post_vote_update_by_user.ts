import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { ICommunityForumAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityForumAuthorizationToken";
import type { ICommunityForumCommunityGroup } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityForumCommunityGroup";
import type { ICommunityForumCommunityPost } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityForumCommunityPost";
import type { ICommunityForumCommunityPostVote } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityForumCommunityPostVote";
import type { ICommunityForumCommunityUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityForumCommunityUser";

export async function test_api_post_vote_update_by_user(
  connection: api.IConnection,
) {
  // Step 1: Create first user (voter)
  const userJoin1 = {
    email: `${RandomGenerator.alphabets(10)}@test.com`,
    password: "password123",
    username: RandomGenerator.name(1).toLowerCase().replace(/\s+/g, "_"),
  } satisfies ICommunityForumCommunityUser.IJoin;

  const user1 = await api.functional.auth.user.join(connection, {
    body: userJoin1,
  });
  typia.assert(user1);

  // Step 2: Create second user (post author)
  const userJoin2 = {
    email: `${RandomGenerator.alphabets(10)}@test.com`,
    password: "password123",
    username: RandomGenerator.name(1).toLowerCase().replace(/\s+/g, "_"),
  } satisfies ICommunityForumCommunityUser.IJoin;

  const user2 = await api.functional.auth.user.join(connection, {
    body: userJoin2,
  });
  typia.assert(user2);

  // Step 3: Create a community with first user
  const communityBody = {
    name: RandomGenerator.name(2),
    slug: RandomGenerator.alphabets(8),
    title: RandomGenerator.name(3),
    description: RandomGenerator.paragraph({ sentences: 5 }),
    rules: RandomGenerator.paragraph({ sentences: 3 }),
    privacy_level: "public",
    status: "active",
  } satisfies ICommunityForumCommunityGroup.ICreate;

  const community = await api.functional.communityForum.user.communities.create(
    connection,
    { body: communityBody },
  );
  typia.assert(community);

  // Step 4: Create a post with second user
  // First authenticate as user2
  await api.functional.auth.user.join(connection, {
    body: userJoin2,
  });

  const postBody = {
    community_forum_community_id: community.id,
    title: RandomGenerator.name(4),
    type: "text",
    body: RandomGenerator.paragraph({ sentences: 10 }),
  } satisfies ICommunityForumCommunityPost.ICreate;

  const post = await api.functional.communityForum.user.posts.create(
    connection,
    { body: postBody },
  );
  typia.assert(post);

  // Step 5: Create initial upvote with first user
  // First authenticate as user1
  await api.functional.auth.user.join(connection, {
    body: userJoin1,
  });

  const initialVoteBody = {
    is_upvote: true,
  } satisfies ICommunityForumCommunityPostVote.ICreate;

  const initialVote =
    await api.functional.communityForum.user.posts.votes.create(connection, {
      postId: post.id,
      body: initialVoteBody,
    });
  typia.assert(initialVote);
  TestValidator.equals(
    "initial vote should be upvote",
    initialVote.is_upvote,
    true,
  );

  // Step 6: Update vote to downvote
  const updatedVoteBody = {
    is_upvote: false,
  } satisfies ICommunityForumCommunityPostVote.ICreate;

  const updatedVote =
    await api.functional.communityForum.user.posts.votes.create(connection, {
      postId: post.id,
      body: updatedVoteBody,
    });
  typia.assert(updatedVote);
  TestValidator.equals(
    "updated vote should be downvote",
    updatedVote.is_upvote,
    false,
  );
  TestValidator.equals(
    "vote ID should remain the same",
    updatedVote.id,
    initialVote.id,
  );
}
