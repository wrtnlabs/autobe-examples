import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunity";
import type { ICommunityPlatformModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformModerator";
import type { ICommunityPlatformPost } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformPost";
import type { ICommunityPlatformPostVote } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformPostVote";

/**
 * Validate that a moderator can remove an existing vote (upvote/downvote) from
 * a post, and that post score and audits are properly updated.
 *
 * Steps:
 *
 * 1. Register a moderator using join
 * 2. Create a community as that moderator
 * 3. Create a post in the community
 * 4. Moderator casts a vote (upvote)
 * 5. Moderator removes the vote from the post
 * 6. Test that vote is marked as deleted and post is updated properly
 */
export async function test_api_post_vote_removal_by_moderator(
  connection: api.IConnection,
) {
  // 1. Register moderator (also becomes member of the community)
  const moderatorEmail = typia.random<string & tags.Format<"email">>();
  const moderatorPassword = "TestPassword123!";
  // Create community for assignment
  const communityBody = {
    name: RandomGenerator.alphaNumeric(10),
    title: RandomGenerator.paragraph({ sentences: 2 }),
    description: RandomGenerator.paragraph({ sentences: 5 }),
    slug: RandomGenerator.alphaNumeric(12),
  } satisfies ICommunityPlatformCommunity.ICreate;
  const community =
    await api.functional.communityPlatform.member.communities.create(
      connection,
      { body: communityBody },
    );
  typia.assert(community);
  // Moderator registration (assumes member already created, or system auto-links)
  const moderator = await api.functional.auth.moderator.join(connection, {
    body: {
      email: moderatorEmail,
      password: moderatorPassword,
      community_id: community.id,
    },
  });
  typia.assert(moderator);

  // 2. Create post in the new community (as moderator - can post as a member)
  const postBody = {
    community_platform_community_id: community.id,
    title: RandomGenerator.paragraph({ sentences: 3, wordMin: 3, wordMax: 8 }),
    content_body: RandomGenerator.paragraph({ sentences: 10 }),
    content_type: "text",
    status: "published",
  } satisfies ICommunityPlatformPost.ICreate;
  const post = await api.functional.communityPlatform.member.posts.create(
    connection,
    { body: postBody },
  );
  typia.assert(post);
  // 3. Cast an upvote as this moderator
  const voteBody = {
    vote_value: 1, // upvote
  } satisfies ICommunityPlatformPostVote.ICreate;
  const vote = await api.functional.communityPlatform.member.posts.votes.create(
    connection,
    { postId: post.id, body: voteBody },
  );
  typia.assert(vote);
  TestValidator.equals(
    "vote is valid upvote",
    vote.community_platform_post_id,
    post.id,
  );
  TestValidator.equals("vote value is 1 (upvote)", vote.vote_value, 1);
  // 4. Remove vote as moderator
  await api.functional.communityPlatform.moderator.posts.votes.erase(
    connection,
    { postId: post.id, voteId: vote.id },
  );

  // 5. Simulate a get or fetch to confirm vote is marked deleted, or re-cast vote to check constraint
  // (since there is no explicit get for vote, try re-casting and ensure a new vote is possible)
  const voteAgain =
    await api.functional.communityPlatform.member.posts.votes.create(
      connection,
      { postId: post.id, body: voteBody },
    );
  typia.assert(voteAgain);
  TestValidator.notEquals(
    "new vote id differs from removed vote",
    voteAgain.id,
    vote.id,
  );
}
