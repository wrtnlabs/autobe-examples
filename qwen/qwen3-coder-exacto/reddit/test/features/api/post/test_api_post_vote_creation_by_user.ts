import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { ICommunityForumAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityForumAuthorizationToken";
import type { ICommunityForumCommunityGroup } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityForumCommunityGroup";
import type { ICommunityForumCommunityPost } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityForumCommunityPost";
import type { ICommunityForumCommunityPostVote } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityForumCommunityPostVote";
import type { ICommunityForumCommunityUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityForumCommunityUser";

export async function test_api_post_vote_creation_by_user(
  connection: api.IConnection,
) {
  // Step 1: Register a new user to create content and vote
  const userJoinData = {
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphabets(10),
    username: RandomGenerator.name(1).replace(/\s+/g, "_").toLowerCase(),
  } satisfies ICommunityForumCommunityUser.IJoin;

  const user: ICommunityForumCommunityUser.IAuthorized =
    await api.functional.auth.user.join(connection, {
      body: userJoinData,
    });
  typia.assert(user);

  // Step 2: Create a community to host the post that will be voted on
  const communityData = {
    name: RandomGenerator.name(2).replace(/\s+/g, "-").toLowerCase(),
    slug: RandomGenerator.name(2).replace(/\s+/g, "-").toLowerCase(),
    title: RandomGenerator.paragraph({ sentences: 3, wordMin: 3, wordMax: 5 }),
    description: RandomGenerator.paragraph({
      sentences: 5,
      wordMin: 5,
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
      body: communityData,
    });
  typia.assert(community);

  // Step 3: Create a post that can be voted on
  const postData = {
    community_forum_community_id: community.id,
    title: RandomGenerator.paragraph({ sentences: 4, wordMin: 3, wordMax: 6 }),
    type: "text" as const,
    body: RandomGenerator.content({
      paragraphs: 3,
      sentenceMin: 8,
      sentenceMax: 12,
      wordMin: 4,
      wordMax: 7,
    }),
  } satisfies ICommunityForumCommunityPost.ICreate;

  const post: ICommunityForumCommunityPost =
    await api.functional.communityForum.user.posts.create(connection, {
      body: postData,
    });
  typia.assert(post);

  // Step 4: Cast an upvote on the post
  const voteData = {
    is_upvote: true,
  } satisfies ICommunityForumCommunityPostVote.ICreate;

  const vote: ICommunityForumCommunityPostVote =
    await api.functional.communityForum.user.posts.votes.create(connection, {
      postId: post.id,
      body: voteData,
    });
  typia.assert(vote);

  // Validate that the vote was recorded correctly
  TestValidator.equals("vote is an upvote", vote.is_upvote, true);
  TestValidator.equals(
    "vote is associated with correct post",
    vote.community_forum_post_id,
    post.id,
  );
  TestValidator.equals(
    "vote is associated with correct user",
    vote.community_forum_user_id,
    user.id,
  );

  // Validate the vote timestamp is present
  TestValidator.predicate(
    "vote has creation timestamp",
    () => !!vote.created_at,
  );
}
