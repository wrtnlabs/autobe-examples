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
 * Test idempotent vote removal behavior.
 *
 * This test validates that removing a vote that has already been removed or
 * never existed behaves idempotently without errors. It creates a community,
 * post, casts a vote, removes it once, and then attempts to remove it again.
 * The second removal operation should complete successfully without throwing
 * errors, demonstrating graceful handling of redundant deletion requests.
 *
 * Workflow:
 *
 * 1. Moderator registration and authentication
 * 2. Community creation
 * 3. Member registration and authentication
 * 4. Post creation in the community
 * 5. Vote casting on the post
 * 6. First vote removal (should succeed)
 * 7. Second vote removal on already-removed vote (should succeed idempotently)
 */
export async function test_api_post_vote_removal_idempotency(
  connection: api.IConnection,
) {
  // Step 1: Create and authenticate as moderator
  const moderatorData = {
    email: typia.random<string & tags.Format<"email">>(),
    password: typia.random<string & tags.MinLength<8>>(),
    nickname: RandomGenerator.name(),
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
    display_title: RandomGenerator.paragraph({ sentences: 2 }),
    description: RandomGenerator.paragraph({ sentences: 5 }),
    rules: RandomGenerator.paragraph({ sentences: 3 }),
  } satisfies IRedditCommunityCommunity.ICreate;

  const community =
    await api.functional.redditCommunity.moderator.communities.create(
      connection,
      {
        body: communityData,
      },
    );
  typia.assert(community);

  // Step 3: Create and authenticate as member
  const memberData = {
    username: RandomGenerator.alphabets(8),
    email: typia.random<string & tags.Format<"email">>(),
    password: typia.random<string & tags.MinLength<8>>(),
    href: typia.random<string & tags.Format<"uri">>(),
    referrer: typia.random<string & tags.Format<"uri">>(),
  } satisfies IRedditCommunityGuest.ICreate;

  const member = await api.functional.auth.member.join(connection, {
    body: memberData,
  });
  typia.assert(member);

  // Step 4: Create a post in the community
  const postData = {
    community_id: community.id,
    title: RandomGenerator.paragraph({ sentences: 2 }),
    post_type: "text" as const,
    body: RandomGenerator.content({ paragraphs: 2 }),
  } satisfies IRedditCommunityPost.ICreate;

  const post = await api.functional.redditCommunity.member.posts.create(
    connection,
    {
      body: postData,
    },
  );
  typia.assert(post);

  // Step 5: Cast a vote on the post
  const voteData = {
    vote_type: 1 as const,
  } satisfies IRedditCommunityPostVote.ICreate;

  const vote = await api.functional.redditCommunity.member.posts.votes.create(
    connection,
    {
      postId: post.id,
      body: voteData,
    },
  );
  typia.assert(vote);

  // Step 6: Remove the vote (first deletion - should succeed)
  const firstRemoval =
    await api.functional.redditCommunity.member.posts.votes.erase(connection, {
      postId: post.id,
    });
  typia.assert(firstRemoval);

  // Step 7: Remove the vote again (second deletion - should succeed idempotently)
  const secondRemoval =
    await api.functional.redditCommunity.member.posts.votes.erase(connection, {
      postId: post.id,
    });
  typia.assert(secondRemoval);
}
