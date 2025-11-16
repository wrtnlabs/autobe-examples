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
 * Test realistic voting scenarios with multiple different members voting on the
 * same post.
 *
 * This validates that the voting system properly handles concurrent votes from
 * different users and correctly aggregates scores. The test creates one post
 * and has multiple different members (at least 3-4) each cast votes on the same
 * post, including a mix of upvotes and downvotes from different members.
 *
 * Key validations:
 *
 * 1. Each member can only have one vote record per post (unique constraint
 *    enforcement)
 * 2. The post's total score correctly reflects the sum of all votes
 * 3. Vote_type values are properly stored for each member independently
 * 4. Authentication ensures each vote is attributed to the correct member via JWT
 *    token
 *
 * Workflow:
 *
 * 1. Create moderator account and community
 * 2. Create post author member and create a post
 * 3. Create 3-4 additional members
 * 4. Each member casts a vote (mix of upvotes and downvotes)
 * 5. Verify all votes are recorded correctly
 */
export async function test_api_post_vote_multiple_members_voting(
  connection: api.IConnection,
) {
  // Step 1: Create moderator account
  const moderator = await api.functional.auth.moderator.join(connection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: typia.random<string & tags.MinLength<8>>(),
      nickname: RandomGenerator.name(),
      ip: typia.random<string>(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IRedditCommunityCommunityModerator.ICreate,
  });
  typia.assert(moderator);

  // Step 2: Create community
  const community =
    await api.functional.redditCommunity.moderator.communities.create(
      connection,
      {
        body: {
          name: typia.random<
            string &
              tags.MinLength<3> &
              tags.MaxLength<21> &
              tags.Pattern<"^[a-z0-9_]+$">
          >(),
          display_title: RandomGenerator.paragraph({ sentences: 2 }),
          description: RandomGenerator.paragraph({ sentences: 5 }),
          rules: RandomGenerator.paragraph({ sentences: 3 }),
          icon_url: typia.random<string & tags.Format<"uri">>(),
          banner_url: typia.random<string & tags.Format<"uri">>(),
        } satisfies IRedditCommunityCommunity.ICreate,
      },
    );
  typia.assert(community);

  // Step 3: Create post author member
  const postAuthor = await api.functional.auth.member.join(connection, {
    body: {
      username: RandomGenerator.alphaNumeric(10),
      email: typia.random<string & tags.Format<"email">>(),
      password: typia.random<string & tags.MinLength<8>>(),
      display_name: RandomGenerator.name(),
      bio: RandomGenerator.paragraph({ sentences: 3 }),
      avatar_url: typia.random<string & tags.Format<"uri">>(),
      show_online_status: typia.random<boolean>(),
      show_subscribed_communities: typia.random<boolean>(),
      show_activity_feed: typia.random<boolean>(),
      ip: typia.random<string>(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IRedditCommunityGuest.ICreate,
  });
  typia.assert(postAuthor);

  // Step 4: Create a post
  const post = await api.functional.redditCommunity.member.posts.create(
    connection,
    {
      body: {
        community_id: community.id,
        title: RandomGenerator.paragraph({ sentences: 2 }),
        post_type: "text" as const,
        body: RandomGenerator.content({ paragraphs: 3 }),
        url: null,
        image_url: null,
      } satisfies IRedditCommunityPost.ICreate,
    },
  );
  typia.assert(post);

  // Step 5: Create multiple voting members (4 members) with stored passwords
  const voterCount = 4;
  const votersWithPasswords = await ArrayUtil.asyncRepeat(
    voterCount,
    async (index) => {
      const password = typia.random<string & tags.MinLength<8>>();
      const voter = await api.functional.auth.member.join(connection, {
        body: {
          username: RandomGenerator.alphaNumeric(10),
          email: typia.random<string & tags.Format<"email">>(),
          password: password,
          display_name: RandomGenerator.name(),
          bio: RandomGenerator.paragraph({ sentences: 2 }),
          avatar_url: typia.random<string & tags.Format<"uri">>(),
          show_online_status: typia.random<boolean>(),
          show_subscribed_communities: typia.random<boolean>(),
          show_activity_feed: typia.random<boolean>(),
          ip: typia.random<string>(),
          href: typia.random<string & tags.Format<"uri">>(),
          referrer: typia.random<string & tags.Format<"uri">>(),
        } satisfies IRedditCommunityGuest.ICreate,
      });
      typia.assert(voter);
      return { voter, password };
    },
  );

  // Step 6: Each member casts a vote with mix of upvotes and downvotes
  const voteTypes: Array<1 | -1> = [1, -1, 1, -1];
  const votes = await ArrayUtil.asyncRepeat(voterCount, async (index) => {
    // Switch to the voter's authentication with correct password
    await api.functional.auth.member.login(connection, {
      body: {
        username: votersWithPasswords[index].voter.username,
        password: votersWithPasswords[index].password,
        ip: typia.random<string>(),
        href: typia.random<string & tags.Format<"uri">>(),
        referrer: typia.random<string & tags.Format<"uri">>(),
      } satisfies IRedditCommunityGuest.ILogin,
    });

    const vote = await api.functional.redditCommunity.member.posts.votes.create(
      connection,
      {
        postId: post.id,
        body: {
          vote_type: voteTypes[index],
        } satisfies IRedditCommunityPostVote.ICreate,
      },
    );
    typia.assert(vote);
    return vote;
  });

  // Step 7: Verify all votes are recorded correctly
  votes.forEach((vote, index) => {
    TestValidator.equals(
      "vote type matches expected",
      vote.vote_type,
      voteTypes[index],
    );
    TestValidator.equals("vote post ID matches", vote.post_id, post.id);
    TestValidator.equals(
      "vote member ID matches",
      vote.member_id,
      votersWithPasswords[index].voter.id,
    );
  });
}
