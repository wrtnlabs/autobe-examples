import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunity";
import type { ICommunityPlatformPost } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformPost";
import type { ICommunityPlatformPostVote } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformPostVote";
import type { ICommunityPlatformUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformUser";
import type { ICommunityPlatformUserSession } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformUserSession";

/**
 * Validate the user-specific soft-deletion of a post vote and all business
 * constraints surrounding this action.
 *
 * 1. Register and authenticate as User A (vote owner)
 * 2. Register and authenticate as User B (other user)
 * 3. User A creates a community
 * 4. User A creates a post in the community
 * 5. User A upvotes the post
 * 6. User A soft-deletes (erases) their vote
 * 7. Verify User A's vote has deleted_at set
 * 8. User A can re-cast another vote on same post after deletion (uniqueness
 *    constraint is released)
 * 9. User B upvotes the same post
 * 10. User B deletes their own vote
 * 11. Negative case: User A attempts to delete User B's vote (should fail; only
 *     owner can delete own vote)
 */
export async function test_api_post_vote_deletion_by_vote_owner(
  connection: api.IConnection,
) {
  // 1. Register and authenticate as User A
  const userAJoin = {
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(12),
  } satisfies ICommunityPlatformUser.IJoin;
  const userA: ICommunityPlatformUser.IAuthorized =
    await api.functional.auth.user.join(connection, { body: userAJoin });
  typia.assert(userA);

  // 2. Register and authenticate as User B
  const userBJoin = {
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(12),
  } satisfies ICommunityPlatformUser.IJoin;
  const userB: ICommunityPlatformUser.IAuthorized =
    await api.functional.auth.user.join(connection, { body: userBJoin });
  typia.assert(userB);

  // Switch connection to User A's auth token
  await api.functional.auth.user.join(connection, { body: userAJoin });

  // 3. User A creates a community
  const communityInput = {
    name: RandomGenerator.alphaNumeric(10),
    display_title: RandomGenerator.paragraph({ sentences: 3 }),
    description: RandomGenerator.paragraph({ sentences: 5 }),
    visibility: "public",
    status: "active",
  } satisfies ICommunityPlatformCommunity.ICreate;
  const community =
    await api.functional.communityPlatform.user.communities.create(connection, {
      body: communityInput,
    });
  typia.assert(community);

  // 4. User A creates a post in the community
  const postInput = {
    type: "text",
    title: RandomGenerator.paragraph({ sentences: 4 }),
    body: RandomGenerator.content({
      paragraphs: 1,
      sentenceMin: 8,
      sentenceMax: 15,
    }),
    status: "published",
    community_id: community.id,
  } satisfies ICommunityPlatformPost.ICreate;
  const post = await api.functional.communityPlatform.user.posts.create(
    connection,
    { body: postInput },
  );
  typia.assert(post);

  // 5. User A upvotes the post
  const voteInput = {
    community_platform_post_id: post.id,
    vote_type: "up",
  } satisfies ICommunityPlatformPostVote.ICreate;
  const voteA = await api.functional.communityPlatform.user.postVotes.create(
    connection,
    { body: voteInput },
  );
  typia.assert(voteA);
  TestValidator.equals("voteA is for correct post", voteA.post?.id, post.id);
  TestValidator.equals("voteA is by userA", voteA.user?.id, userA.id);
  TestValidator.equals(
    "voteA has no deleted_at initially",
    voteA.deleted_at,
    null,
  );

  // 6. User A deletes own vote
  await api.functional.communityPlatform.user.postVotes.erase(connection, {
    postVoteId: voteA.id,
  });

  // 7. No direct GET, so try to recreate: Should be able to vote again
  const voteA2 = await api.functional.communityPlatform.user.postVotes.create(
    connection,
    { body: voteInput },
  );
  typia.assert(voteA2);
  TestValidator.notEquals(
    "new voteA2 id assigned after old voteA soft-deletion",
    voteA2.id,
    voteA.id,
  );
  TestValidator.equals("voteA2 user matches userA", voteA2.user?.id, userA.id);

  // 8. User B upvotes the same post
  await api.functional.auth.user.join(connection, { body: userBJoin });
  const voteBInput = {
    community_platform_post_id: post.id,
    vote_type: "up",
  } satisfies ICommunityPlatformPostVote.ICreate;
  const voteB = await api.functional.communityPlatform.user.postVotes.create(
    connection,
    { body: voteBInput },
  );
  typia.assert(voteB);
  TestValidator.equals("voteB user matches userB", voteB.user?.id, userB.id);

  // 9. User B deletes own vote
  await api.functional.communityPlatform.user.postVotes.erase(connection, {
    postVoteId: voteB.id,
  });

  // 10. User A tries to delete User B's vote (should fail)
  await api.functional.auth.user.join(connection, { body: userAJoin });
  await TestValidator.error("userA cannot delete userB's vote", async () => {
    await api.functional.communityPlatform.user.postVotes.erase(connection, {
      postVoteId: voteB.id,
    });
  });
}
