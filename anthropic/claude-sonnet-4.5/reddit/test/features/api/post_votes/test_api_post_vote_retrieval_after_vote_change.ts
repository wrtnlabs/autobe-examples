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
 * Test retrieving a member's vote status after changing their vote from upvote
 * to downvote.
 *
 * This scenario validates that the system correctly updates the vote record and
 * returns the most recent vote type when a member changes their voting
 * preference. The test creates a community, creates a post, authenticates as a
 * member, casts an initial upvote, then changes it to a downvote, and finally
 * retrieves the vote status to verify it reflects the updated vote_type value
 * of -1.
 *
 * Steps:
 *
 * 1. Create moderator account and authenticate
 * 2. Create a community for the test
 * 3. Create member account and authenticate
 * 4. Create a post in the community
 * 5. Cast an initial upvote on the post
 * 6. Change the vote to a downvote
 * 7. Retrieve the vote status and verify it shows downvote (-1)
 */
export async function test_api_post_vote_retrieval_after_vote_change(
  connection: api.IConnection,
) {
  // Step 1: Create moderator account and authenticate
  const moderatorEmail = typia.random<string & tags.Format<"email">>();
  const moderatorPassword = typia.random<string & tags.MinLength<8>>();
  const moderator = await api.functional.auth.moderator.join(connection, {
    body: {
      email: moderatorEmail,
      password: moderatorPassword,
      nickname: RandomGenerator.name(),
      ip: "127.0.0.1",
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IRedditCommunityCommunityModerator.ICreate,
  });
  typia.assert(moderator);

  // Step 2: Create a community for the test
  const community =
    await api.functional.redditCommunity.moderator.communities.create(
      connection,
      {
        body: {
          name: RandomGenerator.alphaNumeric(10).toLowerCase(),
          display_title: RandomGenerator.name(2),
          description: RandomGenerator.paragraph({ sentences: 3 }),
          rules: RandomGenerator.paragraph({ sentences: 2 }),
          icon_url: typia.random<string & tags.Format<"uri">>(),
          banner_url: typia.random<string & tags.Format<"uri">>(),
        } satisfies IRedditCommunityCommunity.ICreate,
      },
    );
  typia.assert(community);

  // Step 3: Create member account and authenticate
  const memberEmail = typia.random<string & tags.Format<"email">>();
  const memberPassword = typia.random<string & tags.MinLength<8>>();
  const member = await api.functional.auth.member.join(connection, {
    body: {
      username: RandomGenerator.alphaNumeric(8).toLowerCase(),
      email: memberEmail,
      password: memberPassword,
      display_name: RandomGenerator.name(),
      bio: RandomGenerator.paragraph({ sentences: 2 }),
      avatar_url: typia.random<string & tags.Format<"uri">>(),
      show_online_status: true,
      show_subscribed_communities: true,
      show_activity_feed: true,
      ip: "127.0.0.1",
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IRedditCommunityGuest.ICreate,
  });
  typia.assert(member);

  // Step 4: Create a post in the community
  const post = await api.functional.redditCommunity.member.posts.create(
    connection,
    {
      body: {
        community_id: community.id,
        title: RandomGenerator.name(3),
        post_type: "text" as const,
        body: RandomGenerator.content({ paragraphs: 2 }),
      } satisfies IRedditCommunityPost.ICreate,
    },
  );
  typia.assert(post);

  // Step 5: Cast an initial upvote on the post
  const initialVote =
    await api.functional.redditCommunity.member.posts.votes.create(connection, {
      postId: post.id,
      body: {
        vote_type: 1 as const,
      } satisfies IRedditCommunityPostVote.ICreate,
    });
  typia.assert(initialVote);
  TestValidator.equals(
    "initial vote should be upvote",
    initialVote.vote_type,
    1,
  );

  // Step 6: Change the vote to a downvote
  const updatedVote =
    await api.functional.redditCommunity.member.posts.votes.create(connection, {
      postId: post.id,
      body: {
        vote_type: -1 as const,
      } satisfies IRedditCommunityPostVote.ICreate,
    });
  typia.assert(updatedVote);
  TestValidator.equals(
    "updated vote should be downvote",
    updatedVote.vote_type,
    -1,
  );

  // Step 7: Retrieve the vote status and verify it shows downvote (-1)
  const retrievedVote =
    await api.functional.redditCommunity.member.posts.votes.at(connection, {
      postId: post.id,
    });
  typia.assert(retrievedVote);
  TestValidator.equals(
    "retrieved vote should reflect the most recent vote type",
    retrievedVote.vote_type,
    -1,
  );
  TestValidator.equals(
    "retrieved vote ID should match updated vote ID",
    retrievedVote.id,
    updatedVote.id,
  );
}
