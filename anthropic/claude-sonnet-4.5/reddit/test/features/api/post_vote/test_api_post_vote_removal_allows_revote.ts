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
 * Test vote lifecycle: create vote, remove vote, and cast new vote.
 *
 * This test validates that after removing a vote, a member can cast a new vote
 * on the same post. This ensures the voting system supports flexible opinion
 * changes through the remove-then-revote pattern.
 *
 * Steps:
 *
 * 1. Moderator joins and creates a community
 * 2. Member joins and creates a post in the community
 * 3. Member casts an upvote on the post
 * 4. Member removes the upvote
 * 5. Member casts a downvote on the same post
 * 6. Validate the final vote operation succeeds
 */
export async function test_api_post_vote_removal_allows_revote(
  connection: api.IConnection,
) {
  // Step 1: Moderator joins to create community
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
          name: RandomGenerator.alphabets(10),
          display_title: RandomGenerator.name(3),
          description: RandomGenerator.paragraph({ sentences: 5 }),
          rules: RandomGenerator.paragraph({ sentences: 3 }),
          icon_url: typia.random<string & tags.Format<"uri">>(),
          banner_url: typia.random<string & tags.Format<"uri">>(),
        } satisfies IRedditCommunityCommunity.ICreate,
      },
    );
  typia.assert(community);

  // Step 3: Member joins
  const member = await api.functional.auth.member.join(connection, {
    body: {
      username: RandomGenerator.alphaNumeric(10),
      email: typia.random<string & tags.Format<"email">>(),
      password: typia.random<string & tags.MinLength<8>>(),
      display_name: RandomGenerator.name(),
      bio: RandomGenerator.paragraph({ sentences: 5 }),
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

  // Step 4: Member creates a post
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

  // Step 5: Member casts initial upvote
  const initialVote =
    await api.functional.redditCommunity.member.posts.votes.create(connection, {
      postId: post.id,
      body: {
        vote_type: 1,
      } satisfies IRedditCommunityPostVote.ICreate,
    });
  typia.assert(initialVote);
  TestValidator.equals("initial vote is upvote", initialVote.vote_type, 1);

  // Step 6: Member removes the vote
  const removedVote =
    await api.functional.redditCommunity.member.posts.votes.erase(connection, {
      postId: post.id,
    });
  typia.assert(removedVote);

  // Step 7: Member casts a downvote on the same post
  const newVote =
    await api.functional.redditCommunity.member.posts.votes.create(connection, {
      postId: post.id,
      body: {
        vote_type: -1,
      } satisfies IRedditCommunityPostVote.ICreate,
    });
  typia.assert(newVote);

  // Step 8: Validate the new vote is a downvote
  TestValidator.equals("new vote is downvote", newVote.vote_type, -1);
  TestValidator.equals("vote is on same post", newVote.post_id, post.id);
  TestValidator.equals("vote is by same member", newVote.member_id, member.id);
}
