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

/**
 * Validate archiving toggle behavior of communities via the platformAdmin
 * update endpoint.
 *
 * Business goals:
 *
 * - Ensure a platform administrator can archive and unarchive an existing
 *   community using PUT
 *   /communityPlatform/platformAdmin/communities/{communityIdentifier}.
 * - Confirm that archiving only flips the `is_archived` flag without changing
 *   immutable identity fields (`id`, `identifier`, `identifier_normalized`,
 *   `created_at`) or unrelated flags such as `is_removed`.
 * - Enforce the authorization boundary that only platformAdmins can perform this
 *   update; member users must not be able to call the same endpoint
 *   successfully.
 *
 * End-to-end flow implemented in this test:
 *
 * 1. Register a platform administrator via POST /auth/platformAdmin/join.
 * 2. As platformAdmin, create a visibility level via POST
 *    /communityPlatform/platformAdmin/communityVisibilityLevels.
 * 3. Register a member user via POST /auth/memberUser/join.
 * 4. As memberUser, create a community via POST
 *    /communityPlatform/memberUser/communities, referencing the created
 *    visibility level by its `code` and relying on the default `is_archived =
 *    false`.
 * 5. Switch back to platformAdmin (login) and call PUT
 *    /communityPlatform/platformAdmin/communities/{communityIdentifier} with
 *    `is_archived: true`.
 * 6. Assert that the response community now has `is_archived = true` while `id`,
 *    `identifier`, `identifier_normalized`, and `created_at` remain unchanged
 *    and `is_removed` is not modified.
 * 7. Call the same update endpoint again with `is_archived: false` and verify that
 *    the flag toggles back while identity fields remain stable.
 * 8. Finally, log in again as the member user and attempt to call the
 *    platformAdmin update endpoint; assert that this fails using
 *    TestValidator.error, confirming that member users cannot perform
 *    platformAdmin-only updates.
 */
