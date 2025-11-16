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
 * Validate successful upvote creation by a freshly registered user.
 *
 * This test simulates the complete business workflow for a user upvoting a
 * post:
 *
 * 1. Register a new user to obtain authentication
 * 2. Create a new community associated with the user
 * 3. Add a new text post to the created community
 * 4. Cast an upvote ('up') for the post as the same user via the target endpoint
 *
 * It asserts:
 *
 * - All entities are created as specified and returned objects pass typia
 *   assertion
 * - The upvote response includes a properly formed vote record
 * - The vote is linked to the correct user and post (check summary references)
 * - The response fields match ICommunityPlatformPostVote and contain essential
 *   values (id, vote_type, post, user, etc.)
 * - The system enforces only a single active upvote: attempting a second upvote
 *   on the same post from the same user fails (business constraint)
 */
export async function test_api_post_vote_creation_upvote_success(
  connection: api.IConnection,
) {
  // 1. Register a new user
  const userEmail = typia.random<string & tags.Format<"email">>();
  const userPassword = typia.random<string & tags.Format<"password">>();
  const authorizedUser = await api.functional.auth.user.join(connection, {
    body: {
      email: userEmail,
      password: userPassword,
    } satisfies ICommunityPlatformUser.IJoin,
  });
  typia.assert(authorizedUser);
  // 2. Create a new community associated with that user
  const communityCreateBody = {
    name: RandomGenerator.alphabets(8),
    display_title: RandomGenerator.paragraph({ sentences: 3 }),
    description: RandomGenerator.content({
      paragraphs: 1,
      sentenceMin: 5,
      sentenceMax: 10,
    }),
    visibility: "public",
    image_url: undefined,
    status: "active",
  } satisfies ICommunityPlatformCommunity.ICreate;
  const community =
    await api.functional.communityPlatform.user.communities.create(connection, {
      body: communityCreateBody,
    });
  typia.assert(community);
  // 3. Create a new post within the created community
  const postCreateBody = {
    type: "text",
    title: RandomGenerator.paragraph({ sentences: 2 }),
    body: RandomGenerator.content({
      paragraphs: 1,
      sentenceMin: 2,
      sentenceMax: 4,
    }),
    link_url: null,
    image_url: null,
    status: "published",
    community_id: community.id,
  } satisfies ICommunityPlatformPost.ICreate;
  const post = await api.functional.communityPlatform.user.posts.create(
    connection,
    {
      body: postCreateBody,
    },
  );
  typia.assert(post);
  // 4. Cast an upvote for the post as the same user
  const voteCreateBody = {
    community_platform_post_id: post.id,
    vote_type: "up",
  } satisfies ICommunityPlatformPostVote.ICreate;
  const vote = await api.functional.communityPlatform.user.postVotes.create(
    connection,
    {
      body: voteCreateBody,
    },
  );
  typia.assert(vote);
  // Validate essential fields in vote response
  TestValidator.equals("vote type is up", vote.vote_type, "up");
  TestValidator.equals(
    "vote's post id equals created post",
    vote.post?.id,
    post.id,
  );
  TestValidator.equals(
    "vote's user id equals created user",
    vote.user?.id,
    authorizedUser.id,
  );
  // Enforce single active upvote: second upvote as same user should fail
  await TestValidator.error(
    "duplicate upvote for same post fails",
    async () => {
      await api.functional.communityPlatform.user.postVotes.create(connection, {
        body: voteCreateBody,
      });
    },
  );
}
