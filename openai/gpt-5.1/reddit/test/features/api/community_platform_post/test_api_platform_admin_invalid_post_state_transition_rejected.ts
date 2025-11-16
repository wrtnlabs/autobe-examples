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

/**
 * Validate that platformAdmin cannot restore a post from a terminal removed
 * state.
 *
 * Business workflow:
 *
 * 1. Platform admin joins (registration + authenticated session).
 * 2. Platform admin creates a community visibility level master (unique code for
 *    this test).
 * 3. Member user joins.
 * 4. Member user creates a community using the created visibility level code.
 * 5. Platform admin creates a post type master (unique code for this test).
 * 6. Member user creates a text-style post in the created community using the
 *    created post type.
 * 7. Platform admin updates the post state into a terminal removed configuration
 *    (visibility_state="hard_removed_shadow",
 *    moderation_state="removed_policy_violation", lock_state="locked_all",
 *    archival_state="archived_readonly"). This must succeed.
 * 8. Platform admin attempts to update the same post back to an active, visible
 *    state (visibility_state="visible", lock_state="unlocked",
 *    archival_state="active", moderation_state="none"). This second update must
 *    fail with a 4xx-like error.
 *
 * The test asserts:
 *
 * - All creation operations return valid DTO shapes (via typia.assert).
 * - The first state update succeeds and returns a state object with the requested
 *   values.
 * - The second state update throws, validated via TestValidator.error, without
 *   asserting concrete HTTP status codes.
 */
