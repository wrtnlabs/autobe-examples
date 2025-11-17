import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { ICommunityForumAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityForumAuthorizationToken";
import type { ICommunityForumCommunityGroup } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityForumCommunityGroup";
import type { ICommunityForumCommunityPost } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityForumCommunityPost";
import type { ICommunityForumCommunityPostVote } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityForumCommunityPostVote";
import type { ICommunityForumCommunityUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityForumCommunityUser";

export async function test_api_post_vote_removal_by_user(
  connection: api.IConnection,
) {
  // Step 1: Create first user (voter)
  const user1JoinBody = {
    email: typia.random<string & tags.Format<"email">>(),
    password: "password123",
    username: RandomGenerator.name(1)
      .replace(/[^a-zA-Z0-9_]/g, "")
      .substring(0, 20),
  } satisfies ICommunityForumCommunityUser.IJoin;

  const user1: ICommunityForumCommunityUser.IAuthorized =
    await api.functional.auth.user.join(connection, {
      body: user1JoinBody,
    });
  typia.assert(user1);

  // Step 2: Create second user (post author)
  const user2JoinBody = {
    email: typia.random<string & tags.Format<"email">>(),
    password: "password123",
    username: RandomGenerator.name(1)
      .replace(/[^a-zA-Z0-9_]/g, "")
      .substring(0, 20),
  } satisfies ICommunityForumCommunityUser.IJoin;

  const user2: ICommunityForumCommunityUser.IAuthorized =
    await api.functional.auth.user.join(connection, {
      body: user2JoinBody,
    });
  typia.assert(user2);

  // Step 3: Login as user2 to create a community
  const communityBody = {
    name: RandomGenerator.name(2)
      .replace(/[^a-zA-Z0-9_ ]/g, "")
      .substring(0, 30),
    slug: RandomGenerator.name(1)
      .toLowerCase()
      .replace(/[^a-zA-Z0-9]/g, "")
      .substring(0, 20),
    title: RandomGenerator.name(3).substring(0, 50),
    description: RandomGenerator.paragraph({
      sentences: 5,
      wordMin: 3,
      wordMax: 8,
    }),
    rules: RandomGenerator.paragraph({ sentences: 3, wordMin: 4, wordMax: 6 }),
    privacy_level: RandomGenerator.pick([
      "public",
      "private",
      "restricted",
    ] as const),
    status: "active",
  } satisfies ICommunityForumCommunityGroup.ICreate;

  const community: ICommunityForumCommunityGroup =
    await api.functional.communityForum.user.communities.create(connection, {
      body: communityBody,
    });
  typia.assert(community);

  // Step 4: Login as user2 to create a post
  const postBody = {
    community_forum_community_id: community.id,
    title: RandomGenerator.name(4).substring(0, 100),
    type: "text" as const,
    body: RandomGenerator.paragraph({ sentences: 10, wordMin: 3, wordMax: 10 }),
  } satisfies ICommunityForumCommunityPost.ICreate;

  const post: ICommunityForumCommunityPost =
    await api.functional.communityForum.user.posts.create(connection, {
      body: postBody,
    });
  typia.assert(post);

  // Step 5: Login as user1 to create a vote on the post
  // First switch to user1 connection
  const user1Connection: api.IConnection = {
    ...connection,
    headers: {
      Authorization: `Bearer ${user1.token.access}`,
    },
  };

  const voteBody = {
    is_upvote: true,
  } satisfies ICommunityForumCommunityPostVote.ICreate;

  const vote: ICommunityForumCommunityPostVote =
    await api.functional.communityForum.user.posts.votes.create(
      user1Connection,
      {
        postId: post.id,
        body: voteBody,
      },
    );
  typia.assert(vote);

  // Step 6: Remove the vote
  await api.functional.communityForum.user.posts.votes.erase(user1Connection, {
    postId: post.id,
    voteId: vote.id,
  });

  // Step 7: Verify that the vote was successfully removed
  // Try to delete the same vote again - this should fail since it's already been deleted
  await TestValidator.error(
    "vote should not exist after deletion",
    async () => {
      await api.functional.communityForum.user.posts.votes.erase(
        user1Connection,
        {
          postId: post.id,
          voteId: vote.id,
        },
      );
    },
  );
}
