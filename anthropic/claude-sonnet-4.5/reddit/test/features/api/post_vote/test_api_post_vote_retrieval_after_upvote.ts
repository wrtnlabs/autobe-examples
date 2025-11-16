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
 * Test retrieving a member's vote status after casting an upvote on a post.
 *
 * This scenario validates that the system correctly stores and returns the vote
 * type (upvote = 1) along with vote metadata including timestamps. The test
 * creates a community, creates a post within that community, authenticates as a
 * member, casts an upvote on the post, and then retrieves the vote status to
 * verify it returns the correct vote_type value of 1.
 *
 * Steps:
 *
 * 1. Authenticate as moderator
 * 2. Create a community for the test
 * 3. Authenticate as member
 * 4. Create a post in the community
 * 5. Cast an upvote (vote_type = 1) on the post
 * 6. Retrieve the vote status
 * 7. Validate that the retrieved vote has vote_type = 1
 * 8. Verify all vote metadata is present
 */
export async function test_api_post_vote_retrieval_after_upvote(
  connection: api.IConnection,
) {
  // Step 1: Authenticate as moderator to create community
  const moderatorEmail = typia.random<string & tags.Format<"email">>();
  const moderatorPassword = "moderator_password_123";
  const moderatorNickname = RandomGenerator.name();

  const moderator = await api.functional.auth.moderator.join(connection, {
    body: {
      email: moderatorEmail,
      password: moderatorPassword,
      nickname: moderatorNickname,
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IRedditCommunityCommunityModerator.ICreate,
  });
  typia.assert(moderator);

  // Step 2: Create a community
  const community =
    await api.functional.redditCommunity.moderator.communities.create(
      connection,
      {
        body: {
          name: RandomGenerator.alphabets(10),
          display_title: RandomGenerator.paragraph({ sentences: 2 }),
          description: RandomGenerator.paragraph({ sentences: 5 }),
          rules: RandomGenerator.paragraph({ sentences: 3 }),
        } satisfies IRedditCommunityCommunity.ICreate,
      },
    );
  typia.assert(community);

  // Step 3: Authenticate as member to create post and vote
  const memberEmail = typia.random<string & tags.Format<"email">>();
  const memberPassword = "member_password_123";
  const memberUsername = RandomGenerator.alphabets(8);

  const member = await api.functional.auth.member.join(connection, {
    body: {
      username: memberUsername,
      email: memberEmail,
      password: memberPassword,
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
        title: RandomGenerator.paragraph({ sentences: 2 }),
        post_type: "text",
        body: RandomGenerator.content({ paragraphs: 2 }),
      } satisfies IRedditCommunityPost.ICreate,
    },
  );
  typia.assert(post);

  // Step 5: Cast an upvote on the post
  const createdVote =
    await api.functional.redditCommunity.member.posts.votes.create(connection, {
      postId: post.id,
      body: {
        vote_type: 1,
      } satisfies IRedditCommunityPostVote.ICreate,
    });
  typia.assert(createdVote);

  // Step 6: Retrieve the vote status
  const retrievedVote =
    await api.functional.redditCommunity.member.posts.votes.at(connection, {
      postId: post.id,
    });
  typia.assert(retrievedVote);

  // Step 7: Validate that the vote_type is 1 (upvote)
  TestValidator.equals(
    "vote type should be upvote",
    retrievedVote.vote_type,
    1,
  );

  // Step 8: Verify vote metadata matches
  TestValidator.equals("vote post ID matches", retrievedVote.post_id, post.id);
  TestValidator.equals(
    "vote member ID matches",
    retrievedVote.member_id,
    member.id,
  );
}
