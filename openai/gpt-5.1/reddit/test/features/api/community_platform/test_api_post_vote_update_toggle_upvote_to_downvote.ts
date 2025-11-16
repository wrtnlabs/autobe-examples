import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformAccountStatus } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAccountStatus";
import type { ICommunityPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunity";
import type { ICommunityPlatformCommunityVisibilityLevel } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunityVisibilityLevel";
import type { ICommunityPlatformMemberuser } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMemberuser";
import type { ICommunityPlatformPlatformadmin } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformPlatformadmin";
import type { ICommunityPlatformPost } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformPost";
import type { ICommunityPlatformPostState } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformPostState";
import type { ICommunityPlatformPostType } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformPostType";
import type { ICommunityPlatformPostVote } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformPostVote";

/**
 * Validate that a member user can toggle an existing upvote on a post to a
 * downvote using PUT /communityPlatform/memberUser/postVotes/{postVoteId}.
 *
 * Business flow covered by this test:
 *
 * 1. Register a new member user and obtain authenticated member context.
 * 2. Register a new platform admin and create a post type.
 * 3. Switch back to the member user and create a community.
 * 4. Create a post in that community using the created post type.
 * 5. Cast an initial upvote (vote_value = +1) on that post.
 * 6. Update the vote via PUT to change vote_value to -1.
 * 7. Assert that the vote row has been updated correctly while preserving
 *    identity.
 */
export async function test_api_post_vote_update_toggle_upvote_to_downvote(
  connection: api.IConnection,
) {
  // 1. Register a new member user (join)
  const memberJoinBody = {
    username: RandomGenerator.name(1),
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(12),
    ip: "127.0.0.1",
    href: "https://community.example.com/join",
    referrer: "https://community.example.com/landing",
  } satisfies ICommunityPlatformMemberuser.IJoinRequest;

  const memberAuthorized: ICommunityPlatformMemberuser.IAuthorized =
    await api.functional.auth.memberUser.join(connection, {
      body: memberJoinBody,
    });
  typia.assert(memberAuthorized);

  // 2. Register a new platform admin and create a post type
  const platformAdminJoinBody = {
    username: RandomGenerator.name(1),
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(16),
    displayName: RandomGenerator.name(),
    ip: "127.0.0.1",
    href: "https://community.example.com/admin/join",
    referrer: "https://community.example.com/admin/landing",
  } satisfies ICommunityPlatformPlatformadmin.IJoin;

  const platformAdminAuthorized: ICommunityPlatformPlatformadmin.IAuthorized =
    await api.functional.auth.platformAdmin.join(connection, {
      body: platformAdminJoinBody,
    });
  typia.assert(platformAdminAuthorized);

  // Create a concrete post type as platformAdmin
  const postTypeCreateBody = {
    code: `text-${RandomGenerator.alphaNumeric(8)}`,
    name: "Text Post",
    description: RandomGenerator.paragraph({ sentences: 5 }),
  } satisfies ICommunityPlatformPostType.ICreate;

  const postType: ICommunityPlatformPostType =
    await api.functional.communityPlatform.platformAdmin.postTypes.create(
      connection,
      {
        body: postTypeCreateBody,
      },
    );
  typia.assert(postType);

  // 3. Switch back to member user context via login to ensure Authorization header
  const memberLoginBody = {
    identifier: memberJoinBody.email,
    password: memberJoinBody.password,
    ip: "127.0.0.1",
    href: "https://community.example.com/login",
    referrer: "https://community.example.com/home",
  } satisfies ICommunityPlatformMemberuser.ILoginRequest;

  const memberLoginAuthorized: ICommunityPlatformMemberuser.IAuthorized =
    await api.functional.auth.memberUser.login(connection, {
      body: memberLoginBody,
    });
  typia.assert(memberLoginAuthorized);

  TestValidator.equals(
    "member id from join and login must match",
    memberLoginAuthorized.id,
    memberAuthorized.id,
  );

  // 4. Create a community under the member user
  const communityCreateBody = {
    identifier: `community-${RandomGenerator.alphaNumeric(8)}`,
    title: RandomGenerator.name(),
    description: RandomGenerator.paragraph({ sentences: 3 }),
    visibilityLevelCode: "public",
    isNsfw: false,
    primaryTagIds: [],
  } satisfies ICommunityPlatformCommunity.ICreate;

  const community: ICommunityPlatformCommunity =
    await api.functional.communityPlatform.memberUser.communities.create(
      connection,
      {
        body: communityCreateBody,
      },
    );
  typia.assert(community);

  // 5. Create a post in that community using the created post type
  const postCreateBody = {
    community_id: community.id,
    post_type_id: postType.id,
    title: RandomGenerator.paragraph({ sentences: 2 }),
    body: RandomGenerator.paragraph({ sentences: 5 }),
    url: null,
    image_uri: null,
  } satisfies ICommunityPlatformPost.ICreate;

  const post: ICommunityPlatformPost =
    await api.functional.communityPlatform.memberUser.posts.create(connection, {
      body: postCreateBody,
    });
  typia.assert(post);

  // 6. Cast an initial upvote on the post via POST /communityPlatform/memberUser/postVotes
  const initialVoteBody = {
    community_platform_post_id: post.id,
    vote_value: 1 satisfies number &
      tags.Type<"int32"> &
      tags.Minimum<-1> &
      tags.Maximum<1>,
  } satisfies ICommunityPlatformPostVote.ICreate;

  const originalVote: ICommunityPlatformPostVote =
    await api.functional.communityPlatform.memberUser.postVotes.create(
      connection,
      {
        body: initialVoteBody,
      },
    );
  typia.assert(originalVote);

  TestValidator.equals("original vote must be +1", originalVote.vote_value, 1);

  TestValidator.equals(
    "original vote must be tied to created post",
    originalVote.community_platform_post_id,
    post.id,
  );

  TestValidator.equals(
    "original vote must be tied to authenticated member",
    originalVote.memberUser.id,
    memberLoginAuthorized.id,
  );

  const originalCreatedAt = new Date(originalVote.created_at).getTime();
  const originalUpdatedAt = new Date(originalVote.updated_at).getTime();

  // 7. Update the vote to -1 via PUT /communityPlatform/memberUser/postVotes/{postVoteId}
  const updateVoteBody = {
    vote_value: -1 satisfies number &
      tags.Type<"int32"> &
      tags.Minimum<-1> &
      tags.Maximum<1>,
  } satisfies ICommunityPlatformPostVote.IUpdate;

  const updatedVote: ICommunityPlatformPostVote =
    await api.functional.communityPlatform.memberUser.postVotes.update(
      connection,
      {
        postVoteId: originalVote.id,
        body: updateVoteBody,
      },
    );
  typia.assert(updatedVote);

  // Assertions on updated vote
  TestValidator.equals(
    "updated vote id must equal original vote id",
    updatedVote.id,
    originalVote.id,
  );

  TestValidator.equals(
    "updated vote_value must be -1",
    updatedVote.vote_value,
    -1,
  );

  TestValidator.equals(
    "updated vote must remain tied to same member user",
    updatedVote.memberUser.id,
    originalVote.memberUser.id,
  );

  TestValidator.equals(
    "updated vote must remain tied to same post",
    updatedVote.post.id,
    post.id,
  );

  TestValidator.equals(
    "created_at must not change when updating a vote",
    updatedVote.created_at,
    originalVote.created_at,
  );

  const updatedUpdatedAt = new Date(updatedVote.updated_at).getTime();

  TestValidator.predicate(
    "updated_at should be greater than or equal to original updated_at",
    updatedUpdatedAt >= originalUpdatedAt,
  );
}
