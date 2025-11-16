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
 * Test removing a member's downvote from a post and validating the vote
 * deletion.
 *
 * This scenario validates that downvote removal works identically to upvote
 * removal, ensuring symmetric vote retraction functionality. The test creates a
 * community, creates a post, authenticates as a member, casts a downvote, and
 * then removes that downvote. The operation should complete successfully with
 * the vote record being deleted, demonstrating that the vote removal operation
 * is agnostic to the vote type and works consistently for both upvotes and
 * downvotes.
 *
 * Test Flow:
 *
 * 1. Register and authenticate as moderator
 * 2. Create a community for the test
 * 3. Register and authenticate as member
 * 4. Create a post in the community
 * 5. Cast a downvote on the post (vote_type: -1)
 * 6. Remove the downvote using the DELETE endpoint
 * 7. Validate that the returned vote record matches the created downvote
 */
export async function test_api_post_vote_removal_after_downvote(
  connection: api.IConnection,
) {
  // Step 1: Register and authenticate as moderator
  const moderatorData = {
    email: typia.random<string & tags.Format<"email">>(),
    password: typia.random<string & tags.MinLength<8>>(),
    nickname: RandomGenerator.name(),
    ip: null,
    href: typia.random<string & tags.Format<"uri">>(),
    referrer: typia.random<string & tags.Format<"uri">>(),
  } satisfies IRedditCommunityCommunityModerator.ICreate;

  const moderator = await api.functional.auth.moderator.join(connection, {
    body: moderatorData,
  });
  typia.assert(moderator);

  // Step 2: Create a community
  const communityData = {
    name: RandomGenerator.alphabets(10),
    display_title: RandomGenerator.paragraph({
      sentences: 2,
      wordMin: 3,
      wordMax: 7,
    }),
    description: RandomGenerator.paragraph({
      sentences: 5,
      wordMin: 4,
      wordMax: 8,
    }),
    rules: RandomGenerator.paragraph({ sentences: 3, wordMin: 5, wordMax: 10 }),
    icon_url: typia.random<string & tags.Format<"uri">>(),
    banner_url: typia.random<string & tags.Format<"uri">>(),
  } satisfies IRedditCommunityCommunity.ICreate;

  const community =
    await api.functional.redditCommunity.moderator.communities.create(
      connection,
      {
        body: communityData,
      },
    );
  typia.assert(community);

  // Step 3: Register and authenticate as member
  const memberData = {
    username: RandomGenerator.alphabets(8),
    email: typia.random<string & tags.Format<"email">>(),
    password: typia.random<string & tags.MinLength<8>>(),
    display_name: RandomGenerator.name(),
    bio: RandomGenerator.paragraph({ sentences: 4, wordMin: 5, wordMax: 10 }),
    avatar_url: typia.random<string & tags.Format<"uri">>(),
    show_online_status: false,
    show_subscribed_communities: false,
    show_activity_feed: true,
    ip: null,
    href: typia.random<string & tags.Format<"uri">>(),
    referrer: typia.random<string & tags.Format<"uri">>(),
  } satisfies IRedditCommunityGuest.ICreate;

  const member = await api.functional.auth.member.join(connection, {
    body: memberData,
  });
  typia.assert(member);

  // Step 4: Create a text post in the community
  const postData = {
    community_id: community.id,
    title: RandomGenerator.paragraph({ sentences: 3, wordMin: 4, wordMax: 8 }),
    post_type: "text" as const,
    body: RandomGenerator.content({
      paragraphs: 2,
      sentenceMin: 8,
      sentenceMax: 15,
    }),
    url: null,
    image_url: null,
  } satisfies IRedditCommunityPost.ICreate;

  const post = await api.functional.redditCommunity.member.posts.create(
    connection,
    {
      body: postData,
    },
  );
  typia.assert(post);

  // Step 5: Cast a downvote on the post (vote_type: -1)
  const downvoteData = {
    vote_type: -1 as const,
  } satisfies IRedditCommunityPostVote.ICreate;

  const downvote =
    await api.functional.redditCommunity.member.posts.votes.create(connection, {
      postId: post.id,
      body: downvoteData,
    });
  typia.assert(downvote);
  TestValidator.equals("downvote type is -1", downvote.vote_type, -1);

  // Step 6: Remove the downvote
  const removedVote =
    await api.functional.redditCommunity.member.posts.votes.erase(connection, {
      postId: post.id,
    });
  typia.assert(removedVote);

  // Step 7: Validate the returned vote record matches the created downvote
  TestValidator.equals(
    "removed vote ID matches created downvote ID",
    removedVote.id,
    downvote.id,
  );
  TestValidator.equals("removed vote type is -1", removedVote.vote_type, -1);
  TestValidator.equals(
    "removed vote post_id matches",
    removedVote.post_id,
    post.id,
  );
  TestValidator.equals(
    "removed vote member_id matches",
    removedVote.member_id,
    member.id,
  );
}
