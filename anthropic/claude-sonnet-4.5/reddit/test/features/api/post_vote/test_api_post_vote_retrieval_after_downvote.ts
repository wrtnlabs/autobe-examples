import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IRedditCommunityCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityCommunity";
import type { IRedditCommunityCommunityModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityCommunityModerator";
import type { IRedditCommunityGuest } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityGuest";
import type { IRedditCommunityPost } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityPost";
import type { IRedditCommunityPostVote } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityPostVote";

/**
 * Test retrieving a member's vote status after casting a downvote on a post.
 *
 * This test validates the complete workflow of the voting system, specifically
 * for downvotes. It ensures that when a member casts a downvote (vote_type =
 * -1) on a post, the system correctly stores the vote and returns the accurate
 * vote status when queried.
 *
 * The test follows a realistic user journey:
 *
 * 1. Moderator creates a community (required infrastructure)
 * 2. Member joins and creates a post in the community
 * 3. Member casts a downvote on their own post
 * 4. Member retrieves their vote status
 * 5. System confirms the vote type is -1 (downvote)
 *
 * This ensures the voting system correctly differentiates between upvotes (+1)
 * and downvotes (-1), which is essential for proper UI state management and
 * content ranking algorithms.
 */
export async function test_api_post_vote_retrieval_after_downvote(
  connection: api.IConnection,
) {
  // Step 1: Create and authenticate as moderator to create community
  const moderatorData = {
    email: typia.random<string & tags.Format<"email">>(),
    password: typia.random<string & tags.MinLength<8>>(),
    nickname: RandomGenerator.name(),
    ip: null,
    href: typia.random<string & tags.Format<"uri">>(),
    referrer: typia.random<string & tags.Format<"uri">>(),
  } satisfies IRedditCommunityCommunityModerator.ICreate;

  const moderator: IRedditCommunityCommunityModerator.IAuthorized =
    await api.functional.auth.moderator.join(connection, {
      body: moderatorData,
    });
  typia.assert(moderator);

  // Step 2: Create a community as moderator
  const communityData = {
    name: RandomGenerator.alphabets(10),
    display_title: RandomGenerator.paragraph({ sentences: 2 }),
    description: RandomGenerator.paragraph({ sentences: 5 }),
    rules: RandomGenerator.paragraph({ sentences: 3 }),
    icon_url: typia.random<string & tags.Format<"uri">>(),
    banner_url: typia.random<string & tags.Format<"uri">>(),
  } satisfies IRedditCommunityCommunity.ICreate;

  const community: IRedditCommunityCommunity =
    await api.functional.redditCommunity.moderator.communities.create(
      connection,
      {
        body: communityData,
      },
    );
  typia.assert(community);

  // Step 3: Create and authenticate as member to create post and vote
  const memberData = {
    username: RandomGenerator.alphaNumeric(12),
    email: typia.random<string & tags.Format<"email">>(),
    password: typia.random<string & tags.MinLength<8>>(),
    display_name: RandomGenerator.name(),
    bio: RandomGenerator.paragraph({ sentences: 4 }),
    avatar_url: typia.random<string & tags.Format<"uri">>(),
    show_online_status: false,
    show_subscribed_communities: false,
    show_activity_feed: true,
    ip: null,
    href: typia.random<string & tags.Format<"uri">>(),
    referrer: typia.random<string & tags.Format<"uri">>(),
  } satisfies IRedditCommunityGuest.ICreate;

  const member: IRedditCommunityGuest.IAuthorized =
    await api.functional.auth.member.join(connection, {
      body: memberData,
    });
  typia.assert(member);

  // Step 4: Create a post in the community as member
  const postData = {
    community_id: community.id,
    title: RandomGenerator.paragraph({ sentences: 1, wordMin: 5, wordMax: 10 }),
    post_type: "text" as const,
    body: RandomGenerator.content({ paragraphs: 3 }),
    url: null,
    image_url: null,
  } satisfies IRedditCommunityPost.ICreate;

  const post: IRedditCommunityPost =
    await api.functional.redditCommunity.member.posts.create(connection, {
      body: postData,
    });
  typia.assert(post);

  // Step 5: Cast a downvote on the post
  const voteData = {
    vote_type: -1 as const,
  } satisfies IRedditCommunityPostVote.ICreate;

  const createdVote: IRedditCommunityPostVote =
    await api.functional.redditCommunity.member.posts.votes.create(connection, {
      postId: post.id,
      body: voteData,
    });
  typia.assert(createdVote);

  // Step 6: Retrieve the vote status for the post
  const retrievedVote: IRedditCommunityPostVote =
    await api.functional.redditCommunity.member.posts.votes.at(connection, {
      postId: post.id,
    });
  typia.assert(retrievedVote);

  // Step 7: Validate the retrieved vote matches expectations
  TestValidator.equals(
    "retrieved vote ID matches created vote",
    retrievedVote.id,
    createdVote.id,
  );

  TestValidator.equals(
    "vote type is downvote (-1)",
    retrievedVote.vote_type,
    -1,
  );

  TestValidator.equals(
    "vote is associated with correct post",
    retrievedVote.post_id,
    post.id,
  );

  TestValidator.equals(
    "vote is associated with correct member",
    retrievedVote.member_id,
    member.id,
  );

  TestValidator.equals(
    "created_at timestamp matches",
    retrievedVote.created_at,
    createdVote.created_at,
  );

  TestValidator.equals(
    "updated_at timestamp matches",
    retrievedVote.updated_at,
    createdVote.updated_at,
  );
}
