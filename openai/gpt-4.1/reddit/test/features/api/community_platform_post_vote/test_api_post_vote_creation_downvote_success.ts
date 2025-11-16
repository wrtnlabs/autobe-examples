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
 * Validate that a newly registered user can successfully downvote a post in a
 * community, and the resulting vote entity reflects correct associations and
 * structure.
 *
 * This test covers the full business workflow:
 *
 * 1. Register user (join) and set session context
 * 2. Create a new community as this authenticated user
 * 3. Create a new post in this community as the user
 * 4. Cast a downvote on the created post using /communityPlatform/user/postVotes
 *    (target scenario)
 *
 * The test asserts:
 *
 * - The vote entity's vote_type is 'down'
 * - The vote entity references the correct post and user
 * - All API results match their DTO contracts using typia.assert
 */
export async function test_api_post_vote_creation_downvote_success(
  connection: api.IConnection,
) {
  // 1. Register a new user
  const joinBody = {
    email: typia.random<string & tags.Format<"email">>(),
    password: typia.random<string & tags.Format<"password">>(),
  } satisfies ICommunityPlatformUser.IJoin;
  const user = await api.functional.auth.user.join(connection, {
    body: joinBody,
  });
  typia.assert(user);

  // 2. Create a community as the authenticated user
  const communityBody = {
    name: RandomGenerator.alphaNumeric(10),
    display_title: RandomGenerator.paragraph({ sentences: 3 }),
    description: RandomGenerator.content({ paragraphs: 2 }),
    visibility: "public",
    status: "active",
  } satisfies ICommunityPlatformCommunity.ICreate;
  const community =
    await api.functional.communityPlatform.user.communities.create(connection, {
      body: communityBody,
    });
  typia.assert(community);

  // 3. Create a new post in the created community
  const postBody = {
    type: "text",
    title: RandomGenerator.paragraph({ sentences: 4 }),
    body: RandomGenerator.content({ paragraphs: 1 }),
    status: "published",
    community_id: community.id,
  } satisfies ICommunityPlatformPost.ICreate;
  const post = await api.functional.communityPlatform.user.posts.create(
    connection,
    { body: postBody },
  );
  typia.assert(post);

  // 4. Add a downvote to the post
  const voteBody = {
    community_platform_post_id: post.id,
    vote_type: "down",
  } satisfies ICommunityPlatformPostVote.ICreate;
  const vote = await api.functional.communityPlatform.user.postVotes.create(
    connection,
    { body: voteBody },
  );
  typia.assert(vote);

  // Assertions: type and business linkage
  TestValidator.equals("vote_type should be down", vote.vote_type, "down");
  TestValidator.equals("vote post id matches target", vote.post?.id, post.id);
  TestValidator.equals("vote user id matches actor", vote.user?.id, user.id);
}
