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
 * Validate that platformAdmin-only post state read endpoint enforces role-based
 * access control.
 *
 * Business goal:
 *
 * - Only a properly authenticated platform administrator should be able to read a
 *   post's lifecycle/moderation state via GET
 *   /communityPlatform/platformAdmin/posts/{postId}/state.
 * - Anonymous callers and regular member users must not be able to access this
 *   privileged endpoint.
 *
 * End-to-end workflow:
 *
 * 1. Register a platform administrator (platformAdmin.join) and rely on the SDK to
 *    attach the access token to the connection.
 * 2. As platformAdmin, create a community visibility level master record.
 * 3. As platformAdmin, create a post type master record.
 * 4. Register a member user (memberUser.join), switching the connection's
 *    Authorization context to the member user.
 * 5. As memberUser, create a community referencing the visibility level by its
 *    business code.
 * 6. As memberUser, create a text post in that community using the created post
 *    type.
 * 7. Switch back to platformAdmin via login to regain admin Authorization.
 * 8. Optionally update the post's state once to set explicit lifecycle and
 *    moderation flags (visibility, lock, archival, moderation).
 * 9. Using an unauthenticated connection (no Authorization header), attempt to GET
 *    the post state and assert that an error is thrown.
 * 10. Using a memberUser-authenticated connection, attempt the same GET and assert
 *     that an error is thrown (memberUser cannot use platformAdmin state read
 *     endpoint).
 * 11. Using a platformAdmin-authenticated connection, GET the post state and assert
 *     success, verifying that:
 *
 *     - The response is a valid ICommunityPlatformPostState.
 *     - The `post_id` matches the created post's id.
 *     - If the state was updated in step 8, the returned state fields match the last
 *           update payload.
 */
