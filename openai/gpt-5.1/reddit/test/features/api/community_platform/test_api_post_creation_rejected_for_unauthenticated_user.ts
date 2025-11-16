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
 * Validate that unauthenticated callers cannot create posts.
 *
 * Business context:
 *
 * - The POST /communityPlatform/memberUser/posts endpoint is protected by the
 *   memberUser authorization actor and must only be callable by authenticated
 *   member users.
 * - Even when all referenced IDs (community, post type) are valid, the backend
 *   must reject post creation attempts that do not carry a valid memberUser
 *   authentication context.
 *
 * Scenario steps:
 *
 * 1. Register and implicitly authenticate a platformAdmin using
 *    /auth/platformAdmin/join.
 * 2. As platformAdmin, create a community visibility level using
 *    /communityPlatform/platformAdmin/communityVisibilityLevels.create.
 * 3. Register and authenticate a memberUser via /auth/memberUser/join.
 * 4. As that memberUser, create a community using
 *    /communityPlatform/memberUser/communities.create, referencing the
 *    previously created visibility level via its code.
 * 5. Switch back to platformAdmin (if needed) and create a post type using
 *    /communityPlatform/platformAdmin/postTypes.create.
 * 6. Derive an unauthenticated connection from the original connection by clearing
 *    Authorization headers.
 * 7. Using the unauthenticated connection, attempt to create a post via
 *    /communityPlatform/memberUser/posts.create with a syntactically correct
 *    ICommunityPlatformPost.ICreate body referencing the valid community_id and
 *    post_type_id.
 * 8. Assert that the post creation call fails with an error (authorization
 *    failure) using TestValidator.error, without checking explicit HTTP status
 *    codes.
 */
export async function test_api_post_creation_rejected_for_unauthenticated_user(
  connection: api.IConnection,
) {
  // 1. Register and authenticate a platform admin
  const platformAdminJoinBody = {
    username: RandomGenerator.name(1),
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(16),
    displayName: RandomGenerator.name(),
    ip: "127.0.0.1",
    href: "https://admin.console.local/join",
    referrer: "https://admin.console.local/landing",
  } satisfies ICommunityPlatformPlatformadmin.IJoin;

  const platformAdminAuthorized: ICommunityPlatformPlatformadmin.IAuthorized =
    await api.functional.auth.platformAdmin.join(connection, {
      body: platformAdminJoinBody,
    });
  typia.assert(platformAdminAuthorized);

  // 2. Create a visibility level as platformAdmin
  const visibilityCode = `public-${RandomGenerator.alphaNumeric(8)}`;
  const visibilityCreateBody = {
    code: visibilityCode,
    name: "Public Visibility",
    description: RandomGenerator.paragraph({ sentences: 5 }),
  } satisfies ICommunityPlatformCommunityVisibilityLevel.ICreate;

  const visibilityLevel: ICommunityPlatformCommunityVisibilityLevel =
    await api.functional.communityPlatform.platformAdmin.communityVisibilityLevels.create(
      connection,
      {
        body: visibilityCreateBody,
      },
    );
  typia.assert(visibilityLevel);

  // 3. Register and authenticate a member user
  const memberUserJoinBody = {
    username: RandomGenerator.name(1),
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(16),
    ip: "127.0.0.1",
    href: "https://app.local/join",
    referrer: "https://app.local/home",
  } satisfies ICommunityPlatformMemberuser.IJoinRequest;

  const memberUserAuthorized: ICommunityPlatformMemberuser.IAuthorized =
    await api.functional.auth.memberUser.join(connection, {
      body: memberUserJoinBody,
    });
  typia.assert(memberUserAuthorized);

  // 4. As memberUser, create a community that uses the created visibility level
  const communityCreateBody = {
    identifier: `community-${RandomGenerator.alphaNumeric(8)}`,
    title: RandomGenerator.paragraph({ sentences: 3 }),
    description: RandomGenerator.paragraph({ sentences: 8 }),
    visibilityLevelCode: visibilityLevel.code,
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

  // 5. Switch back to platformAdmin and create a post type
  const platformAdminLoginBody = {
    identifier: platformAdminJoinBody.email,
    password: platformAdminJoinBody.password,
    ip: "127.0.0.1",
    href: "https://admin.console.local/login",
    referrer: "https://admin.console.local/home",
  } satisfies ICommunityPlatformPlatformadmin.ILogin;

  const platformAdminAfterLogin: ICommunityPlatformPlatformadmin.IAuthorized =
    await api.functional.auth.platformAdmin.login(connection, {
      body: platformAdminLoginBody,
    });
  typia.assert(platformAdminAfterLogin);

  const postTypeCode = `text-${RandomGenerator.alphaNumeric(6)}`;
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

  // 6. Build an unauthenticated connection by removing Authorization header
  const unauthenticatedConnection: api.IConnection = {
    ...connection,
    headers: {},
  };

  // 7. Attempt to create a post without memberUser authentication
  const unauthenticatedPostCreateBody = {
    community_id: community.id,
    post_type_id: postType.id,
    title: RandomGenerator.paragraph({ sentences: 4 }),
    body: RandomGenerator.content({ paragraphs: 2 }),
    url: null,
    image_uri: null,
  } satisfies ICommunityPlatformPost.ICreate;

  await TestValidator.error(
    "unauthenticated post creation must be rejected",
    async () => {
      await api.functional.communityPlatform.memberUser.posts.create(
        unauthenticatedConnection,
        {
          body: unauthenticatedPostCreateBody,
        },
      );
    },
  );
}
