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

/**
 * Verify that an authenticated member user can retrieve lifecycle/moderation
 * state for a post they authored.
 *
 * Business context:
 *
 * - Member users self-register via /auth/memberUser/join.
 * - They can create communities using preconfigured visibility levels.
 * - They can create posts in those communities using preconfigured post types.
 * - Each post has an associated lifecycle/moderation state record
 *   (community_platform_post_states) exposed as ICommunityPlatformPostState.
 *
 * Test steps:
 *
 * 1. Register a new member user via POST /auth/memberUser/join, which also
 *    establishes the authenticated context by letting the SDK set the
 *    Authorization header from the returned token.
 * 2. Create a community via POST /communityPlatform/memberUser/communities, using
 *    an arbitrary visibilityLevelCode string (business rules and master data
 *    are assumed to accept random codes in this test environment).
 * 3. Create a post via POST /communityPlatform/memberUser/posts, targeting the
 *    created community and using a randomly generated UUID as post_type_id to
 *    represent a pre-existing post type.
 * 4. Call GET /communityPlatform/memberUser/posts/{postId}/state as the same
 *    member user to retrieve the post state.
 *
 * Assertions:
 *
 * - All create/join operations return successfully and match their DTO shapes
 *   (validated via typia.assert).
 * - The returned ICommunityPlatformPost has its id equal to the created post id
 *   and community.id equal to the created community id.
 * - The returned ICommunityPlatformPostState from the state endpoint passes
 *   typia.assert and has post_id equal to the created post.id.
 * - Basic business sanity checks on state fields (non-empty strings for
 *   visibility_state, lock_state, archival_state, moderation_state).
 * - No authorization errors occur when the author retrieves their own post state.
 */
export async function test_api_post_state_retrieval_by_author_member_user(
  connection: api.IConnection,
) {
  // 1. Register a new member user (author)
  const joinBody = {
    username: RandomGenerator.alphabets(12),
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(16),
    // Use reasonable URIs for href and referrer
    href: "https://community.example.com/join",
    referrer: "https://community.example.com/landing",
  } satisfies ICommunityPlatformMemberuser.IJoinRequest;

  const author = await api.functional.auth.memberUser.join(connection, {
    body: joinBody,
  });
  typia.assert<ICommunityPlatformMemberuser.IAuthorized>(author);

  // 2. Create a community as this member user
  const communityBody = {
    identifier: RandomGenerator.alphaNumeric(10),
    title: RandomGenerator.paragraph({ sentences: 3 }),
    description: RandomGenerator.paragraph({ sentences: 8 }),
    visibilityLevelCode: "public",
    isNsfw: false,
    primaryTagIds: [],
  } satisfies ICommunityPlatformCommunity.ICreate;

  const community =
    await api.functional.communityPlatform.memberUser.communities.create(
      connection,
      { body: communityBody },
    );
  typia.assert<ICommunityPlatformCommunity>(community);

  // Sanity: created community has an id
  TestValidator.predicate(
    "community id is non-empty UUID string",
    typeof community.id === "string" && community.id.length > 0,
  );

  // 3. Create a post in this community
  const postBody = {
    community_id: community.id,
    post_type_id: typia.random<string & tags.Format<"uuid">>(),
    title: RandomGenerator.paragraph({ sentences: 4 }),
    body: RandomGenerator.paragraph({ sentences: 10 }),
    url: null,
    image_uri: null,
  } satisfies ICommunityPlatformPost.ICreate;

  const post = await api.functional.communityPlatform.memberUser.posts.create(
    connection,
    { body: postBody },
  );
  typia.assert<ICommunityPlatformPost>(post);

  // Ensure the created post belongs to the created community
  TestValidator.equals(
    "post.community.id should match created community id",
    post.community.id,
    community.id,
  );

  // 4. Retrieve the post state as the same author
  const state =
    await api.functional.communityPlatform.memberUser.posts.state.at(
      connection,
      { postId: post.id },
    );
  typia.assert<ICommunityPlatformPostState>(state);

  // Validate that the state belongs to the created post
  TestValidator.equals(
    "post state.post_id should equal created post.id",
    state.post_id,
    post.id,
  );

  // Basic sanity checks on lifecycle/moderation fields: non-empty strings
  TestValidator.predicate(
    "visibility_state should be a non-empty string",
    typeof state.visibility_state === "string" &&
      state.visibility_state.length > 0,
  );
  TestValidator.predicate(
    "lock_state should be a non-empty string",
    typeof state.lock_state === "string" && state.lock_state.length > 0,
  );
  TestValidator.predicate(
    "archival_state should be a non-empty string",
    typeof state.archival_state === "string" && state.archival_state.length > 0,
  );
  TestValidator.predicate(
    "moderation_state should be a non-empty string",
    typeof state.moderation_state === "string" &&
      state.moderation_state.length > 0,
  );
}
