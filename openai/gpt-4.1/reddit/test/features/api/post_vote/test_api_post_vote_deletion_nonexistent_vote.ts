import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunity";
import type { ICommunityPlatformPost } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformPost";
import type { ICommunityPlatformUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformUser";
import type { ICommunityPlatformUserSession } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformUserSession";

/**
 * Validates error handling when attempting to delete a non-existent post vote.
 *
 * This test ensures that the system returns the correct error when a user tries
 * to delete a post vote using a random or already-removed voteId. It simulates
 * a realistic flow: registering a user, creating a community and a post, then
 * attempts to delete a vote that was never created.
 *
 * Steps:
 *
 * 1. Register a user.
 * 2. Create a community.
 * 3. Create a post in the community.
 * 4. Attempt to delete a non-existent post vote by using a random UUID.
 * 5. Validate that deletion fails as expected (error is thrown).
 */
export async function test_api_post_vote_deletion_nonexistent_vote(
  connection: api.IConnection,
) {
  // 1. Register user and authenticate
  const joinInput = {
    email: typia.random<string & tags.Format<"email">>(),
    password: "password_123_Aa",
  } satisfies ICommunityPlatformUser.IJoin;
  const user: ICommunityPlatformUser.IAuthorized =
    await api.functional.auth.user.join(connection, { body: joinInput });
  typia.assert(user);

  // 2. Create community
  const communityInput = {
    name: RandomGenerator.alphaNumeric(12),
    display_title: RandomGenerator.paragraph({ sentences: 3 }),
    description: RandomGenerator.paragraph({ sentences: 10 }),
    visibility: "public",
    status: "active",
  } satisfies ICommunityPlatformCommunity.ICreate;
  const community: ICommunityPlatformCommunity =
    await api.functional.communityPlatform.user.communities.create(connection, {
      body: communityInput,
    });
  typia.assert(community);

  // 3. Create post
  const postInput = {
    type: "text",
    title: RandomGenerator.paragraph({ sentences: 5 }),
    body: RandomGenerator.paragraph({ sentences: 10 }),
    status: "published",
    community_id: community.id,
  } satisfies ICommunityPlatformPost.ICreate;
  const post: ICommunityPlatformPost =
    await api.functional.communityPlatform.user.posts.create(connection, {
      body: postInput,
    });
  typia.assert(post);

  // 4. Attempt to delete a non-existent post vote (random UUID)
  await TestValidator.error(
    "deleting a non-existent post vote should throw error",
    async () => {
      await api.functional.communityPlatform.user.postVotes.erase(connection, {
        postVoteId: typia.random<string & tags.Format<"uuid">>(),
      });
    },
  );
}
