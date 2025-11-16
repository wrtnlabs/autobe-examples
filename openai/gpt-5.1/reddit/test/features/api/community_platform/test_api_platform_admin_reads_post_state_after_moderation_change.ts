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
 * Validate that a platform administrator can read the up-to-date lifecycle and
 * moderation state of a post after performing a moderation change.
 *
 * Business workflow:
 *
 * 1. Register a platform admin (join) and let the SDK attach its access token to
 *    the shared connection.
 * 2. As platformAdmin, create a visibility level that communities can use (e.g.,
 *    code "public").
 * 3. Register a member user (join); this switches the connection to memberUser
 *    context.
 * 4. As memberUser, create a community referencing the visibility level code from
 *    step 2.
 * 5. Switch back to platformAdmin (login).
 * 6. As platformAdmin, create a post type (e.g., "text").
 * 7. Switch to memberUser (login) and create a post in the community using that
 *    post type.
 * 8. Switch to platformAdmin and update the post state via the admin state.update
 *    endpoint, setting visibility_state, lock_state, archival_state,
 *    moderation_state, and moderation_reason to non-default values.
 * 9. Still as platformAdmin, read the post state via the admin state.at endpoint.
 * 10. Assert that the read state matches the updated state (same post_id and state
 *     fields) and that created_at/updated_at are present with updated_at >=
 *     created_at.
 */
