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
 * Verify that a platform administrator can soft-remove a post and lock its
 * comments by updating the post lifecycle/moderation state.
 *
 * Business workflow covered:
 *
 * 1. Register a platform admin and implicitly authenticate as platformAdmin
 * 2. As platformAdmin, create a community visibility level master record
 * 3. As platformAdmin, create a post type (e.g., text)
 * 4. Register a member user and implicitly authenticate as memberUser
 * 5. As memberUser, create a community using the visibility level code
 * 6. As memberUser, create a post in that community using the post type
 * 7. Switch back to platformAdmin via login
 * 8. As platformAdmin, call PUT
 *    /communityPlatform/platformAdmin/posts/{postId}/state to set
 *    visibility_state to "soft_removed", lock_state to "locked_comments",
 *    archival_state to an active-like value, moderation_state to a policy
 *    violation code, and moderation_reason to a non-empty explanation
 * 9. Assert that the returned ICommunityPlatformPostState matches the requested
 *    values and is associated with the correct post
 */
export async function test_api_platform_admin_soft_removes_post_and_locks_comments(
  connection: api.IConnection,
) {
  // 1. Register a platform administrator (implicitly authenticates platformAdmin)
  const platformAdminJoinInput = {
    username: RandomGenerator.name(1),
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(12),
    displayName: RandomGenerator.name(2),
    ip: RandomGenerator.mobile(),
    href: "https://admin-console.example.com/join",
    referrer: "https://admin-console.example.com/landing",
  } satisfies ICommunityPlatformPlatformadmin.IJoin;

  const platformAdminAuthorized: ICommunityPlatformPlatformadmin.IAuthorized =
    await api.functional.auth.platformAdmin.join(connection, {
      body: platformAdminJoinInput,
    });
  typia.assert(platformAdminAuthorized);

  // 2. As platformAdmin, create a visibility level master record
  const visibilityLevelCode = `public_${RandomGenerator.alphaNumeric(8)}`;
  const visibilityLevelCreate = {
    code: visibilityLevelCode,
    name: "Public Visibility",
    description: RandomGenerator.paragraph({ sentences: 4 }),
  } satisfies ICommunityPlatformCommunityVisibilityLevel.ICreate;

  const visibilityLevel: ICommunityPlatformCommunityVisibilityLevel =
    await api.functional.communityPlatform.platformAdmin.communityVisibilityLevels.create(
      connection,
      {
        body: visibilityLevelCreate,
      },
    );
  typia.assert(visibilityLevel);

  // 3. As platformAdmin, create a post type
  const postTypeCode = `text_${RandomGenerator.alphaNumeric(6)}`;
  const postTypeCreate = {
    code: postTypeCode,
    name: "Text Post",
    description: RandomGenerator.paragraph({ sentences: 5 }),
  } satisfies ICommunityPlatformPostType.ICreate;

  const postType: ICommunityPlatformPostType =
    await api.functional.communityPlatform.platformAdmin.postTypes.create(
      connection,
      {
        body: postTypeCreate,
      },
    );
  typia.assert(postType);

  // 4. Register a member user (implicitly authenticates memberUser)
  const memberJoinInput = {
    username: RandomGenerator.name(1),
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(10),
    ip: null,
    href: "https://community.example.com/join",
    referrer: "https://community.example.com/home",
  } satisfies ICommunityPlatformMemberuser.IJoinRequest;

  const memberAuthorized: ICommunityPlatformMemberuser.IAuthorized =
    await api.functional.auth.memberUser.join(connection, {
      body: memberJoinInput,
    });
  typia.assert(memberAuthorized);

  // 5. As memberUser, create a community with the visibility level code
  const communityIdentifier = `community_${RandomGenerator.alphaNumeric(6)}`;
  const communityCreate = {
    identifier: communityIdentifier,
    title: RandomGenerator.name(3),
    description: RandomGenerator.paragraph({ sentences: 6 }),
    visibilityLevelCode: visibilityLevel.code,
    isNsfw: false,
    // leave primaryTagIds undefined for simplicity
  } satisfies ICommunityPlatformCommunity.ICreate;

  const community: ICommunityPlatformCommunity =
    await api.functional.communityPlatform.memberUser.communities.create(
      connection,
      {
        body: communityCreate,
      },
    );
  typia.assert(community);

  // 6. As memberUser, create a text post in the community using the post type
  const postCreate = {
    community_id: community.id,
    post_type_id: postType.id,
    title: RandomGenerator.paragraph({ sentences: 3 }),
    body: RandomGenerator.content({
      paragraphs: 2,
      sentenceMin: 5,
      sentenceMax: 10,
    }),
    // For a text post, url and image_uri remain undefined/null
  } satisfies ICommunityPlatformPost.ICreate;

  const post: ICommunityPlatformPost =
    await api.functional.communityPlatform.memberUser.posts.create(connection, {
      body: postCreate,
    });
  typia.assert(post);

  // 7. Switch back to platformAdmin via login to ensure correct actor context
  const platformAdminLoginInput = {
    identifier: platformAdminJoinInput.email,
    password: platformAdminJoinInput.password,
    ip: null,
    href: "https://admin-console.example.com/login",
    referrer: "https://admin-console.example.com/dashboard",
  } satisfies ICommunityPlatformPlatformadmin.ILogin;

  const platformAdminLoggedIn: ICommunityPlatformPlatformadmin.IAuthorized =
    await api.functional.auth.platformAdmin.login(connection, {
      body: platformAdminLoginInput,
    });
  typia.assert(platformAdminLoggedIn);

  // 8. As platformAdmin, update the post state to soft-remove and lock comments
  const newVisibilityState = "soft_removed";
  const newLockState = "locked_comments";
  const newArchivalState = "active";
  const newModerationState = "removed_policy_violation";
  const newModerationReason =
    "Post removed due to hate speech policy violation";

  const stateUpdateBody = {
    visibility_state: newVisibilityState,
    lock_state: newLockState,
    archival_state: newArchivalState,
    moderation_state: newModerationState,
    moderation_reason: newModerationReason,
  } satisfies ICommunityPlatformPostState.IUpdate;

  const updatedState: ICommunityPlatformPostState =
    await api.functional.communityPlatform.platformAdmin.posts.state.update(
      connection,
      {
        postId: post.id,
        body: stateUpdateBody,
      },
    );
  typia.assert(updatedState);

  // 9. Validate that the updated state matches the requested values and post
  TestValidator.equals(
    "post_id in updated state should match target post id",
    updatedState.post_id,
    post.id,
  );

  TestValidator.equals(
    "visibility_state should be soft_removed",
    updatedState.visibility_state,
    newVisibilityState,
  );

  TestValidator.equals(
    "lock_state should be locked_comments",
    updatedState.lock_state,
    newLockState,
  );

  TestValidator.equals(
    "archival_state should remain active",
    updatedState.archival_state,
    newArchivalState,
  );

  TestValidator.equals(
    "moderation_state should indicate policy violation removal",
    updatedState.moderation_state,
    newModerationState,
  );

  TestValidator.equals(
    "moderation_reason should match the provided explanation",
    updatedState.moderation_reason,
    newModerationReason,
  );
}