export async function test_api_platform_admin_invalid_post_state_transition_rejected(
  connection: api.IConnection,
) {
  // 1. Platform admin joins
  const platformAdminJoinBody = {
    username: `admin_${RandomGenerator.alphaNumeric(8)}`,
    email: typia.random<string & tags.Format<"email">>(),
    password: "AdminPassword123!",
    displayName: RandomGenerator.name(),
    ip: "127.0.0.1",
    href: "https://admin.example.com/join",
    referrer: "https://admin.example.com/landing",
  } satisfies ICommunityPlatformPlatformadmin.IJoin;

  const platformAdmin: ICommunityPlatformPlatformadmin.IAuthorized =
    await api.functional.auth.platformAdmin.join(connection, {
      body: platformAdminJoinBody,
    });
  typia.assert(platformAdmin);

  // 2. Platform admin creates a community visibility level master
  const visibilityCode = `public_e2e_${RandomGenerator.alphaNumeric(8)}`;
  const visibilityLevelCreateBody = {
    code: visibilityCode,
    name: "Public E2E Visibility (State Test)",
    description: RandomGenerator.paragraph({ sentences: 5 }),
  } satisfies ICommunityPlatformCommunityVisibilityLevel.ICreate;

  const visibilityLevel: ICommunityPlatformCommunityVisibilityLevel =
    await api.functional.communityPlatform.platformAdmin.communityVisibilityLevels.create(
      connection,
      {
        body: visibilityLevelCreateBody,
      },
    );
  typia.assert(visibilityLevel);
  TestValidator.equals(
    "created visibility level code should match request",
    visibilityLevel.code,
    visibilityCode,
  );

  // 3. Member user joins
  const memberJoinBody = {
    username: `member_${RandomGenerator.alphaNumeric(8)}`,
    email: typia.random<string & tags.Format<"email">>(),
    password: "MemberPassword123!",
    ip: "127.0.0.1",
    href: "https://app.example.com/join",
    referrer: "https://app.example.com/home",
  } satisfies ICommunityPlatformMemberuser.IJoinRequest;

  const memberUser: ICommunityPlatformMemberuser.IAuthorized =
    await api.functional.auth.memberUser.join(connection, {
      body: memberJoinBody,
    });
  typia.assert(memberUser);

  // 4. Member user creates a community using the visibility level code
  const communityIdentifier = `e2e-state-community-${RandomGenerator.alphabets(6)}`;
  const communityCreateBody = {
    identifier: communityIdentifier,
    title: "E2E State Transition Test Community",
    description: RandomGenerator.paragraph({ sentences: 8 }),
    visibilityLevelCode: visibilityCode,
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
  TestValidator.equals(
    "community visibility level code embedded in summary should match",
    community.visibilityLevel.code,
    visibilityCode,
  );

  // 5. Switch back to platform admin and create a post type master
  await api.functional.auth.platformAdmin.login(connection, {
    body: {
      identifier: platformAdminJoinBody.email,
      password: platformAdminJoinBody.password,
      ip: "127.0.0.1",
      href: "https://admin.example.com/login",
      referrer: "https://admin.example.com/login-ref",
    } satisfies ICommunityPlatformPlatformadmin.ILogin,
  });

  const postTypeCode = `text_e2e_${RandomGenerator.alphaNumeric(8)}`;
  const postTypeCreateBody = {
    code: postTypeCode,
    name: "E2E Text Post Type (State Test)",
    description: RandomGenerator.paragraph({ sentences: 6 }),
  } satisfies ICommunityPlatformPostType.ICreate;

  const postType: ICommunityPlatformPostType =
    await api.functional.communityPlatform.platformAdmin.postTypes.create(
      connection,
      {
        body: postTypeCreateBody,
      },
    );
  typia.assert(postType);
  TestValidator.equals(
    "created post type code should match request",
    postType.code,
    postTypeCode,
  );

  // 6. Switch to member user and create a post in the community
  await api.functional.auth.memberUser.login(connection, {
    body: {
      identifier: memberJoinBody.email,
      password: memberJoinBody.password,
      ip: "127.0.0.1",
      href: "https://app.example.com/login",
      referrer: "https://app.example.com/login-ref",
    } satisfies ICommunityPlatformMemberuser.ILoginRequest,
  });

  const postCreateBody = {
    community_id: community.id,
    post_type_id: postType.id,
    title: "E2E Invalid State Transition Post",
    body: RandomGenerator.paragraph({ sentences: 10 }),
    url: null,
    image_uri: null,
  } satisfies ICommunityPlatformPost.ICreate;

  const post: ICommunityPlatformPost =
    await api.functional.communityPlatform.memberUser.posts.create(connection, {
      body: postCreateBody,
    });
  typia.assert(post);

  // 7. Switch to platform admin and set post state to terminal removed
  await api.functional.auth.platformAdmin.login(connection, {
    body: {
      identifier: platformAdminJoinBody.email,
      password: platformAdminJoinBody.password,
      ip: "127.0.0.1",
      href: "https://admin.example.com/login-2",
      referrer: "https://admin.example.com/posts",
    } satisfies ICommunityPlatformPlatformadmin.ILogin,
  });

  const terminalStateUpdateBody = {
    visibility_state: "hard_removed_shadow",
    lock_state: "locked_all",
    archival_state: "archived_readonly",
    moderation_state: "removed_policy_violation",
    moderation_reason: "E2E test: policy violation removal",
  } satisfies ICommunityPlatformPostState.IUpdate;

  const removedState: ICommunityPlatformPostState =
    await api.functional.communityPlatform.platformAdmin.posts.state.update(
      connection,
      {
        postId: post.id,
        body: terminalStateUpdateBody,
      },
    );
  typia.assert(removedState);

  TestValidator.equals(
    "removed state visibility_state should match requested terminal state",
    removedState.visibility_state,
    terminalStateUpdateBody.visibility_state,
  );
  TestValidator.equals(
    "removed state moderation_state should indicate policy violation",
    removedState.moderation_state,
    terminalStateUpdateBody.moderation_state,
  );

  // 8. Attempt invalid transition back to visible/active/unlocked
  const invalidRestoreUpdateBody = {
    visibility_state: "visible",
    lock_state: "unlocked",
    archival_state: "active",
    moderation_state: "none",
    moderation_reason: "E2E test: attempt to restore from terminal removed",
  } satisfies ICommunityPlatformPostState.IUpdate;

  await TestValidator.error(
    "platform admin cannot restore post from terminal removed state",
    async () => {
      await api.functional.communityPlatform.platformAdmin.posts.state.update(
        connection,
        {
          postId: post.id,
          body: invalidRestoreUpdateBody,
        },
      );
    },
  );
}
