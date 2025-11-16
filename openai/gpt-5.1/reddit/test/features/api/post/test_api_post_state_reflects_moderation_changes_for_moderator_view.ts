import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunity";
import type { ICommunityPlatformCommunityModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunityModerator";
import type { ICommunityPlatformCommunityVisibilityLevel } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunityVisibilityLevel";
import type { ICommunityPlatformMemberuser } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMemberuser";
import type { ICommunityPlatformPost } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformPost";
import type { ICommunityPlatformPostState } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformPostState";
import type { ICommunityPlatformPostType } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformPostType";

/**
 * Ensure community moderators can view accurate lifecycle/moderation state for
 * a specific post.
 *
 * Business flow implemented (constrained by available APIs):
 *
 * 1. Register a member user (author) via /auth/memberUser/join.
 * 2. (Optionally) exercise /auth/memberUser/login using the same credentials.
 *    Note: the join endpoint already authenticates and sets Authorization.
 * 3. As that member user, create a community via
 *    /communityPlatform/memberUser/communities.
 * 4. As the same member user, create a post in that community via
 *    /communityPlatform/memberUser/posts.
 * 5. Register a community moderator via /auth/communityModerator/join.
 * 6. (Optionally) exercise /auth/communityModerator/login for the moderator.
 * 7. As the authenticated community moderator, call GET
 *    /communityPlatform/communityModerator/posts/{postId}/state.
 *
 * Assertions:
 *
 * - All non-void responses are validated with typia.assert to guarantee
 *   structural correctness against their DTOs.
 * - The returned ICommunityPlatformPostState.post_id equals the id of the post
 *   created earlier.
 * - Core state fields (visibility_state, lock_state, archival_state,
 *   moderation_state) are non-empty strings.
 * - Moderation_reason, when present and non-null, is a non-empty string.
 * - Updated_at of the state is not earlier than created_at, ensuring timestamp
 *   consistency.
 *
 * Note:
 *
 * - The original scenario description mentioned that a separate moderation
 *   operation (e.g., a platformAdmin state update) would have been applied
 *   beforehand, changing visibility_state and moderation_state to specific
 *   policy codes. No such moderation endpoint is available in the provided SDK,
 *   so this test does not attempt to change the post state. Instead, it
 *   validates that the community moderator can retrieve a coherent and
 *   consistent state snapshot for an existing post using the dedicated
 *   moderator-facing endpoint.
 */
export async function test_api_post_state_reflects_moderation_changes_for_moderator_view(
  connection: api.IConnection,
) {
  // 1. Register member user (author)
  const memberUsername = RandomGenerator.alphabets(12);
  const memberPassword = RandomGenerator.alphabets(16);
  const memberJoinBody = {
    username: memberUsername,
    email: typia.random<string & tags.Format<"email">>(),
    password: memberPassword,
    ip: null,
    href: typia.random<string & tags.Format<"uri">>(),
    referrer: typia.random<string & tags.Format<"uri">>(),
  } satisfies ICommunityPlatformMemberuser.IJoinRequest;

  const memberAuthorized: ICommunityPlatformMemberuser.IAuthorized =
    await api.functional.auth.memberUser.join(connection, {
      body: memberJoinBody,
    });
  typia.assert<ICommunityPlatformMemberuser.IAuthorized>(memberAuthorized);

  // 2. Optionally exercise memberUser.login with same credentials
  const memberLoginBody = {
    identifier: memberJoinBody.email,
    password: memberPassword,
    ip: null,
    href: memberJoinBody.href,
    referrer: memberJoinBody.referrer,
  } satisfies ICommunityPlatformMemberuser.ILoginRequest;

  const memberLoginAuthorized: ICommunityPlatformMemberuser.IAuthorized =
    await api.functional.auth.memberUser.login(connection, {
      body: memberLoginBody,
    });
  typia.assert<ICommunityPlatformMemberuser.IAuthorized>(memberLoginAuthorized);

  // 3. Create a community as the member user
  const communityCreateBody = {
    identifier: RandomGenerator.alphabets(8),
    title: RandomGenerator.paragraph({ sentences: 3 }),
    description: RandomGenerator.paragraph({ sentences: 8 }),
    visibilityLevelCode: "public", // assuming a typical default visibility code
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
  typia.assert<ICommunityPlatformCommunity>(community);

  // 4. Create a post in that community
  // For post_type_id we use a random UUID since post type master data is not exposed here.
  const postCreateBody = {
    community_id: community.id,
    post_type_id: typia.random<string & tags.Format<"uuid">>(),
    title: RandomGenerator.paragraph({ sentences: 4 }),
    body: RandomGenerator.paragraph({ sentences: 12 }),
    url: null,
    image_uri: null,
  } satisfies ICommunityPlatformPost.ICreate;

  const post: ICommunityPlatformPost =
    await api.functional.communityPlatform.memberUser.posts.create(connection, {
      body: postCreateBody,
    });
  typia.assert<ICommunityPlatformPost>(post);

  // 5. Register a community moderator
  const moderatorUsername = RandomGenerator.alphabets(12);
  const moderatorPassword = RandomGenerator.alphabets(16);
  const moderatorJoinBody = {
    username: moderatorUsername,
    email: typia.random<string & tags.Format<"email">>(),
    password: moderatorPassword,
    display_name: RandomGenerator.name(),
    ip: null,
    href: typia.random<string & tags.Format<"uri">>(),
    referrer: typia.random<string & tags.Format<"uri">>(),
  } satisfies ICommunityPlatformCommunityModerator.IJoin;

  const moderatorAuthorized: ICommunityPlatformCommunityModerator.IAuthorized =
    await api.functional.auth.communityModerator.join(connection, {
      body: moderatorJoinBody,
    });
  typia.assert<ICommunityPlatformCommunityModerator.IAuthorized>(
    moderatorAuthorized,
  );

  // 6. Optionally exercise communityModerator.login
  const moderatorLoginBody = {
    identifier: moderatorJoinBody.email,
    password: moderatorPassword,
    ip: null,
    href: moderatorJoinBody.href,
    referrer: moderatorJoinBody.referrer,
  } satisfies ICommunityPlatformCommunityModerator.ILogin;

  const moderatorLoginAuthorized: ICommunityPlatformCommunityModerator.IAuthorized =
    await api.functional.auth.communityModerator.login(connection, {
      body: moderatorLoginBody,
    });
  typia.assert<ICommunityPlatformCommunityModerator.IAuthorized>(
    moderatorLoginAuthorized,
  );

  // 7. As community moderator, fetch the post state
  const state: ICommunityPlatformPostState =
    await api.functional.communityPlatform.communityModerator.posts.state.at(
      connection,
      {
        postId: post.id,
      },
    );
  typia.assert<ICommunityPlatformPostState>(state);

  // Assertions on state linkage and core fields
  TestValidator.equals(
    "post state should belong to created post",
    state.post_id,
    post.id,
  );

  TestValidator.predicate(
    "visibility_state should be a non-empty string",
    state.visibility_state.length > 0,
  );

  TestValidator.predicate(
    "lock_state should be a non-empty string",
    state.lock_state.length > 0,
  );

  TestValidator.predicate(
    "archival_state should be a non-empty string",
    state.archival_state.length > 0,
  );

  TestValidator.predicate(
    "moderation_state should be a non-empty string",
    state.moderation_state.length > 0,
  );

  if (
    state.moderation_reason !== null &&
    state.moderation_reason !== undefined
  ) {
    TestValidator.predicate(
      "moderation_reason, when present, should be non-empty",
      state.moderation_reason.length > 0,
    );
  }

  // Timestamp consistency: updated_at should be >= created_at
  const createdAt = new Date(state.created_at).getTime();
  const updatedAt = new Date(state.updated_at).getTime();

  TestValidator.predicate(
    "post state updated_at should be on or after created_at",
    updatedAt >= createdAt,
  );
}