export async function test_api_platform_admin_access_control_on_post_state_read(
  connection: api.IConnection,
) {
  // 1. Register platform admin (join) and keep credentials for later login
  const adminEmail: string & tags.Format<"email"> = typia.random<
    string & tags.Format<"email">
  >();
  const adminPassword = "AdminPass123!";
  const adminHref: string & tags.Format<"uri"> = typia.random<
    string & tags.Format<"uri">
  >();
  const adminReferrer: string & tags.Format<"uri"> = typia.random<
    string & tags.Format<"uri">
  >();

  const adminJoin = await api.functional.auth.platformAdmin.join(connection, {
    body: {
      username: RandomGenerator.alphabets(12),
      email: adminEmail,
      password: adminPassword,
      displayName: RandomGenerator.name(2),
      href: adminHref,
      referrer: adminReferrer,
    } satisfies ICommunityPlatformPlatformadmin.IJoin,
  });
  typia.assert<ICommunityPlatformPlatformadmin.IAuthorized>(adminJoin);

  // 2. As platformAdmin, create a visibility level master record
  const visibilityCode = `vis_${RandomGenerator.alphaNumeric(8)}`;
  const visibilityCreate =
    await api.functional.communityPlatform.platformAdmin.communityVisibilityLevels.create(
      connection,
      {
        body: {
          code: visibilityCode,
          name: "Public Test Visibility",
          description: RandomGenerator.paragraph({ sentences: 5 }),
        } satisfies ICommunityPlatformCommunityVisibilityLevel.ICreate,
      },
    );
  typia.assert<ICommunityPlatformCommunityVisibilityLevel>(visibilityCreate);

  // 3. As platformAdmin, create a post type master record
  const postTypeCode = `type_${RandomGenerator.alphaNumeric(8)}`;
  const postTypeCreate =
    await api.functional.communityPlatform.platformAdmin.postTypes.create(
      connection,
      {
        body: {
          code: postTypeCode,
          name: "Text Test Type",
          description: RandomGenerator.paragraph({ sentences: 4 }),
        } satisfies ICommunityPlatformPostType.ICreate,
      },
    );
  typia.assert<ICommunityPlatformPostType>(postTypeCreate);

  // 4. Register member user and switch Authorization to memberUser
  const memberEmail: string & tags.Format<"email"> = typia.random<
    string & tags.Format<"email">
  >();
  const memberPassword = "MemberPass123!";
  const memberHref: string & tags.Format<"uri"> = typia.random<
    string & tags.Format<"uri">
  >();
  const memberReferrer: string & tags.Format<"uri"> = typia.random<
    string & tags.Format<"uri">
  >();

  const memberJoin = await api.functional.auth.memberUser.join(connection, {
    body: {
      username: RandomGenerator.alphabets(10),
      email: memberEmail,
      password: memberPassword,
      ip: null,
      href: memberHref,
      referrer: memberReferrer,
    } satisfies ICommunityPlatformMemberuser.IJoinRequest,
  });
  typia.assert<ICommunityPlatformMemberuser.IAuthorized>(memberJoin);

  // 5. As memberUser, create a community using the visibility level code
  const communityCreate =
    await api.functional.communityPlatform.memberUser.communities.create(
      connection,
      {
        body: {
          identifier: `comm_${RandomGenerator.alphaNumeric(8)}`,
          title: RandomGenerator.paragraph({ sentences: 3 }),
          description: RandomGenerator.paragraph({ sentences: 8 }),
          visibilityLevelCode: visibilityCode,
          isNsfw: false,
          primaryTagIds: [],
        } satisfies ICommunityPlatformCommunity.ICreate,
      },
    );
  typia.assert<ICommunityPlatformCommunity>(communityCreate);

  // 6. As memberUser, create a text post in the created community
  const postCreate =
    await api.functional.communityPlatform.memberUser.posts.create(connection, {
      body: {
        community_id: communityCreate.id,
        post_type_id: postTypeCreate.id,
        title: RandomGenerator.paragraph({ sentences: 2 }),
        body: RandomGenerator.content({ paragraphs: 2 }),
        url: null,
        image_uri: null,
      } satisfies ICommunityPlatformPost.ICreate,
    });
  typia.assert<ICommunityPlatformPost>(postCreate);

  // 7. Switch back to platformAdmin via login
  const adminLoginHref: string & tags.Format<"uri"> = typia.random<
    string & tags.Format<"uri">
  >();
  const adminLoginReferrer: string & tags.Format<"uri"> = typia.random<
    string & tags.Format<"uri">
  >();

  const adminLogin = await api.functional.auth.platformAdmin.login(connection, {
    body: {
      identifier: adminEmail,
      password: adminPassword,
      ip: null,
      href: adminLoginHref,
      referrer: adminLoginReferrer,
    } satisfies ICommunityPlatformPlatformadmin.ILogin,
  });
  typia.assert<ICommunityPlatformPlatformadmin.IAuthorized>(adminLogin);

  // 8. Optionally update post state to a known configuration as platformAdmin
  const updatePayload = {
    visibility_state: "visible",
    lock_state: "unlocked",
    archival_state: "active",
    moderation_state: "none",
    moderation_reason: "initial state",
  } satisfies ICommunityPlatformPostState.IUpdate;

  const updatedState =
    await api.functional.communityPlatform.platformAdmin.posts.state.update(
      connection,
      {
        postId: postCreate.id,
        body: updatePayload,
      },
    );
  typia.assert<ICommunityPlatformPostState>(updatedState);

  // 9. Anonymous call: clone connection without Authorization header
  const anonymousConnection: api.IConnection = {
    ...connection,
    headers: {},
  };

  await TestValidator.error(
    "anonymous cannot read platformAdmin post state",
    async () => {
      await api.functional.communityPlatform.platformAdmin.posts.state.at(
        anonymousConnection,
        {
          postId: postCreate.id,
        },
      );
    },
  );

  // 10. Member user call: switch back to memberUser via login and attempt read
  const memberLoginHref: string & tags.Format<"uri"> = typia.random<
    string & tags.Format<"uri">
  >();
  const memberLoginReferrer: string & tags.Format<"uri"> = typia.random<
    string & tags.Format<"uri">
  >();

  const memberLogin = await api.functional.auth.memberUser.login(connection, {
    body: {
      identifier: memberEmail,
      password: memberPassword,
      ip: null,
      href: memberLoginHref,
      referrer: memberLoginReferrer,
    } satisfies ICommunityPlatformMemberuser.ILoginRequest,
  });
  typia.assert<ICommunityPlatformMemberuser.IAuthorized>(memberLogin);

  await TestValidator.error(
    "memberUser cannot read platformAdmin post state",
    async () => {
      await api.functional.communityPlatform.platformAdmin.posts.state.at(
        connection,
        {
          postId: postCreate.id,
        },
      );
    },
  );

  // 11. Platform admin call: login again as platformAdmin and assert success
  const adminLoginHref2: string & tags.Format<"uri"> = typia.random<
    string & tags.Format<"uri">
  >();
  const adminLoginReferrer2: string & tags.Format<"uri"> = typia.random<
    string & tags.Format<"uri">
  >();

  const adminLogin2 = await api.functional.auth.platformAdmin.login(
    connection,
    {
      body: {
        identifier: adminEmail,
        password: adminPassword,
        ip: null,
        href: adminLoginHref2,
        referrer: adminLoginReferrer2,
      } satisfies ICommunityPlatformPlatformadmin.ILogin,
    },
  );
  typia.assert<ICommunityPlatformPlatformadmin.IAuthorized>(adminLogin2);

  const finalState =
    await api.functional.communityPlatform.platformAdmin.posts.state.at(
      connection,
      {
        postId: postCreate.id,
      },
    );
  typia.assert<ICommunityPlatformPostState>(finalState);

  // Validate that state belongs to the created post and matches the last update
  TestValidator.equals(
    "post_id in state matches created post id",
    finalState.post_id,
    postCreate.id,
  );

  TestValidator.equals(
    "visibility_state matches update payload",
    finalState.visibility_state,
    updatePayload.visibility_state,
  );
  TestValidator.equals(
    "lock_state matches update payload",
    finalState.lock_state,
    updatePayload.lock_state,
  );
  TestValidator.equals(
    "archival_state matches update payload",
    finalState.archival_state,
    updatePayload.archival_state,
  );
  TestValidator.equals(
    "moderation_state matches update payload",
    finalState.moderation_state,
    updatePayload.moderation_state,
  );
  TestValidator.equals(
    "moderation_reason matches update payload",
    finalState.moderation_reason,
    updatePayload.moderation_reason,
  );
}
