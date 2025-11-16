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
 * Validate successful update of a post vote from upvote to downvote.
 *
 * This test ensures that a registered user's post vote can be changed from 'up'
 * to 'down' by updating the vote. It verifies correct business workflow and
 * correct data reflection after the update, including proper authorization and
 * audit fields update as required.
 *
 * Step-by-step process:
 *
 * 1. Register a new user
 * 2. Create a community
 * 3. Create a post in the community
 * 4. Cast an upvote for the post as the user
 * 5. Update the vote from 'up' to 'down' using the update endpoint
 * 6. Verify the update is reflected: vote_type is 'down', audit fields are
 *    updated, user is correct
 */
export async function test_api_post_vote_update_to_downvote(
  connection: api.IConnection,
) {
  // 1. Register a new user
  const email: string = typia.random<string & tags.Format<"email">>();
  const password: string = RandomGenerator.alphaNumeric(12);
  const user: ICommunityPlatformUser.IAuthorized =
    await api.functional.auth.user.join(connection, {
      body: {
        email,
        password: password as string & tags.Format<"password">,
      } satisfies ICommunityPlatformUser.IJoin,
    });
  typia.assert(user);

  // 2. Create a community
  const communityName: string = RandomGenerator.alphaNumeric(10).toLowerCase();
  const community: ICommunityPlatformCommunity =
    await api.functional.communityPlatform.user.communities.create(connection, {
      body: {
        name: communityName as string & tags.MinLength<3> & tags.MaxLength<30>,
        display_title: RandomGenerator.paragraph({ sentences: 2 }) as string &
          tags.MinLength<1> &
          tags.MaxLength<100>,
        description: RandomGenerator.content({
          paragraphs: 2,
          sentenceMin: 10,
          sentenceMax: 20,
          wordMin: 4,
          wordMax: 12,
        }) as string & tags.MinLength<1> & tags.MaxLength<2000>,
        visibility: "public",
        status: "active",
      } satisfies ICommunityPlatformCommunity.ICreate,
    });
  typia.assert(community);

  // 3. Create a post in the community
  const post: ICommunityPlatformPost =
    await api.functional.communityPlatform.user.posts.create(connection, {
      body: {
        type: "text",
        title: RandomGenerator.paragraph({ sentences: 4 }),
        body: RandomGenerator.content({
          paragraphs: 1,
          sentenceMin: 8,
          sentenceMax: 16,
          wordMin: 3,
          wordMax: 10,
        }),
        status: "published",
        community_id: community.id,
      } satisfies ICommunityPlatformPost.ICreate,
    });
  typia.assert(post);

  // 4. Cast an upvote for the post
  const upvote: ICommunityPlatformPostVote =
    await api.functional.communityPlatform.user.postVotes.create(connection, {
      body: {
        community_platform_post_id: post.id,
        vote_type: "up",
      } satisfies ICommunityPlatformPostVote.ICreate,
    });
  typia.assert(upvote);
  TestValidator.equals("initial vote_type is up", upvote.vote_type, "up");
  TestValidator.predicate(
    "vote is active (not deleted)",
    upvote.deleted_at === null || upvote.deleted_at === undefined,
  );
  TestValidator.equals("vote user is correct", upvote.user?.id, user.id);
  TestValidator.equals("vote post is correct", upvote.post?.id, post.id);

  // 5. Update the vote to 'down'
  const updatedVote: ICommunityPlatformPostVote =
    await api.functional.communityPlatform.user.postVotes.update(connection, {
      postVoteId: upvote.id,
      body: {
        vote_type: "down",
      } satisfies ICommunityPlatformPostVote.IUpdate,
    });
  typia.assert(updatedVote);

  // 6. Validate the update is reflected and audit/log fields are updated
  TestValidator.equals(
    "vote_type updated to down",
    updatedVote.vote_type,
    "down",
  );
  TestValidator.equals("vote id remains the same", updatedVote.id, upvote.id);
  TestValidator.equals(
    "user still correct after update",
    updatedVote.user?.id,
    user.id,
  );
  TestValidator.equals(
    "post still correct after update",
    updatedVote.post?.id,
    post.id,
  );
  TestValidator.predicate(
    "updated_at is updated (should not be earlier than original)",
    new Date(updatedVote.updated_at).getTime() >=
      new Date(upvote.updated_at).getTime(),
  );
  TestValidator.equals(
    "vote is still active after update",
    updatedVote.deleted_at,
    null,
  );
}
