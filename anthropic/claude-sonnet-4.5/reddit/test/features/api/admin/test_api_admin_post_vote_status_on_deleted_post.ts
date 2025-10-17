import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IRedditLikeAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikeAdmin";
import type { IRedditLikeCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikeCommunity";
import type { IRedditLikePost } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikePost";
import type { IRedditLikePostVote } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikePostVote";

/**
 * Test retrieving vote status endpoint accessibility on soft-deleted posts.
 *
 * Validates that the vote status retrieval endpoint remains accessible for
 * soft-deleted posts, ensuring the API doesn't break when querying vote
 * information on deleted content. This is essential for maintaining API
 * consistency and supporting audit/history features.
 *
 * Note: This test validates endpoint accessibility rather than vote persistence
 * since the voting API is not available in the current test scope.
 *
 * Workflow:
 *
 * 1. Create and authenticate as administrator
 * 2. Create a community (as member role)
 * 3. Create a post as admin
 * 4. Soft-delete the post
 * 5. Verify vote status endpoint is still accessible on deleted post
 */
export async function test_api_admin_post_vote_status_on_deleted_post(
  connection: api.IConnection,
) {
  // Step 1: Create administrator account
  const adminData = {
    username: RandomGenerator.alphaNumeric(10),
    email: typia.random<string & tags.Format<"email">>(),
    password: typia.random<string & tags.MinLength<8>>(),
  } satisfies IRedditLikeAdmin.ICreate;

  const admin: IRedditLikeAdmin.IAuthorized =
    await api.functional.auth.admin.join(connection, {
      body: adminData,
    });
  typia.assert(admin);

  // Step 2: Create community as member
  const communityData = {
    code: RandomGenerator.alphaNumeric(10),
    name: RandomGenerator.name(2),
    description: RandomGenerator.paragraph({
      sentences: 3,
      wordMin: 5,
      wordMax: 10,
    }),
  } satisfies IRedditLikeCommunity.ICreate;

  const community: IRedditLikeCommunity =
    await api.functional.redditLike.member.communities.create(connection, {
      body: communityData,
    });
  typia.assert(community);

  // Step 3: Create post as admin
  const postData = {
    community_id: community.id,
    type: "text",
    title: RandomGenerator.paragraph({ sentences: 2, wordMin: 3, wordMax: 7 }),
    body: RandomGenerator.content({
      paragraphs: 2,
      sentenceMin: 5,
      sentenceMax: 10,
    }),
  } satisfies IRedditLikePost.ICreate;

  const post: IRedditLikePost =
    await api.functional.redditLike.admin.posts.create(connection, {
      body: postData,
    });
  typia.assert(post);

  // Step 4: Soft-delete the post
  await api.functional.redditLike.admin.posts.erase(connection, {
    postId: post.id,
  });

  // Step 5: Retrieve vote status on deleted post
  const voteStatus: IRedditLikePostVote.IUserVoteStatus =
    await api.functional.redditLike.admin.posts.votes.me.getMyVote(connection, {
      postId: post.id,
    });
  typia.assert(voteStatus);

  // Verify the vote status endpoint is accessible on deleted post
  TestValidator.equals(
    "vote status should indicate no vote was cast",
    voteStatus.voted,
    false,
  );

  TestValidator.equals(
    "vote value should be undefined when no vote exists",
    voteStatus.vote_value,
    undefined,
  );
}
