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
 * Validate that creating a post fails when referencing a non-existent
 * post_type_id.
 *
 * Business context: A memberUser can create posts in a community only when all
 * referenced foreign keys are valid. In particular,
 * community_platform_posts.post_type_id must reference an existing row in
 * community_platform_post_types. Even if the community_id and the authenticated
 * memberUser are valid, the service must reject post creation when post_type_id
 * is unknown.
 *
 * End-to-end steps:
 *
 * 1. Register a memberUser (author) via /auth/memberUser/join.
 * 2. Register a platformAdmin and create a community visibility level via
 *    /communityPlatform/platformAdmin/communityVisibilityLevels.
 * 3. As memberUser, create a community that uses the created visibility level.
 * 4. Build a post creation payload with the valid community_id but a random UUID
 *    as post_type_id that should not correspond to any existing post type.
 * 5. Call /communityPlatform/memberUser/posts and assert that it fails.
 */
export async function test_api_post_creation_invalid_post_type_reference(
  connection: api.IConnection,
) {
  // 1. Register member user (author)
  const memberJoinBody = {
    username: RandomGenerator.alphabets(12),
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(16),
    // Keep ip null to exercise nullable handling; href/referrer must be valid URIs
    ip: null,
    href: "https://member.example.com/join",
    referrer: "https://member.example.com/landing",
  } satisfies ICommunityPlatformMemberuser.IJoinRequest;

  const memberAuthorized: ICommunityPlatformMemberuser.IAuthorized =
    await api.functional.auth.memberUser.join(connection, {
      body: memberJoinBody,
    });
  typia.assert(memberAuthorized);

  // Basic sanity check on returned member auth
  TestValidator.equals(
    "member username should match join request",
    memberAuthorized.username,
    memberJoinBody.username,
  );

  // 2. Register platform admin and create a visibility level
  const platformAdminJoinBody = {
    username: RandomGenerator.alphabets(10),
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(16),
    displayName: RandomGenerator.name(),
    ip: RandomGenerator.alphaNumeric(8),
    href: "https://admin.example.com/join",
    referrer: "https://admin.example.com/landing",
  } satisfies ICommunityPlatformPlatformadmin.IJoin;

  const platformAdminAuthorized: ICommunityPlatformPlatformadmin.IAuthorized =
    await api.functional.auth.platformAdmin.join(connection, {
      body: platformAdminJoinBody,
    });
  typia.assert(platformAdminAuthorized);

  // Create a visibility level as platformAdmin
  const visibilityCode = `vis-${RandomGenerator.alphaNumeric(8)}`;

  const visibilityCreateBody = {
    code: visibilityCode,
    name: `Visibility ${RandomGenerator.name(1)}`,
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

  TestValidator.equals(
    "created visibility level code should match input",
    visibilityLevel.code,
    visibilityCreateBody.code,
  );

  // 3. Switch back to memberUser (author) context.
  // SDK already set Authorization header to the platformAdmin token when we
  // called platformAdmin.join, so we must log the memberUser in again.
  const memberLoginBody = {
    identifier: memberJoinBody.email,
    password: memberJoinBody.password,
    ip: null,
    href: "https://member.example.com/login",
    referrer: "https://member.example.com/landing",
  } satisfies ICommunityPlatformMemberuser.ILoginRequest;

  const memberLoggedIn: ICommunityPlatformMemberuser.IAuthorized =
    await api.functional.auth.memberUser.login(connection, {
      body: memberLoginBody,
    });
  typia.assert(memberLoggedIn);

  TestValidator.equals(
    "logged-in member id should match joined member id",
    memberLoggedIn.id,
    memberAuthorized.id,
  );

  // 4. Create a community with that visibility level as memberUser
  const communityIdentifier = `comm-${RandomGenerator.alphaNumeric(10)}`;

  const communityCreateBody = {
    identifier: communityIdentifier,
    title: `Community ${RandomGenerator.name(2)}`,
    description: RandomGenerator.paragraph({ sentences: 8 }),
    visibilityLevelCode: visibilityCode,
    isNsfw: false,
    // No primary tags configured for this test
    primaryTagIds: undefined,
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
    "community identifier should match create body",
    community.identifier,
    communityCreateBody.identifier,
  );

  TestValidator.equals(
    "community visibility level code should match created visibility code",
    community.visibilityLevel.code,
    visibilityCode,
  );

  // 5. Try to create a post with a non-existent post_type_id
  const invalidPostTypeId: string & tags.Format<"uuid"> = typia.random<
    string & tags.Format<"uuid">
  >();

  const postCreateBody = {
    community_id: community.id,
    post_type_id: invalidPostTypeId,
    title: `Post with invalid post type ${RandomGenerator.name(2)}`,
    body: RandomGenerator.paragraph({ sentences: 10 }),
    url: undefined,
    image_uri: undefined,
  } satisfies ICommunityPlatformPost.ICreate;

  await TestValidator.error(
    "post creation with invalid post_type_id should fail",
    async () => {
      await api.functional.communityPlatform.memberUser.posts.create(
        connection,
        {
          body: postCreateBody,
        },
      );
    },
  );
}
