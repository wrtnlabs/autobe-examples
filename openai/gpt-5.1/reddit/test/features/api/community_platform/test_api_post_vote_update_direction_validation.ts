import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunity";
import type { ICommunityPlatformMemberuser } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMemberuser";
import type { ICommunityPlatformPost } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformPost";
import type { ICommunityPlatformPostVote } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformPostVote";

/**
 * Validate update behavior of a member user's vote on a community post.
 *
 * Business context:
 *
 * - A registered memberUser can create communities, author posts, and cast votes
 *   (up/down) on posts.
 * - The vote model ICommunityPlatformPostVote represents a single (memberuser_id,
 *   post_id) pair with a direction token like "up" or "down".
 * - The PUT /communityPlatform/memberUser/posts/{postId}/votes/{voteId} endpoint
 *   updates the mutable properties of that vote, primarily the direction.
 *
 * This E2E test exercises the happy-path workflow where a member user:
 *
 * 1. Registers and obtains an authenticated session.
 * 2. Creates a community.
 * 3. Creates a post inside that community.
 * 4. Casts an initial vote (direction = "up") on the post.
 * 5. Updates the same vote to direction = "down" using the update endpoint.
 * 6. Calls update again with the same direction to verify stability.
 *
 * The test focuses on verifying that:
 *
 * - All intermediate resources (memberUser, community, post, vote) are created
 *   successfully and conform to their DTOs.
 * - The initial vote correctly references the authoring memberUser and target
 *   post via memberuser_id and post_id.
 * - Updating the vote changes only the mutable direction field while keeping the
 *   same vote id and foreign keys.
 * - Re-applying the same direction leaves the vote id and direction unchanged,
 *   providing idempotent-like behavior for repeated updates with identical
 *   payloads.
 */
export async function test_api_post_vote_update_direction_validation(
  connection: api.IConnection,
) {
  // 1. Register a memberUser (join) and obtain an authorized actor.
  const joinInput = {
    username: RandomGenerator.alphabets(8),
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphabets(12),
    ip: null,
    href: typia.random<string & tags.Format<"uri">>(),
    referrer: typia.random<string & tags.Format<"uri">>(),
  } satisfies ICommunityPlatformMemberuser.IJoin;

  const member: ICommunityPlatformMemberuser.IAuthorized =
    await api.functional.auth.memberUser.join(connection, {
      body: joinInput,
    });
  typia.assert(member);

  // 2. Create a community owned by this memberUser.
  const communityCreateBody = {
    slug: RandomGenerator.alphabets(12),
    name: RandomGenerator.paragraph({ sentences: 2 }),
    description: RandomGenerator.paragraph({ sentences: 5 }),
    visibility: "public",
    status: "active",
    is_nsfw: false,
    is_quarantined: false,
    is_posting_restricted: false,
    allow_text_posts: true,
    allow_link_posts: true,
    allow_image_posts: true,
  } satisfies ICommunityPlatformCommunity.ICreate;

  const community: ICommunityPlatformCommunity =
    await api.functional.communityPlatform.memberUser.communities.create(
      connection,
      {
        body: communityCreateBody,
      },
    );
  typia.assert(community);

  TestValidator.equals(
    "community owner should be the joined member user",
    community.owner_memberuser_id,
    member.id,
  );

  // 3. Create a post inside the community authored by the memberUser.
  const postCreateBody = {
    communityId: community.id,
    communityCode: community.slug,
    title: RandomGenerator.paragraph({ sentences: 3 }),
    body: RandomGenerator.content({ paragraphs: 1 }),
    postType: "text",
  } satisfies ICommunityPlatformPost.ICreate;

  const post: ICommunityPlatformPost =
    await api.functional.communityPlatform.memberUser.posts.create(connection, {
      body: postCreateBody,
    });
  typia.assert(post);

  TestValidator.equals(
    "post should belong to created community",
    post.community_id,
    community.id,
  );
  TestValidator.equals(
    "post author should be the joined member user",
    post.author_memberuser_id,
    member.id,
  );

  // 4. Create an initial vote on the post with direction "up".
  const initialDirection = "up" as const;
  const voteCreateBody = {
    direction: initialDirection,
  } satisfies ICommunityPlatformPostVote.ICreate;

  const initialVote: ICommunityPlatformPostVote =
    await api.functional.communityPlatform.memberUser.posts.votes.create(
      connection,
      {
        postId: post.id,
        body: voteCreateBody,
      },
    );
  typia.assert(initialVote);

  TestValidator.equals(
    "initial vote should target the created post",
    initialVote.post_id,
    post.id,
  );
  TestValidator.equals(
    "initial vote should belong to the joined member user",
    initialVote.memberuser_id,
    member.id,
  );
  TestValidator.equals(
    "initial vote direction should be 'up'",
    initialVote.direction,
    initialDirection,
  );

  // 5. Update the existing vote to direction "down".
  const updatedDirection = "down" as const;
  const updateBody = {
    direction: updatedDirection,
  } satisfies ICommunityPlatformPostVote.IUpdate;

  const updatedVote: ICommunityPlatformPostVote =
    await api.functional.communityPlatform.memberUser.posts.votes.update(
      connection,
      {
        postId: post.id,
        voteId: initialVote.id,
        body: updateBody,
      },
    );
  typia.assert(updatedVote);

  // Verify that the same vote row was updated (id and foreign keys are stable).
  TestValidator.equals(
    "updated vote should keep same id as initial vote",
    updatedVote.id,
    initialVote.id,
  );
  TestValidator.equals(
    "updated vote should still reference same post",
    updatedVote.post_id,
    initialVote.post_id,
  );
  TestValidator.equals(
    "updated vote should still reference same member user",
    updatedVote.memberuser_id,
    initialVote.memberuser_id,
  );

  // Direction should change from "up" to "down".
  TestValidator.notEquals(
    "updated vote direction should differ from initial direction",
    updatedVote.direction,
    initialVote.direction,
  );
  TestValidator.equals(
    "updated vote direction should be 'down'",
    updatedVote.direction,
    updatedDirection,
  );

  // 6. Call update again with the same direction to confirm stability.
  const secondUpdateBody = {
    direction: updatedDirection,
  } satisfies ICommunityPlatformPostVote.IUpdate;

  const secondUpdatedVote: ICommunityPlatformPostVote =
    await api.functional.communityPlatform.memberUser.posts.votes.update(
      connection,
      {
        postId: post.id,
        voteId: initialVote.id,
        body: secondUpdateBody,
      },
    );
  typia.assert(secondUpdatedVote);

  TestValidator.equals(
    "second update should keep same vote id",
    secondUpdatedVote.id,
    updatedVote.id,
  );
  TestValidator.equals(
    "second update should keep same direction",
    secondUpdatedVote.direction,
    updatedVote.direction,
  );
}
