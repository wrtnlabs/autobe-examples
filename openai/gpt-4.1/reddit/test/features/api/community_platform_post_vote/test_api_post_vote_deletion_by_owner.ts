import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunity";
import type { ICommunityPlatformPost } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformPost";
import type { ICommunityPlatformPostImage } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformPostImage";
import type { ICommunityPlatformPostLinks } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformPostLinks";
import type { ICommunityPlatformPostTexts } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformPostTexts";
import type { ICommunityPlatformPostVote } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformPostVote";
import type { ICommunityPlatformUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformUser";

/**
 * Test that a user can delete their own vote on a post.
 *
 * Steps:
 *
 * 1. Register a new user.
 * 2. Create a community as this user.
 * 3. Create a post in the user-created community.
 * 4. Cast a vote (upvote or downvote) on the post.
 * 5. Delete the created vote using its unique identifier.
 * 6. Verify deletion succeeds and vote record is soft-deleted (deleted_at is set).
 */
export async function test_api_post_vote_deletion_by_owner(
  connection: api.IConnection,
) {
  // 1. Register a new user
  const userJoinBody = {
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(10),
    display_name: RandomGenerator.name(),
    href: "https://example.com/registration",
    referrer: "https://example.com/landing",
  } satisfies ICommunityPlatformUser.IJoin;
  const userAuthorized: ICommunityPlatformUser.IAuthorized =
    await api.functional.auth.user.join(connection, { body: userJoinBody });
  typia.assert(userAuthorized);

  // 2. Create a community
  const communityBody = {
    name: RandomGenerator.alphaNumeric(12).toLowerCase(),
    description: RandomGenerator.paragraph({ sentences: 5 }),
  } satisfies ICommunityPlatformCommunity.ICreate;
  const community: ICommunityPlatformCommunity =
    await api.functional.communityPlatform.user.communities.create(connection, {
      body: communityBody,
    });
  typia.assert(community);

  // 3. Create a post in the community
  const postBody = {
    community_id: community.id,
    title: RandomGenerator.paragraph({ sentences: 3 }),
    text_body: RandomGenerator.content({
      paragraphs: 1,
      sentenceMin: 5,
      sentenceMax: 10,
      wordMin: 4,
      wordMax: 10,
    }),
  } satisfies ICommunityPlatformPost.ICreate;
  const post: ICommunityPlatformPost =
    await api.functional.communityPlatform.user.posts.create(connection, {
      body: postBody,
    });
  typia.assert(post);

  // 4. Cast a vote (randomized upvote or downvote)
  const isUpvote = RandomGenerator.pick([true, false] as const);
  const voteBody = {
    community_platform_post_id: post.id,
    is_upvote: isUpvote,
  } satisfies ICommunityPlatformPostVote.ICreate;
  const vote: ICommunityPlatformPostVote =
    await api.functional.communityPlatform.user.postVotes.create(connection, {
      body: voteBody,
    });
  typia.assert(vote);
  TestValidator.equals(
    "vote record targets correct post",
    vote.community_platform_post_id,
    post.id,
  );
  TestValidator.equals(
    "vote direction matches input",
    vote.is_upvote,
    isUpvote,
  );
  TestValidator.equals(
    "vote has no deleted_at before deletion",
    vote.deleted_at,
    null,
  );

  // 5. Delete the vote with its unique identifier (soft delete)
  await api.functional.communityPlatform.user.postVotes.erase(connection, {
    postVoteId: vote.id,
  });

  // 6. Optionally, attempt to retrieve or re-create the vote to check for effect (would require API, not present here)
  // For now, we check only local expectations.
}
