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
 * Validate enforcement of the unique active vote constraint for posts.
 *
 * This test verifies that a user cannot cast multiple active votes (upvote or
 * downvote) on a single post without first removing a previous vote.
 *
 * 1. Register and authenticate a new user
 * 2. Create a community as this user
 * 3. Create a post in that community
 * 4. Successfully submit an upvote on the post
 * 5. Attempt to submit a second vote (downvote) for the same post without
 *    deleting/removing the previous vote
 * 6. Validate that the second vote attempt fails (constraint error).
 */
export async function test_api_post_vote_duplicate_vote_constraint(
  connection: api.IConnection,
) {
  // 1. Register and authenticate a new user
  const userEmail = typia.random<string & tags.Format<"email">>();
  const userPassword = RandomGenerator.alphaNumeric(12);
  const authorizedUser = await api.functional.auth.user.join(connection, {
    body: {
      email: userEmail,
      password: userPassword,
    } satisfies ICommunityPlatformUser.IJoin,
  });
  typia.assert(authorizedUser);

  // 2. Create a community as this user
  const community =
    await api.functional.communityPlatform.user.communities.create(connection, {
      body: {
        name: RandomGenerator.alphabets(8) as string &
          tags.MinLength<3> &
          tags.MaxLength<30>,
        display_title: RandomGenerator.paragraph({ sentences: 2 }),
        description: RandomGenerator.paragraph({ sentences: 10 }),
        visibility: "public",
        status: "active",
      } satisfies ICommunityPlatformCommunity.ICreate,
    });
  typia.assert(community);

  // 3. Create a post in that community
  const post = await api.functional.communityPlatform.user.posts.create(
    connection,
    {
      body: {
        type: "text",
        title: RandomGenerator.paragraph({ sentences: 5 }),
        body: RandomGenerator.content({ paragraphs: 2 }),
        status: "published",
        community_id: community.id,
      } satisfies ICommunityPlatformPost.ICreate,
    },
  );
  typia.assert(post);

  // 4. Successfully submit the first vote ("up")
  const firstVote =
    await api.functional.communityPlatform.user.postVotes.create(connection, {
      body: {
        community_platform_post_id: post.id,
        vote_type: "up",
      } satisfies ICommunityPlatformPostVote.ICreate,
    });
  typia.assert(firstVote);
  TestValidator.equals("vote_type should be 'up'", firstVote.vote_type, "up");
  TestValidator.equals(
    "referenced post id matches",
    firstVote.post?.id,
    post.id,
  );

  // 5. Attempt to submit a second vote ("down") for the same post without deleting/removing the previous vote
  await TestValidator.error(
    "second vote on the same post should fail due to unique constraint",
    async () => {
      await api.functional.communityPlatform.user.postVotes.create(connection, {
        body: {
          community_platform_post_id: post.id,
          vote_type: "down",
        } satisfies ICommunityPlatformPostVote.ICreate,
      });
    },
  );
}
