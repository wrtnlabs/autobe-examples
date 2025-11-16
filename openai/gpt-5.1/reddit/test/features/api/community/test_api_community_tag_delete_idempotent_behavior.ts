import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformAccountStatus } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAccountStatus";
import type { ICommunityPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunity";
import type { ICommunityPlatformCommunityModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunityModerator";
import type { ICommunityPlatformCommunityTag } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunityTag";
import type { ICommunityPlatformCommunityVisibilityLevel } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunityVisibilityLevel";
import type { ICommunityPlatformMemberuser } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMemberuser";
import type { ICommunityPlatformPlatformadmin } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformPlatformadmin";

/**
 * Validate idempotent-like delete behavior for community tags.
 *
 * Business intent:
 *
 * - Ensure that deleting a valid tag association works for an authorized
 *   community moderator
 * - Ensure that attempting to delete a non-existent tag for the same community
 *   does not corrupt data and is safely handled by the backend
 * - Ensure that authorization is enforced in practice by exercising the
 *   communityModerator actor for tag deletion
 *
 * Flow implemented (using only available SDK functions):
 *
 * 1. Register and login a platformAdmin.
 * 2. As platformAdmin, create a community visibility level.
 * 3. Register and login a memberUser.
 * 4. As memberUser, create a community using the visibility level code.
 * 5. Register and login a communityModerator.
 * 6. As communityModerator, create an initial tag for the community.
 * 7. Delete that existing tag (happy path) and confirm that the call succeeds
 *    without throwing.
 * 8. Generate a random UUID different from the deleted tag id and attempt to
 *    delete that non-existent tag using TestValidator.error to assert that an
 *    error is raised (without checking HTTP status codes).
 * 9. After the failed delete, create another tag for the same community to
 *    demonstrate that the system remains consistent and accepts new tag
 *    operations.
 *
 * Adjustments vs. the natural-language scenario:
 *
 * - We do not assert specific HTTP status codes (such as 404); instead we only
 *   assert that an error occurs when deleting a non-existent tag, using
 *   TestValidator.error.
 * - There is no tag listing API in the provided SDK, so we verify that valid data
 *   is not corrupted by successfully creating another tag after the
 *   non-existent delete attempt rather than by re-listing tags.
 * - No type-error tests are implemented; all DTOs and API calls use correct types
 *   and shapes.
 */
export async function test_api_community_tag_delete_idempotent_behavior(
  connection: api.IConnection,
) {
  // 1. Register platformAdmin and obtain authorized admin context
  const platformAdminJoinBody = {
    username: RandomGenerator.alphabets(12),
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(16),
    displayName: RandomGenerator.name(),
    ip: "127.0.0.1",
    href: "https://admin.console.local/register",
    referrer: "https://admin.console.local/landing",
  } satisfies ICommunityPlatformPlatformadmin.IJoin;

  const platformAdminAuthorized: ICommunityPlatformPlatformadmin.IAuthorized =
    await api.functional.auth.platformAdmin.join(connection, {
      body: platformAdminJoinBody,
    });
  typia.assert(platformAdminAuthorized);

  // 2. Explicit login as platformAdmin (exercise login flow and token wiring)
  const platformAdminLoginBody = {
    identifier: platformAdminJoinBody.email,
    password: platformAdminJoinBody.password,
    ip: "127.0.0.1",
    href: "https://admin.console.local/login",
    referrer: "https://admin.console.local/landing",
  } satisfies ICommunityPlatformPlatformadmin.ILogin;

  const platformAdminLoginResult: ICommunityPlatformPlatformadmin.IAuthorized =
    await api.functional.auth.platformAdmin.login(connection, {
      body: platformAdminLoginBody,
    });
  typia.assert(platformAdminLoginResult);

  // 3. As platformAdmin, create a new visibility level
  const visibilityCode = `public-${RandomGenerator.alphabets(8)}`;
  const visibilityCreateBody = {
    code: visibilityCode,
    name: `Public ${RandomGenerator.name(1)}`,
    description: RandomGenerator.paragraph({ sentences: 6 }),
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
    "visibility code must match create request",
    visibilityLevel.code,
    visibilityCreateBody.code,
  );

  // 4. Register a memberUser
  const memberUserJoinBody = {
    username: RandomGenerator.alphabets(10),
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(12),
    ip: "127.0.0.1",
    href: "https://community.portal.local/register",
    referrer: "https://community.portal.local/landing",
  } satisfies ICommunityPlatformMemberuser.IJoinRequest;

  const memberUserAuthorized: ICommunityPlatformMemberuser.IAuthorized =
    await api.functional.auth.memberUser.join(connection, {
      body: memberUserJoinBody,
    });
  typia.assert(memberUserAuthorized);

  // 5. Login as the same memberUser (ensure token is set correctly)
  const memberUserLoginBody = {
    identifier: memberUserJoinBody.email,
    password: memberUserJoinBody.password,
    ip: "127.0.0.1",
    href: "https://community.portal.local/login",
    referrer: "https://community.portal.local/landing",
  } satisfies ICommunityPlatformMemberuser.ILoginRequest;

  const memberUserLoginResult: ICommunityPlatformMemberuser.IAuthorized =
    await api.functional.auth.memberUser.login(connection, {
      body: memberUserLoginBody,
    });
  typia.assert(memberUserLoginResult);

  // 6. As memberUser, create a community using the visibility level code
  const communityIdentifier = `community-${RandomGenerator.alphabets(10)}`;
  const communityCreateBody = {
    identifier: communityIdentifier,
    title: `Community ${RandomGenerator.name(1)}`,
    description: RandomGenerator.paragraph({ sentences: 10 }),
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

  TestValidator.equals(
    "community identifier must match request",
    community.identifier,
    communityCreateBody.identifier,
  );

  TestValidator.equals(
    "community visibility level code must match",
    community.visibilityLevel.code,
    communityCreateBody.visibilityLevelCode,
  );

  // 7. Register a communityModerator
  const moderatorJoinBody = {
    username: RandomGenerator.alphabets(10),
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(14),
    display_name: RandomGenerator.name(),
    ip: "127.0.0.1",
    href: "https://moderator.console.local/register",
    referrer: "https://moderator.console.local/landing",
  } satisfies ICommunityPlatformCommunityModerator.IJoin;

  const communityModeratorAuthorized: ICommunityPlatformCommunityModerator.IAuthorized =
    await api.functional.auth.communityModerator.join(connection, {
      body: moderatorJoinBody,
    });
  typia.assert(communityModeratorAuthorized);

  // 8. Login as the communityModerator (explicit login flow)
  const moderatorLoginBody = {
    identifier: moderatorJoinBody.email,
    password: moderatorJoinBody.password,
    ip: "127.0.0.1",
    href: "https://moderator.console.local/login",
    referrer: "https://moderator.console.local/landing",
  } satisfies ICommunityPlatformCommunityModerator.ILogin;

  const moderatorLoginResult: ICommunityPlatformCommunityModerator.IAuthorized =
    await api.functional.auth.communityModerator.login(connection, {
      body: moderatorLoginBody,
    });
  typia.assert(moderatorLoginResult);

  // 9. As communityModerator, create an initial tag for the community
  const firstTagCreateBody = {
    label: `Tag ${RandomGenerator.name(1)}`,
    slug: undefined,
    description: RandomGenerator.paragraph({ sentences: 5 }),
    isVisible: true,
    order: 1,
  } satisfies ICommunityPlatformCommunityTag.ICreate;

  const firstTag: ICommunityPlatformCommunityTag =
    await api.functional.communityPlatform.communityModerator.communities.tags.create(
      connection,
      {
        communityIdentifier: community.identifier,
        body: firstTagCreateBody,
      },
    );
  typia.assert(firstTag);

  TestValidator.predicate(
    "created tag should be visible",
    firstTag.isVisible === true,
  );

  // Interpret tag id as UUID for delete API (runtime checked)
  const existingTagId: string & tags.Format<"uuid"> = typia.assert<
    string & tags.Format<"uuid">
  >(firstTag.id);

  // 10. Happy-path delete: erase the existing tag, expecting success (no error)
  await api.functional.communityPlatform.communityModerator.communities.tags.erase(
    connection,
    {
      communityIdentifier: community.identifier,
      tagId: existingTagId,
    },
  );

  // 11. Generate a non-existent tag UUID different from existingTagId
  let nonExistentTagId: string & tags.Format<"uuid">;
  while (true) {
    const candidate = typia.random<string & tags.Format<"uuid">>();
    if (candidate !== existingTagId) {
      nonExistentTagId = candidate;
      break;
    }
  }

  TestValidator.notEquals(
    "non-existent tagId must differ from deleted existingTagId",
    existingTagId,
    nonExistentTagId,
  );

  // 12. Attempt to delete non-existent tag: expect an error
  await TestValidator.error(
    "deleting non-existent community tag should raise an error",
    async () => {
      await api.functional.communityPlatform.communityModerator.communities.tags.erase(
        connection,
        {
          communityIdentifier: community.identifier,
          tagId: nonExistentTagId,
        },
      );
    },
  );

  // 13. Ensure system remains consistent by creating another tag after error
  const secondTagCreateBody = {
    label: `Tag ${RandomGenerator.name(1)}`,
    slug: undefined,
    description: RandomGenerator.paragraph({ sentences: 4 }),
    isVisible: true,
    order: 2,
  } satisfies ICommunityPlatformCommunityTag.ICreate;

  const secondTag: ICommunityPlatformCommunityTag =
    await api.functional.communityPlatform.communityModerator.communities.tags.create(
      connection,
      {
        communityIdentifier: community.identifier,
        body: secondTagCreateBody,
      },
    );
  typia.assert(secondTag);

  TestValidator.predicate(
    "second tag id should be a non-empty string",
    secondTag.id.length > 0,
  );
}
