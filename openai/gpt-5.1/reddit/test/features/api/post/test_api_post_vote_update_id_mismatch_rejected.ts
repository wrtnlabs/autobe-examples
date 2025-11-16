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
 * Ensure that a post vote update is rejected when the vote row does not belong
 * to the specified post.
 *
 * Business context:
 *
 * - Each vote row (community_platform_post_votes) belongs to exactly one post
 *   (via post_id) and one member user (via memberuser_id).
 * - The PUT /communityPlatform/memberUser/posts/{postId}/votes/{voteId} endpoint
 *   is documented to validate that the vote row identified by voteId actually
 *   belongs to the post identified by postId; otherwise, the operation must
 *   fail.
 *
 * This test builds a realistic member user workflow to validate that mismatched
 * postId/voteId combinations are rejected and do not mutate vote state:
 *
 * 1. Register a memberUser and obtain an authenticated context.
 * 2. Create two distinct communities (A and B).
 * 3. Create post A in community A and post B in community B.
 * 4. Cast a vote on post A (capturing the returned voteA object).
 * 5. Attempt to update voteA using postB.id as the postId, creating a deliberate
 *    mismatch between postId and voteId.
 * 6. Assert that the update call fails with an HTTP error, using
 *    TestValidator.httpError so that only the error existence (not a specific
 *    status code) is asserted.
 * 7. Confirm that the existing in-memory voteA object remains unchanged to model
 *    the expectation that the backend did not mutate the stored vote row or
 *    create any additional rows as a side-effect.
 */
export async function test_api_post_vote_update_id_mismatch_rejected(
  connection: api.IConnection,
) {
  // 1. Register a new memberUser via join
  const joinBody = {
    username: RandomGenerator.name(1),
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(12),
    ip: null,
    href: "https://example.com/register",
    referrer: "https://example.com/landing",
  } satisfies ICommunityPlatformMemberuser.IJoin;

  const member: ICommunityPlatformMemberuser.IAuthorized =
    await api.functional.auth.memberUser.join(connection, {
      body: joinBody,
    });
  typia.assert(member);

  // 2. Create two communities A and B
  const communityABody = {
    slug: RandomGenerator.alphaNumeric(16),
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

  const communityA: ICommunityPlatformCommunity =
    await api.functional.communityPlatform.memberUser.communities.create(
      connection,
      { body: communityABody },
    );
  typia.assert(communityA);

  const communityBBody = {
    slug: RandomGenerator.alphaNumeric(16),
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

  const communityB: ICommunityPlatformCommunity =
    await api.functional.communityPlatform.memberUser.communities.create(
      connection,
      { body: communityBBody },
    );
  typia.assert(communityB);

  // 3. Create post A in community A and post B in community B
  const postABody = {
    communityId: communityA.id,
    communityCode: communityA.slug,
    title: RandomGenerator.paragraph({ sentences: 3 }),
    body: RandomGenerator.content({ paragraphs: 1 }),
    url: undefined,
    postType: "text",
  } satisfies ICommunityPlatformPost.ICreate;

  const postA: ICommunityPlatformPost =
    await api.functional.communityPlatform.memberUser.posts.create(connection, {
      body: postABody,
    });
  typia.assert(postA);

  const postBBody = {
    communityId: communityB.id,
    communityCode: communityB.slug,
    title: RandomGenerator.paragraph({ sentences: 3 }),
    body: RandomGenerator.content({ paragraphs: 1 }),
    url: undefined,
    postType: "text",
  } satisfies ICommunityPlatformPost.ICreate;

  const postB: ICommunityPlatformPost =
    await api.functional.communityPlatform.memberUser.posts.create(connection, {
      body: postBBody,
    });
  typia.assert(postB);

  // 4. Cast a vote on post A and capture the returned vote entity
  const voteCreateBody = {
    direction: "up",
  } satisfies ICommunityPlatformPostVote.ICreate;

  const voteA: ICommunityPlatformPostVote =
    await api.functional.communityPlatform.memberUser.posts.votes.create(
      connection,
      {
        postId: postA.id,
        body: voteCreateBody,
      },
    );
  typia.assert(voteA);

  // Snapshot voteA for later equality comparison
  const originalVoteSnapshot: ICommunityPlatformPostVote = {
    id: voteA.id,
    memberuser_id: voteA.memberuser_id,
    post_id: voteA.post_id,
    direction: voteA.direction,
    created_at: voteA.created_at,
    updated_at: voteA.updated_at,
  };

  // 5. Attempt to update voteA using postB.id as postId (ID mismatch)
  const mismatchedUpdateBody = {
    direction: "down",
  } satisfies ICommunityPlatformPostVote.IUpdate;

  await TestValidator.httpError(
    "update with mismatched postId/voteId must fail",
    [400, 403, 404, 409, 422, 500],
    async () => {
      await api.functional.communityPlatform.memberUser.posts.votes.update(
        connection,
        {
          postId: postB.id,
          voteId: voteA.id,
          body: mismatchedUpdateBody,
        },
      );
    },
  );

  // 6. Verify that the in-memory snapshot of voteA remains unchanged
  TestValidator.equals(
    "vote state should remain unchanged after rejected mismatched update",
    voteA,
    originalVoteSnapshot,
  );
}
