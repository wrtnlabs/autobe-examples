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
 * E2E: platform admin hard-deletes a member user post.
 *
 * This test covers a full multi-actor workflow to validate that a platform
 * administrator can permanently delete an arbitrary post, regardless of the
 * community or author, using the platformAdmin posts.erase endpoint.
 *
 * Steps:
 *
 * 1. Register a platform admin (join) and obtain tokens (implicitly attached to
 *    the shared connection).
 * 2. As platform admin, create a visibility level master record that can be
 *    referenced when creating a community.
 * 3. As platform admin, create a post type master record to be used when creating
 *    the member post.
 * 4. Register a member user; this switches the Authorization header on the shared
 *    connection to the member actor.
 * 5. As member user, create a community that uses the visibility level from step
 *    2.
 * 6. As member user, create a post in that community using the post type from step
 *    3; capture its id.
 * 7. Switch back to the platform admin actor by logging in with the admin
 *    credentials created in step 1.
 * 8. As platform admin, call posts.erase(postId) for the post created in step 6
 *    and ensure it succeeds (no error thrown).
 * 9. Attempt to delete the same post id again and assert that the second call
 *    fails using TestValidator.error, which demonstrates that the post is no
 *    longer considered present by the erase endpoint.
 *
 * API/DTO usage summary:
 *
 * - POST /auth/platformAdmin/join -> ICommunityPlatformPlatformadmin.IJoin /
 *   ICommunityPlatformPlatformadmin.IAuthorized
 * - POST /communityPlatform/platformAdmin/communityVisibilityLevels ->
 *   ICommunityPlatformCommunityVisibilityLevel.ICreate /
 *   ICommunityPlatformCommunityVisibilityLevel
 * - POST /communityPlatform/platformAdmin/postTypes ->
 *   ICommunityPlatformPostType.ICreate / ICommunityPlatformPostType
 * - POST /auth/memberUser/join -> ICommunityPlatformMemberuser.IJoinRequest /
 *   ICommunityPlatformMemberuser.IAuthorized
 * - POST /communityPlatform/memberUser/communities ->
 *   ICommunityPlatformCommunity.ICreate / ICommunityPlatformCommunity
 * - POST /communityPlatform/memberUser/posts -> ICommunityPlatformPost.ICreate /
 *   ICommunityPlatformPost
 * - POST /auth/platformAdmin/login -> ICommunityPlatformPlatformadmin.ILogin /
 *   ICommunityPlatformPlatformadmin.IAuthorized (for role switching)
 * - DELETE /communityPlatform/platformAdmin/posts/{postId} -> void
 */
export async function test_api_platform_admin_hard_delete_post(
  connection: api.IConnection,
) {
  // 1. Register platform admin (join)
  const adminEmail: string & tags.Format<"email"> = typia.random<
    string & tags.Format<"email">
  >();
  const adminPassword: string = RandomGenerator.alphaNumeric(12);

  const adminJoinBody = {
    username: RandomGenerator.alphabets(12),
    email: adminEmail,
    password: adminPassword,
    displayName: RandomGenerator.name(),
    // ip is optional (string | undefined); omit it instead of passing null
    href: "https://admin.example.com/register",
    referrer: "https://admin.example.com/landing",
  } satisfies ICommunityPlatformPlatformadmin.IJoin;

  const adminAuthorizedFromJoin: ICommunityPlatformPlatformadmin.IAuthorized =
    await api.functional.auth.platformAdmin.join(connection, {
      body: adminJoinBody,
    });
  typia.assert(adminAuthorizedFromJoin);

  // 2. Create visibility level as platform admin
  const visibilityCode = `vis_${RandomGenerator.alphaNumeric(8)}`;
  const visibilityCreateBody = {
    code: visibilityCode,
    name: "Public Visibility",
    description: RandomGenerator.paragraph({ sentences: 4 }),
  } satisfies ICommunityPlatformCommunityVisibilityLevel.ICreate;

  const visibilityLevel: ICommunityPlatformCommunityVisibilityLevel =
    await api.functional.communityPlatform.platformAdmin.communityVisibilityLevels.create(
      connection,
      {
        body: visibilityCreateBody,
      },
    );
  typia.assert(visibilityLevel);
  TestValidator.equals(
    "visibility code should match request",
    visibilityLevel.code,
    visibilityCode,
  );

  // 3. Create post type as platform admin
  const postTypeCode = `type_${RandomGenerator.alphaNumeric(8)}`;
  const postTypeCreateBody = {
    code: postTypeCode,
    name: "Text Post",
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
    "post type code should match request",
    postType.code,
    postTypeCode,
  );

  // 4. Register member user (join) - switches connection to memberUser actor
  const memberEmail: string & tags.Format<"email"> = typia.random<
    string & tags.Format<"email">
  >();
  const memberPassword: string = RandomGenerator.alphaNumeric(12);

  const memberJoinBody = {
    username: RandomGenerator.alphabets(10),
    email: memberEmail,
    password: memberPassword,
    ip: null,
    href: "https://community.example.com/join",
    referrer: "https://community.example.com/home",
  } satisfies ICommunityPlatformMemberuser.IJoinRequest;

  const memberAuthorized: ICommunityPlatformMemberuser.IAuthorized =
    await api.functional.auth.memberUser.join(connection, {
      body: memberJoinBody,
    });
  typia.assert(memberAuthorized);

  // 5. Create community as member user
  const communityIdentifier = `community_${RandomGenerator.alphaNumeric(6)}`;
  const communityTitle = RandomGenerator.paragraph({ sentences: 3 });

  const communityCreateBody = {
    identifier: communityIdentifier,
    title: communityTitle,
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
    "community identifier should match request",
    community.identifier,
    communityIdentifier,
  );

  // 6. Create post in that community as member user
  const postTitle = RandomGenerator.paragraph({ sentences: 2 });
  const postBody = RandomGenerator.paragraph({ sentences: 10 });

  const postCreateBody = {
    community_id: community.id,
    post_type_id: postType.id,
    title: postTitle,
    body: postBody,
    url: null,
    image_uri: null,
  } satisfies ICommunityPlatformPost.ICreate;

  const post: ICommunityPlatformPost =
    await api.functional.communityPlatform.memberUser.posts.create(connection, {
      body: postCreateBody,
    });
  typia.assert(post);
  TestValidator.equals(
    "post community should match created community",
    post.community.id,
    community.id,
  );
  TestValidator.equals(
    "post type should match created post type",
    post.postType.id,
    postType.id,
  );

  // 7. Switch back to platform admin via login (actor switching)
  const adminLoginBody = {
    identifier: adminEmail,
    password: adminPassword,
    ip: null,
    href: "https://admin.example.com/login",
    referrer: "https://admin.example.com/dashboard",
  } satisfies ICommunityPlatformPlatformadmin.ILogin;

  const adminAuthorizedFromLogin: ICommunityPlatformPlatformadmin.IAuthorized =
    await api.functional.auth.platformAdmin.login(connection, {
      body: adminLoginBody,
    });
  typia.assert(adminAuthorizedFromLogin);

  // 8. First delete: platform admin hard-deletes the post
  await api.functional.communityPlatform.platformAdmin.posts.erase(connection, {
    postId: post.id,
  });

  // 9. Second delete should fail, demonstrating that the post is no longer
  // deletable and thus treated as non-existent by the erase endpoint.
  await TestValidator.error(
    "second hard delete on same post should fail",
    async () => {
      await api.functional.communityPlatform.platformAdmin.posts.erase(
        connection,
        {
          postId: post.id,
        },
      );
    },
  );
}
