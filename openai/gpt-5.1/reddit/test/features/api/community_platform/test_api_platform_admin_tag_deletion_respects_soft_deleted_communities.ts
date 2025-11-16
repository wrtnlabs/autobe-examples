import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformAccountStatus } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAccountStatus";
import type { ICommunityPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunity";
import type { ICommunityPlatformCommunityTag } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunityTag";
import type { ICommunityPlatformCommunityVisibilityLevel } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunityVisibilityLevel";
import type { ICommunityPlatformMemberuser } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMemberuser";
import type { ICommunityPlatformPlatformadmin } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformPlatformadmin";

/**
 * Validate platform admin community tag deletion for archived communities.
 *
 * Business goal: Ensure that a platform administrator can delete a
 * community-level tag even after the community has been transitioned into an
 * archived state, and that this operation completes successfully without
 * leaving the system in an inconsistent state.
 *
 * Scope and constraints:
 *
 * - We only use the actual APIs and DTOs provided:
 *
 *   - POST /auth/platformAdmin/join → platform admin registration + auth
 *   - POST /auth/platformAdmin/login → platform admin login (actor switching)
 *   - POST /auth/memberUser/join → member user registration + auth
 *   - POST /communityPlatform/platformAdmin/communityVisibilityLevels → visibility
 *       level creation
 *   - POST /communityPlatform/memberUser/communities → community creation
 *   - POST /communityPlatform/platformAdmin/communities/{communityIdentifier}/tags
 *       → tag creation
 *   - PUT /communityPlatform/platformAdmin/communities/{communityIdentifier} →
 *       community update
 *   - DELETE /communityPlatform/platformAdmin/communities/{communityIdentifier}/tags/{tagId}
 *       → tag deletion
 * - There is no tag-listing API, so we validate success via non-throwing behavior
 *   and basic structural assertions.
 * - We use the `is_archived` flag to simulate a soft-deleted/archived state,
 *   without touching `is_removed`, to keep the flow simple and implementable.
 * - We do not touch connection.headers directly; authentication APIs manage
 *   tokens for us.
 * - We do not test type errors, status codes, or missing-required-field
 *   scenarios.
 *
 * Test flow:
 *
 * 1. Register a platform admin (join) and obtain initial admin session.
 * 2. As platform admin, create a visibility level with a unique code.
 * 3. Register a member user (join) and obtain member session.
 * 4. As member user, create a community using the previously created visibility
 *    level code.
 * 5. Switch back to platform admin (login with same credentials).
 * 6. As platform admin, create a community tag under the created community.
 * 7. As platform admin, archive the community via update (is_archived=true).
 * 8. As platform admin, delete the previously created tag using erase.
 * 9. Assert that all non-void responses conform to their DTOs via typia.assert,
 *    and that the DELETE call completes without throwing.
 */
export async function test_api_platform_admin_tag_deletion_respects_soft_deleted_communities(
  connection: api.IConnection,
) {
  // 1. Register platform admin (join) and obtain admin session
  const adminEmail: string & tags.Format<"email"> = typia.random<
    string & tags.Format<"email">
  >();
  const adminPassword: string = RandomGenerator.alphaNumeric(12);

  const adminJoinBody = {
    username: RandomGenerator.name(1),
    email: adminEmail,
    password: adminPassword,
    displayName: RandomGenerator.name(),
    ip: RandomGenerator.alphaNumeric(8),
    href: "https://admin.example.com/register",
    referrer: "https://admin.example.com/",
  } satisfies ICommunityPlatformPlatformadmin.IJoin;

  const adminAuthorizedJoin: ICommunityPlatformPlatformadmin.IAuthorized =
    await api.functional.auth.platformAdmin.join(connection, {
      body: adminJoinBody,
    });
  typia.assert(adminAuthorizedJoin);

  // 2. As platform admin, create a visibility level with a unique code
  const visibilityCode: string = `vis-${RandomGenerator.alphaNumeric(8)}`;
  const visibilityCreateBody = {
    code: visibilityCode,
    name: RandomGenerator.name(2),
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
    "visibility level code matches creation request",
    visibilityLevel.code,
    visibilityCode,
  );

  // 3. Register member user (join) and obtain member session
  const memberEmail: string & tags.Format<"email"> = typia.random<
    string & tags.Format<"email">
  >();
  const memberPassword: string = RandomGenerator.alphaNumeric(12);

  const memberJoinBody = {
    username: RandomGenerator.name(1),
    email: memberEmail,
    password: memberPassword,
    ip: RandomGenerator.alphaNumeric(8),
    href: "https://app.example.com/register",
    referrer: "https://landing.example.com/",
  } satisfies ICommunityPlatformMemberuser.IJoinRequest;

  const memberAuthorized: ICommunityPlatformMemberuser.IAuthorized =
    await api.functional.auth.memberUser.join(connection, {
      body: memberJoinBody,
    });
  typia.assert(memberAuthorized);

  // 4. As member user, create a community using the visibility level code
  const communityIdentifier: string = `community-${RandomGenerator.alphaNumeric(8)}`;
  const communityCreateBody = {
    identifier: communityIdentifier,
    title: RandomGenerator.name(3),
    description: RandomGenerator.paragraph({ sentences: 8 }),
    visibilityLevelCode: visibilityCode,
    isNsfw: false,
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
    "created community identifier should match request",
    community.identifier,
    communityIdentifier,
  );
  TestValidator.equals(
    "created community visibility level code should match",
    community.visibilityLevel.code,
    visibilityCode,
  );

  // 5. Switch back to platform admin using login
  const adminLoginBody = {
    identifier: adminEmail,
    password: adminPassword,
    ip: RandomGenerator.alphaNumeric(8),
    href: "https://admin.example.com/login",
    referrer: "https://admin.example.com/",
  } satisfies ICommunityPlatformPlatformadmin.ILogin;

  const adminAuthorizedLogin: ICommunityPlatformPlatformadmin.IAuthorized =
    await api.functional.auth.platformAdmin.login(connection, {
      body: adminLoginBody,
    });
  typia.assert(adminAuthorizedLogin);

  // 6. As platform admin, create a community tag under the created community
  const tagCreateBody = {
    label: RandomGenerator.name(1),
    description: RandomGenerator.paragraph({ sentences: 4 }),
    isVisible: true,
    order: 1,
  } satisfies ICommunityPlatformCommunityTag.ICreate;

  const tag: ICommunityPlatformCommunityTag =
    await api.functional.communityPlatform.platformAdmin.communities.tags.create(
      connection,
      {
        communityIdentifier: communityIdentifier,
        body: tagCreateBody,
      },
    );
  typia.assert(tag);

  TestValidator.equals(
    "created tag label should match request",
    tag.label,
    tagCreateBody.label,
  );
  TestValidator.predicate(
    "created tag should be visible",
    tag.isVisible === true,
  );

  // 7. Archive the community via platform admin update (is_archived = true)
  const communityUpdateBody = {
    is_archived: true,
  } satisfies ICommunityPlatformCommunity.IUpdate;

  const archivedCommunity: ICommunityPlatformCommunity =
    await api.functional.communityPlatform.platformAdmin.communities.update(
      connection,
      {
        communityIdentifier: communityIdentifier,
        body: communityUpdateBody,
      },
    );
  typia.assert(archivedCommunity);

  TestValidator.equals(
    "community is_archived flag should be true after update",
    archivedCommunity.is_archived,
    true,
  );
  TestValidator.equals(
    "community is_removed flag should remain unchanged (false by default)",
    archivedCommunity.is_removed,
    community.is_removed,
  );

  // 8. Delete the tag association as platform admin after archiving
  const tagIdForErase: string & tags.Format<"uuid"> = typia.assert<
    string & tags.Format<"uuid">
  >(tag.id);

  await api.functional.communityPlatform.platformAdmin.communities.tags.erase(
    connection,
    {
      communityIdentifier: communityIdentifier,
      tagId: tagIdForErase,
    },
  );

  // 9. Validate that the flow reached here without throwing, which
  // indicates that tag deletion is allowed for archived communities.
  TestValidator.predicate(
    "tag deletion on archived community should complete without error",
    true,
  );
}