export async function test_api_platform_admin_reads_post_state_after_moderation_change(
  connection: api.IConnection,
) {
  // 1. Platform admin join (also authenticates the connection as platformAdmin)
  const platformAdminEmail: string & tags.Format<"email"> = typia.random<
    string & tags.Format<"email">
  >();
  const platformAdminPassword: string = RandomGenerator.alphaNumeric(12);

  const platformAdminJoin: ICommunityPlatformPlatformadmin.IAuthorized =
    await api.functional.auth.platformAdmin.join(connection, {
      body: {
        username: RandomGenerator.name(1),
        email: platformAdminEmail,
        password: platformAdminPassword,
        displayName: RandomGenerator.name(),
        // ip is optional string; omit it instead of sending null
        href: typia.random<string & tags.Format<"uri">>(),
        referrer: typia.random<string & tags.Format<"uri">>(),
      } satisfies ICommunityPlatformPlatformadmin.IJoin,
    });
  typia.assert(platformAdminJoin);

  // 2. Create a community visibility level as platformAdmin
  const visibilityCode = "public";
  const visibilityLevelCreateBody = {
    code: visibilityCode,
    name: "Public",
    description: RandomGenerator.paragraph({ sentences: 3 }),
  } satisfies ICommunityPlatformCommunityVisibilityLevel.ICreate;

  const visibilityLevel: ICommunityPlatformCommunityVisibilityLevel =
    await api.functional.communityPlatform.platformAdmin.communityVisibilityLevels.create(
      connection,
      {
        body: visibilityLevelCreateBody,
      },
    );
  typia.assert(visibilityLevel);

  // 3. Register a member user (join) which authenticates as memberUser
  const memberEmail: string & tags.Format<"email"> = typia.random<
    string & tags.Format<"email">
  >();
  const memberPassword: string = RandomGenerator.alphaNumeric(12);

  const memberJoin: ICommunityPlatformMemberuser.IAuthorized =
    await api.functional.auth.memberUser.join(connection, {
      body: {
        username: RandomGenerator.name(1),
        email: memberEmail,
        password: memberPassword,
        ip: null,
        href: typia.random<string & tags.Format<"uri">>(),
        referrer: typia.random<string & tags.Format<"uri">>(),
      } satisfies ICommunityPlatformMemberuser.IJoinRequest,
    });
  typia.assert(memberJoin);

  // 4. As memberUser, create a community using the visibility level code
  const communityCreateBody = {
    identifier: RandomGenerator.alphaNumeric(12),
    title: RandomGenerator.paragraph({ sentences: 2 }),
    description: RandomGenerator.paragraph({ sentences: 5 }),
    visibilityLevelCode: visibilityCode,
    isNsfw: false,
    primaryTagIds: [],
  } satisfies ICommunityPlatformCommunity.ICreate;

  const community: ICommunityPlatformCommunity =
    await api.functional.communityPlatform.memberUser.communities.create(
      connection,
      { body: communityCreateBody },
    );
  typia.assert(community);

  // 5. Switch back to platformAdmin via login
  const platformAdminLogin: ICommunityPlatformPlatformadmin.IAuthorized =
    await api.functional.auth.platformAdmin.login(connection, {
      body: {
        identifier: platformAdminEmail,
        password: platformAdminPassword,
        ip: null,
        href: typia.random<string & tags.Format<"uri">>(),
        referrer: typia.random<string & tags.Format<"uri">>(),
      } satisfies ICommunityPlatformPlatformadmin.ILogin,
    });
  typia.assert(platformAdminLogin);

  // 6. Create a post type as platformAdmin
  const postTypeCode = "text";
  const postTypeCreateBody = {
    code: postTypeCode,
    name: "Text Post",
    description: RandomGenerator.paragraph({ sentences: 4 }),
  } satisfies ICommunityPlatformPostType.ICreate;

  const postType: ICommunityPlatformPostType =
    await api.functional.communityPlatform.platformAdmin.postTypes.create(
      connection,
      {
        body: postTypeCreateBody,
      },
    );
  typia.assert(postType);

  // 7. Switch to memberUser via login and create a post in the community
  const memberLogin: ICommunityPlatformMemberuser.IAuthorized =
    await api.functional.auth.memberUser.login(connection, {
      body: {
        identifier: memberEmail,
        password: memberPassword,
        ip: null,
        href: typia.random<string & tags.Format<"uri">>(),
        referrer: typia.random<string & tags.Format<"uri">>(),
      } satisfies ICommunityPlatformMemberuser.ILoginRequest,
    });
  typia.assert(memberLogin);

  const postCreateBody = {
    community_id: community.id,
    post_type_id: postType.id,
    title: RandomGenerator.paragraph({ sentences: 2 }),
    body: RandomGenerator.content({ paragraphs: 2 }),
    url: null,
    image_uri: null,
  } satisfies ICommunityPlatformPost.ICreate;

  const post: ICommunityPlatformPost =
    await api.functional.communityPlatform.memberUser.posts.create(connection, {
      body: postCreateBody,
    });
  typia.assert(post);

  // 8. Switch back to platformAdmin and update the post state
  const platformAdminRelogin: ICommunityPlatformPlatformadmin.IAuthorized =
    await api.functional.auth.platformAdmin.login(connection, {
      body: {
        identifier: platformAdminEmail,
        password: platformAdminPassword,
        ip: null,
        href: typia.random<string & tags.Format<"uri">>(),
        referrer: typia.random<string & tags.Format<"uri">>(),
      } satisfies ICommunityPlatformPlatformadmin.ILogin,
    });
  typia.assert(platformAdminRelogin);

  const desiredState = {
    visibility_state: "soft_removed",
    lock_state: "locked_comments",
    archival_state: "archived_readonly",
    moderation_state: "removed_policy_violation",
    moderation_reason: RandomGenerator.paragraph({ sentences: 3 }),
  } satisfies ICommunityPlatformPostState.IUpdate;

  const updatedState: ICommunityPlatformPostState =
    await api.functional.communityPlatform.platformAdmin.posts.state.update(
      connection,
      {
        postId: post.id,
        body: desiredState,
      },
    );
  typia.assert(updatedState);

  // 9. Read the post state via admin at()
  const readState: ICommunityPlatformPostState =
    await api.functional.communityPlatform.platformAdmin.posts.state.at(
      connection,
      { postId: post.id },
    );
  typia.assert(readState);

  // 10. Assertions on state correctness and timestamps
  TestValidator.equals(
    "post_id in state should match post.id",
    readState.post_id,
    post.id,
  );

  TestValidator.equals(
    "visibility_state should match updated value",
    readState.visibility_state,
    updatedState.visibility_state,
  );
  TestValidator.equals(
    "lock_state should match updated value",
    readState.lock_state,
    updatedState.lock_state,
  );
  TestValidator.equals(
    "archival_state should match updated value",
    readState.archival_state,
    updatedState.archival_state,
  );
  TestValidator.equals(
    "moderation_state should match updated value",
    readState.moderation_state,
    updatedState.moderation_state,
  );
  TestValidator.equals(
    "moderation_reason should match updated value",
    readState.moderation_reason,
    updatedState.moderation_reason,
  );

  TestValidator.predicate(
    "created_at must be a non-empty string",
    readState.created_at.length > 0,
  );
  TestValidator.predicate(
    "updated_at must be a non-empty string",
    readState.updated_at.length > 0,
  );

  const createdAtDate = new Date(readState.created_at);
  const updatedAtDate = new Date(readState.updated_at);
  TestValidator.predicate(
    "updated_at must be >= created_at",
    updatedAtDate.getTime() >= createdAtDate.getTime(),
  );
}
