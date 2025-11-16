import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunity";
import type { ICommunityPlatformCommunityVisibilityLevel } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunityVisibilityLevel";
import type { ICommunityPlatformMemberuser } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMemberuser";
import type { ICommunityPlatformPost } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformPost";
import type { ICommunityPlatformPostState } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformPostState";
import type { ICommunityPlatformPostType } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformPostType";
import type { ICommunityPlatformPostVote } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformPostVote";

/**
 * Verify idempotent behavior of updating a post vote with the same value.
 *
 * Business goal
 *
 * - When a member user updates an existing post vote using PUT
 *   /communityPlatform/memberUser/postVotes/{postVoteId} with the same
 *   vote_value as already stored, the system must treat the operation as
 *   idempotent: keep vote_value and created_at unchanged while refreshing
 *   updated_at, and must not create a new vote row.
 *
 * End-to-end flow
 *
 * 1. Register a member user by calling POST /auth/memberUser/join.
 * 2. Create a community through POST /communityPlatform/memberUser/communities.
 * 3. Create a post in that community via POST /communityPlatform/memberUser/posts.
 * 4. Cast an initial downvote (-1) on the post using POST
 *    /communityPlatform/memberUser/postVotes.
 * 5. Update that vote via PUT /communityPlatform/memberUser/postVotes/{postVoteId}
 *    with the same vote_value (-1).
 * 6. Assert idempotency invariants on the vote entity.
 */
export async function test_api_post_vote_update_idempotent_same_value(
  connection: api.IConnection,
) {
  // 1. Register member user
  const joinBody = {
    username: RandomGenerator.name(1),
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(12),
    href: "https://example.com/join",
    referrer: "https://example.com/landing",
  } satisfies ICommunityPlatformMemberuser.IJoinRequest;

  const authorized: ICommunityPlatformMemberuser.IAuthorized =
    await api.functional.auth.memberUser.join(connection, {
      body: joinBody,
    });
  typia.assert(authorized);

  // 2. Create a community for the member user
  const communityBody = {
    identifier: `community_${RandomGenerator.alphaNumeric(8)}`,
    title: RandomGenerator.paragraph({ sentences: 3 }),
    description: RandomGenerator.paragraph({ sentences: 6 }),
    visibilityLevelCode: "public",
    isNsfw: false,
  } satisfies ICommunityPlatformCommunity.ICreate;

  const community: ICommunityPlatformCommunity =
    await api.functional.communityPlatform.memberUser.communities.create(
      connection,
      { body: communityBody },
    );
  typia.assert(community);

  // 3. Create a post in that community
  const postBody = {
    community_id: community.id,
    post_type_id: typia.random<string & tags.Format<"uuid">>(),
    title: RandomGenerator.paragraph({ sentences: 4 }),
    body: RandomGenerator.content({ paragraphs: 2 }),
    url: null,
    image_uri: null,
  } satisfies ICommunityPlatformPost.ICreate;

  const post: ICommunityPlatformPost =
    await api.functional.communityPlatform.memberUser.posts.create(connection, {
      body: postBody,
    });
  typia.assert(post);

  // 4. Cast initial downvote (-1) on the post
  const initialVoteBody = {
    community_platform_post_id: post.id,
    vote_value: -1,
  } satisfies ICommunityPlatformPostVote.ICreate;

  const initialVote: ICommunityPlatformPostVote =
    await api.functional.communityPlatform.memberUser.postVotes.create(
      connection,
      { body: initialVoteBody },
    );
  typia.assert(initialVote);

  // Ensure base invariants on the initial vote
  TestValidator.equals("initial vote_value is -1", initialVote.vote_value, -1);
  TestValidator.equals(
    "initial vote member and post linkage",
    initialVote.community_platform_post_id,
    post.id,
  );

  // 5. Update the vote with the same value (-1)
  const updateBody = {
    vote_value: -1,
  } satisfies ICommunityPlatformPostVote.IUpdate;

  const updatedVote: ICommunityPlatformPostVote =
    await api.functional.communityPlatform.memberUser.postVotes.update(
      connection,
      {
        postVoteId: initialVote.id,
        body: updateBody,
      },
    );
  typia.assert(updatedVote);

  // 6. Idempotency assertions

  // Same id implies same logical row
  TestValidator.equals(
    "updated vote id matches initial",
    updatedVote.id,
    initialVote.id,
  );

  // vote_value remains -1
  TestValidator.equals(
    "vote_value unchanged after idempotent update",
    updatedVote.vote_value,
    initialVote.vote_value,
  );

  // created_at must remain identical
  TestValidator.equals(
    "created_at stays unchanged after update with same value",
    updatedVote.created_at,
    initialVote.created_at,
  );

  // updated_at should be strictly greater than before
  const initialUpdatedAtMs = new Date(initialVote.updated_at).getTime();
  const updatedUpdatedAtMs = new Date(updatedVote.updated_at).getTime();
  TestValidator.predicate(
    "updated_at is refreshed and greater than original",
    updatedUpdatedAtMs > initialUpdatedAtMs,
  );

  // Ownership invariants: same member user and same post
  TestValidator.equals(
    "member user id preserved across update",
    updatedVote.community_platform_memberuser_id,
    initialVote.community_platform_memberuser_id,
  );
  TestValidator.equals(
    "post id preserved across update",
    updatedVote.community_platform_post_id,
    initialVote.community_platform_post_id,
  );

  // Association invariants: post and community context unchanged
  TestValidator.equals(
    "post summary id preserved",
    updatedVote.post.id,
    initialVote.post.id,
  );
  TestValidator.equals(
    "community summary id preserved",
    updatedVote.community.id,
    initialVote.community.id,
  );
}
