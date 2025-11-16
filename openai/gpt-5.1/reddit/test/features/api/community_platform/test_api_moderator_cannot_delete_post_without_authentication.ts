import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformAccountStatus } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAccountStatus";
import type { ICommunityPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunity";
import type { ICommunityPlatformCommunityModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunityModerator";
import type { ICommunityPlatformCommunityVisibilityLevel } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunityVisibilityLevel";
import type { ICommunityPlatformMemberuser } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMemberuser";
import type { ICommunityPlatformPlatformadmin } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformPlatformadmin";
import type { ICommunityPlatformPost } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformPost";
import type { ICommunityPlatformPostState } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformPostState";
import type { ICommunityPlatformPostType } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformPostType";

/**
 * Verify that community moderator hard delete endpoint cannot be used without
 * authentication.
 *
 * Business goal:
 *
 * - Ensure that anonymous or unauthenticated clients cannot perform destructive
 *   moderation operations such as hard-deleting posts.
 *
 * High-level flow:
 *
 * 1. Provision minimal master data as platformAdmin:
 *
 *    - Create a community visibility level
 *    - Create a post type
 * 2. Register and log in as a memberUser.
 * 3. As memberUser, create a community using the created visibility level.
 * 4. As memberUser, create a post in that community using the created post type.
 * 5. Build an unauthenticated connection by cloning the base connection but
 *    clearing headers, to simulate a completely anonymous client.
 * 6. Attempt to call the moderator hard delete endpoint
 *    `/communityPlatform/communityModerator/posts/{postId}` using the
 *    unauthenticated connection.
 * 7. Assert that the erase call fails by using `TestValidator.error` without
 *    checking exact HTTP status codes.
 *
 * Notes:
 *
 * - We must not mutate `connection.headers` in this test; only the SDK’s auth
 *   functions are allowed to manage headers on the original connection.
 * - Because no post-read endpoint is exposed in the function list, we cannot
 *   re-fetch the post to verify persistence. This test focuses purely on the
 *   authorization failure of the unauthenticated delete attempt.
 */
export async function test_api_moderator_cannot_delete_post_without_authentication(
  connection: api.IConnection,
) {
  // 1. Register and login a platform admin to create master data.
  const platformAdminJoinBody = {
    username: RandomGenerator.alphabets(12),
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(16),
    displayName: RandomGenerator.name(),
    ip: RandomGenerator.alphabets(10),
    href: "https://admin.example.com/join",
    referrer: "https://admin.example.com/landing",
  } satisfies ICommunityPlatformPlatformadmin.IJoin;

  const platformAdmin: ICommunityPlatformPlatformadmin.IAuthorized =
    await api.functional.auth.platformAdmin.join(connection, {
      body: platformAdminJoinBody,
    });
  typia.assert(platformAdmin);

  // 2. Create a visibility level as platformAdmin.
  const visibilityCreateBody = {
    code: `public-${RandomGenerator.alphabets(8)}`,
    name: "Public",
    description: "Publicly visible community",
  } satisfies ICommunityPlatformCommunityVisibilityLevel.ICreate;

  const visibility: ICommunityPlatformCommunityVisibilityLevel =
    await api.functional.communityPlatform.platformAdmin.communityVisibilityLevels.create(
      connection,
      {
        body: visibilityCreateBody,
      },
    );
  typia.assert(visibility);

  // 3. Create a post type as platformAdmin.
  const postTypeCreateBody = {
    code: `text-${RandomGenerator.alphabets(8)}`,
    name: "Text",
    description: "Simple text post type for community posts",
  } satisfies ICommunityPlatformPostType.ICreate;

  const postType: ICommunityPlatformPostType =
    await api.functional.communityPlatform.platformAdmin.postTypes.create(
      connection,
      {
        body: postTypeCreateBody,
      },
    );
  typia.assert(postType);

  // 4. Register and login a member user who will create the post.
  const memberJoinBody = {
    username: RandomGenerator.alphabets(10),
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(16),
    ip: null,
    href: "https://app.example.com/signup",
    referrer: "https://app.example.com/landing",
  } satisfies ICommunityPlatformMemberuser.IJoinRequest;

  const member: ICommunityPlatformMemberuser.IAuthorized =
    await api.functional.auth.memberUser.join(connection, {
      body: memberJoinBody,
    });
  typia.assert(member);

  const memberLoginBody = {
    identifier: member.email,
    password: memberJoinBody.password,
    ip: null,
    href: "https://app.example.com/login",
    referrer: "https://app.example.com/landing",
  } satisfies ICommunityPlatformMemberuser.ILoginRequest;

  const memberLoggedIn: ICommunityPlatformMemberuser.IAuthorized =
    await api.functional.auth.memberUser.login(connection, {
      body: memberLoginBody,
    });
  typia.assert(memberLoggedIn);

  // 5. As memberUser, create a community.
  const communityCreateBody = {
    identifier: `community-${RandomGenerator.alphabets(8)}`,
    title: RandomGenerator.name(3),
    description: RandomGenerator.paragraph({ sentences: 6 }),
    visibilityLevelCode: visibility.code,
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

  // 6. As memberUser, create a post in that community.
  const postCreateBody = {
    community_id: community.id,
    post_type_id: postType.id,
    title: RandomGenerator.paragraph({ sentences: 3 }),
    body: RandomGenerator.content({ paragraphs: 2 }),
    url: null,
    image_uri: null,
  } satisfies ICommunityPlatformPost.ICreate;

  const post: ICommunityPlatformPost =
    await api.functional.communityPlatform.memberUser.posts.create(connection, {
      body: postCreateBody,
    });
  typia.assert(post);

  // 7. Build an unauthenticated connection by cloning the base connection but
  //    clearing headers to remove the Authorization header set by join/login
  //    flows.
  const unauthenticatedConnection: api.IConnection = {
    ...connection,
    headers: {},
  };

  // 8. Attempt to hard delete the post as an unauthenticated client and
  //    assert that this fails.
  await TestValidator.error(
    "unauthenticated moderator erase must fail",
    async () => {
      await api.functional.communityPlatform.communityModerator.posts.erase(
        unauthenticatedConnection,
        {
          postId: post.id,
        },
      );
    },
  );
}