export async function test_api_community_update_archiving_behavior(
  connection: api.IConnection,
) {
  // 1. Register and authenticate a platform administrator.
  const platformAdminJoinBody = {
    username: RandomGenerator.alphabets(12),
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(16),
    displayName: RandomGenerator.name(),
    ip: undefined,
    href: "https://admin.example.com/register",
    referrer: "https://admin.example.com/",
  } satisfies ICommunityPlatformPlatformadmin.IJoin;

  const platformAdminAuthorized: ICommunityPlatformPlatformadmin.IAuthorized =
    await api.functional.auth.platformAdmin.join(connection, {
      body: platformAdminJoinBody,
    });
  typia.assert(platformAdminAuthorized);

  // 2. As platformAdmin, create a visibility level to be used by the community.
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
  TestValidator.equals(
    "visibility level code should match input",
    visibilityLevel.code,
    visibilityCode,
  );

  // 3. Register and authenticate a member user.
  const memberJoinBody = {
    username: RandomGenerator.alphabets(10),
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(12),
    ip: null,
    href: "https://community.example.com/register",
    referrer: "https://community.example.com/landing",
  } satisfies ICommunityPlatformMemberuser.IJoinRequest;

  const memberAuthorized: ICommunityPlatformMemberuser.IAuthorized =
    await api.functional.auth.memberUser.join(connection, {
      body: memberJoinBody,
    });
  typia.assert(memberAuthorized);

  // 4. As memberUser, create a community referencing the created visibility level.
  const communityIdentifier = `community-${RandomGenerator.alphaNumeric(8)}`;
  const communityCreateBody = {
    identifier: communityIdentifier,
    title: RandomGenerator.paragraph({ sentences: 3 }),
    description: RandomGenerator.paragraph({ sentences: 10 }),
    visibilityLevelCode: visibilityLevel.code,
    isNsfw: false,
    primaryTagIds: [],
  } satisfies ICommunityPlatformCommunity.ICreate;

  const createdCommunity: ICommunityPlatformCommunity =
    await api.functional.communityPlatform.memberUser.communities.create(
      connection,
      {
        body: communityCreateBody,
      },
    );
  typia.assert(createdCommunity);

  TestValidator.equals(
    "created community identifier should match input",
    createdCommunity.identifier,
    communityIdentifier,
  );

  // The initial state should not be archived and not removed.
  TestValidator.equals(
    "new community should not be archived by default",
    createdCommunity.is_archived,
    false,
  );
  TestValidator.equals(
    "new community should not be removed by default",
    createdCommunity.is_removed,
    false,
  );

  const originalId = createdCommunity.id;
  const originalIdentifier = createdCommunity.identifier;
  const originalIdentifierNormalized = createdCommunity.identifier_normalized;
  const originalCreatedAt = createdCommunity.created_at;
  const originalIsRemoved = createdCommunity.is_removed;

  // 5. Switch back to platformAdmin via login to ensure actor context.
  const platformAdminLoginBody = {
    identifier: platformAdminJoinBody.email,
    password: platformAdminJoinBody.password,
    ip: null,
    href: "https://admin.example.com/login",
    referrer: "https://admin.example.com/",
  } satisfies ICommunityPlatformPlatformadmin.ILogin;

  const platformAdminLoggedIn: ICommunityPlatformPlatformadmin.IAuthorized =
    await api.functional.auth.platformAdmin.login(connection, {
      body: platformAdminLoginBody,
    });
  typia.assert(platformAdminLoggedIn);

  // 6. Archive the community using the platformAdmin update endpoint.
  const archiveUpdateBody = {
    is_archived: true,
  } satisfies ICommunityPlatformCommunity.IUpdate;

  const archivedCommunity: ICommunityPlatformCommunity =
    await api.functional.communityPlatform.platformAdmin.communities.update(
      connection,
      {
        communityIdentifier: originalIdentifier,
        body: archiveUpdateBody,
      },
    );
  typia.assert(archivedCommunity);

  // Validate identity fields are unchanged and archive flag toggled.
  TestValidator.equals(
    "archived community id should remain the same",
    archivedCommunity.id,
    originalId,
  );
  TestValidator.equals(
    "archived community identifier should remain the same",
    archivedCommunity.identifier,
    originalIdentifier,
  );
  TestValidator.equals(
    "archived community normalized identifier should remain the same",
    archivedCommunity.identifier_normalized,
    originalIdentifierNormalized,
  );
  TestValidator.equals(
    "archived community created_at should remain the same",
    archivedCommunity.created_at,
    originalCreatedAt,
  );
  TestValidator.equals(
    "archived community is_archived flag should be true",
    archivedCommunity.is_archived,
    true,
  );
  TestValidator.equals(
    "archived community is_removed flag should not change",
    archivedCommunity.is_removed,
    originalIsRemoved,
  );

  // 7. Unarchive the community.
  const unarchiveUpdateBody = {
    is_archived: false,
  } satisfies ICommunityPlatformCommunity.IUpdate;

  const unarchivedCommunity: ICommunityPlatformCommunity =
    await api.functional.communityPlatform.platformAdmin.communities.update(
      connection,
      {
        communityIdentifier: originalIdentifier,
        body: unarchiveUpdateBody,
      },
    );
  typia.assert(unarchivedCommunity);

  TestValidator.equals(
    "unarchived community id should remain the same",
    unarchivedCommunity.id,
    originalId,
  );
  TestValidator.equals(
    "unarchived community identifier should remain the same",
    unarchivedCommunity.identifier,
    originalIdentifier,
  );
  TestValidator.equals(
    "unarchived community normalized identifier should remain the same",
    unarchivedCommunity.identifier_normalized,
    originalIdentifierNormalized,
  );
  TestValidator.equals(
    "unarchived community created_at should remain the same",
    unarchivedCommunity.created_at,
    originalCreatedAt,
  );
  TestValidator.equals(
    "unarchived community is_archived flag should be false",
    unarchivedCommunity.is_archived,
    false,
  );
  TestValidator.equals(
    "unarchived community is_removed flag should remain unchanged",
    unarchivedCommunity.is_removed,
    originalIsRemoved,
  );

  // 8. Negative authorization test: memberUser must not be able to update the community via the platformAdmin endpoint.
  const memberLoginBody = {
    identifier: memberJoinBody.email,
    password: memberJoinBody.password,
    ip: null,
    href: "https://community.example.com/login",
    referrer: "https://community.example.com/",
  } satisfies ICommunityPlatformMemberuser.ILoginRequest;

  const memberLoggedIn: ICommunityPlatformMemberuser.IAuthorized =
    await api.functional.auth.memberUser.login(connection, {
      body: memberLoginBody,
    });
  typia.assert(memberLoggedIn);

  await TestValidator.error(
    "memberUser cannot call platformAdmin community update endpoint",
    async () => {
      await api.functional.communityPlatform.platformAdmin.communities.update(
        connection,
        {
          communityIdentifier: originalIdentifier,
          body: {
            is_archived: true,
          } satisfies ICommunityPlatformCommunity.IUpdate,
        },
      );
    },
  );
}
