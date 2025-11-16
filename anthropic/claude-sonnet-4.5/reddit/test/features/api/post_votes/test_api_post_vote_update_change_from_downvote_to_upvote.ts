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
 * Test the reverse vote update scenario where a member changes their downvote
 * to an upvote.
 *
 * This test validates the scenario where a member changes their vote on a post
 * from a downvote to an upvote. The test ensures that the voting system
 * correctly handles vote reversals and maintains data integrity.
 *
 * The test follows this workflow:
 *
 * 1. Create a moderator account for community setup
 * 2. Moderator creates a community to host the post
 * 3. Create two member accounts: one as the post author, another as the voter
 * 4. Author member creates a post in the community
 * 5. Voter member initially casts a downvote (-1) on the post
 * 6. Voter member then changes their vote to an upvote (+1) on the same post
 * 7. Verify that the vote record was updated (not duplicated)
 * 8. Verify that the vote_type changed from -1 to 1
 * 9. Verify that the updated_at timestamp reflects the change
 */
export async function test_api_post_vote_update_change_from_downvote_to_upvote(
  connection: api.IConnection,
) {
  // Step 1: Create moderator account
  const moderator = await api.functional.auth.moderator.join(connection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: typia.random<string & tags.MinLength<8>>(),
      nickname: RandomGenerator.name(),
      ip: "127.0.0.1",
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IRedditCommunityCommunityModerator.ICreate,
  });
  typia.assert(moderator);

  // Step 2: Moderator creates a community
  const community =
    await api.functional.redditCommunity.moderator.communities.create(
      connection,
      {
        body: {
          name: RandomGenerator.alphabets(10).toLowerCase(),
          display_title: RandomGenerator.paragraph({ sentences: 3 }),
          description: RandomGenerator.paragraph({ sentences: 5 }),
          rules: RandomGenerator.paragraph({ sentences: 3 }),
          icon_url: typia.random<string & tags.Format<"uri">>(),
          banner_url: typia.random<string & tags.Format<"uri">>(),
        } satisfies IRedditCommunityCommunity.ICreate,
      },
    );
  typia.assert(community);

  // Step 3: Create post author member account
  const authorMember = await api.functional.auth.member.join(connection, {
    body: {
      username: RandomGenerator.alphaNumeric(10),
      email: typia.random<string & tags.Format<"email">>(),
      password: typia.random<string & tags.MinLength<8>>(),
      display_name: RandomGenerator.name(),
      bio: RandomGenerator.paragraph({ sentences: 2 }),
      avatar_url: typia.random<string & tags.Format<"uri">>(),
      show_online_status: true,
      show_subscribed_communities: false,
      show_activity_feed: true,
      ip: "127.0.0.1",
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IRedditCommunityGuest.ICreate,
  });
  typia.assert(authorMember);

  // Step 4: Author creates a post
  const post = await api.functional.redditCommunity.member.posts.create(
    connection,
    {
      body: {
        community_id: community.id,
        title: RandomGenerator.paragraph({ sentences: 2 }),
        post_type: "text",
        body: RandomGenerator.content({ paragraphs: 3 }),
        url: null,
        image_url: null,
      } satisfies IRedditCommunityPost.ICreate,
    },
  );
  typia.assert(post);

  // Step 5: Create voter member account
  const voterEmail = typia.random<string & tags.Format<"email">>();
  const voterPassword = typia.random<string & tags.MinLength<8>>();
  const voterMember = await api.functional.auth.member.join(connection, {
    body: {
      username: RandomGenerator.alphaNumeric(10),
      email: voterEmail,
      password: voterPassword,
      display_name: RandomGenerator.name(),
      bio: RandomGenerator.paragraph({ sentences: 2 }),
      avatar_url: typia.random<string & tags.Format<"uri">>(),
      show_online_status: false,
      show_subscribed_communities: true,
      show_activity_feed: true,
      ip: "127.0.0.1",
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IRedditCommunityGuest.ICreate,
  });
  typia.assert(voterMember);

  // Step 6: Voter casts initial downvote (-1)
  const downvote =
    await api.functional.redditCommunity.member.posts.votes.create(connection, {
      postId: post.id,
      body: {
        vote_type: -1,
      } satisfies IRedditCommunityPostVote.ICreate,
    });
  typia.assert(downvote);
  TestValidator.equals("initial vote is downvote", downvote.vote_type, -1);
  TestValidator.equals("vote is for correct post", downvote.post_id, post.id);
  TestValidator.equals(
    "vote is by correct member",
    downvote.member_id,
    voterMember.id,
  );

  // Store initial vote ID and timestamps for comparison
  const initialVoteId = downvote.id;
  const initialCreatedAt = downvote.created_at;
  const initialUpdatedAt = downvote.updated_at;

  // Step 7: Voter changes vote to upvote (+1)
  const upvote = await api.functional.redditCommunity.member.posts.votes.create(
    connection,
    {
      postId: post.id,
      body: {
        vote_type: 1,
      } satisfies IRedditCommunityPostVote.ICreate,
    },
  );
  typia.assert(upvote);

  // Step 8: Verify vote was updated, not duplicated
  TestValidator.equals(
    "vote ID remains same (updated not duplicated)",
    upvote.id,
    initialVoteId,
  );
  TestValidator.equals("vote type changed to upvote", upvote.vote_type, 1);
  TestValidator.equals("vote still for same post", upvote.post_id, post.id);
  TestValidator.equals(
    "vote still by same member",
    upvote.member_id,
    voterMember.id,
  );

  // Step 9: Verify timestamps
  TestValidator.equals(
    "created_at unchanged",
    upvote.created_at,
    initialCreatedAt,
  );
  TestValidator.predicate(
    "updated_at reflects the change",
    new Date(upvote.updated_at).getTime() >=
      new Date(initialUpdatedAt).getTime(),
  );
}
