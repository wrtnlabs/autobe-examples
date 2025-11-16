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

/**
 * Validate GET /communityPlatform/communities/{communityIdentifier} behavior
 * around the `is_removed` flag and identifier/UUID resolution.
 *
 * Business intent:
 *
 * - Ensure that a newly created community is retrievable via its slug identifier
 *   with `is_removed === false`.
 * - After a community moderator marks the community as removed via the
 *   communityModerator update endpoint, subsequent GET calls for that community
 *   reflect `is_removed === true`.
 * - Confirm that the endpoint accepts both the slug identifier and the UUID id as
 *   the `communityIdentifier` path parameter and returns consistent data in
 *   both cases.
 *
 * Due to the SDK function signature `communities.at` returning a concrete
 * `ICommunityPlatformCommunity` (and not an HttpError or union), this test
 * validates business behavior through the DTO fields, not through HTTP status
 * codes.
 */
export async function test_api_community_get_by_identifier_removed_state_handling(
  connection: api.IConnection,
) {
  // 1. Register a platform admin and create a visibility level
  const platformAdminJoin = await api.functional.auth.platformAdmin.join(
    connection,
    {
      body: {
        username: RandomGenerator.name(1),
        email: typia.random<string & tags.Format<"email">>(),
        password: RandomGenerator.alphaNumeric(16),
        displayName: RandomGenerator.name(),
        ip: undefined,
        href: "https://admin.example.com/register",
        referrer: "https://admin.example.com/",
      } satisfies ICommunityPlatformPlatformadmin.IJoin,
    },
  );
  typia.assert(platformAdminJoin);

  const visibilityCode = `public-${RandomGenerator.alphaNumeric(8)}`;

  const visibilityLevel =
    await api.functional.communityPlatform.platformAdmin.communityVisibilityLevels.create(
      connection,
      {
        body: {
          code: visibilityCode,
          name: `Public ${RandomGenerator.name(1)}`,
          description: RandomGenerator.paragraph({ sentences: 5 }),
        } satisfies ICommunityPlatformCommunityVisibilityLevel.ICreate,
      },
    );
  typia.assert(visibilityLevel);
  TestValidator.equals(
    "visibility level code matches",
    visibilityLevel.code,
    visibilityCode,
  );

  // 2. Register a member user and create a community
  const memberUserEmail = typia.random<string & tags.Format<"email">>();
  const memberUsername = RandomGenerator.alphaNumeric(12);

  const memberJoin = await api.functional.auth.memberUser.join(connection, {
    body: {
      username: memberUsername,
      email: memberUserEmail,
      password: RandomGenerator.alphaNumeric(16),
      ip: undefined,
      href: "https://app.example.com/join",
      referrer: "https://app.example.com/landing",
    } satisfies ICommunityPlatformMemberuser.IJoinRequest,
  });
  typia.assert(memberJoin);

  const communityIdentifier = `removed-community-${RandomGenerator.alphaNumeric(6)}`;

  const createdCommunity: ICommunityPlatformCommunity =
    await api.functional.communityPlatform.memberUser.communities.create(
      connection,
      {
        body: {
          identifier: communityIdentifier,
          title: RandomGenerator.paragraph({ sentences: 3 }),
          description: RandomGenerator.paragraph({ sentences: 8 }),
          visibilityLevelCode: visibilityCode,
          isNsfw: false,
          primaryTagIds: undefined,
        } satisfies ICommunityPlatformCommunity.ICreate,
      },
    );
  typia.assert(createdCommunity);

  TestValidator.equals(
    "created community identifier matches input",
    createdCommunity.identifier,
    communityIdentifier,
  );
  TestValidator.predicate(
    "created community is initially not removed",
    createdCommunity.is_removed === false,
  );

  // 3. Initial GET by slug identifier (should be not removed)
  const initialFetchBySlug: ICommunityPlatformCommunity =
    await api.functional.communityPlatform.communities.at(connection, {
      communityIdentifier,
    });
  typia.assert(initialFetchBySlug);

  TestValidator.equals(
    "initial GET by slug id matches created id",
    initialFetchBySlug.id,
    createdCommunity.id,
  );
  TestValidator.equals(
    "initial GET by slug identifier matches",
    initialFetchBySlug.identifier,
    createdCommunity.identifier,
  );
  TestValidator.predicate(
    "initial GET reports is_removed === false",
    initialFetchBySlug.is_removed === false,
  );

  // 4. Register a community moderator and mark the community as removed
  const moderatorEmail = typia.random<string & tags.Format<"email">>();
  const moderatorUsername = RandomGenerator.alphaNumeric(10);

  const moderatorJoin = await api.functional.auth.communityModerator.join(
    connection,
    {
      body: {
        username: moderatorUsername,
        email: moderatorEmail,
        password: RandomGenerator.alphaNumeric(16),
        display_name: RandomGenerator.name(),
        ip: undefined,
        href: "https://moderator.example.com/join",
        referrer: "https://moderator.example.com/landing",
      } satisfies ICommunityPlatformCommunityModerator.IJoin,
    },
  );
  typia.assert(moderatorJoin);

  // Mark the community as removed using the moderator endpoint
  const removedCommunity: ICommunityPlatformCommunity =
    await api.functional.communityPlatform.communityModerator.communities.update(
      connection,
      {
        communityIdentifier,
        body: {
          is_removed: true,
        } satisfies ICommunityPlatformCommunity.IUpdate,
      },
    );
  typia.assert(removedCommunity);

  TestValidator.equals(
    "removed community id matches created id",
    removedCommunity.id,
    createdCommunity.id,
  );
  TestValidator.predicate(
    "community is marked as removed after moderator update",
    removedCommunity.is_removed === true,
  );

  // 5. GET by slug identifier after removal
  const fetchAfterRemovalBySlug: ICommunityPlatformCommunity =
    await api.functional.communityPlatform.communities.at(connection, {
      communityIdentifier,
    });
  typia.assert(fetchAfterRemovalBySlug);

  TestValidator.equals(
    "after removal, fetch by slug id matches created id",
    fetchAfterRemovalBySlug.id,
    createdCommunity.id,
  );
  TestValidator.equals(
    "after removal, fetch by slug identifier matches",
    fetchAfterRemovalBySlug.identifier,
    createdCommunity.identifier,
  );
  TestValidator.predicate(
    "after removal, GET by slug reports is_removed === true",
    fetchAfterRemovalBySlug.is_removed === true,
  );

  // 6. GET by UUID id as communityIdentifier after removal
  const fetchAfterRemovalByUuid: ICommunityPlatformCommunity =
    await api.functional.communityPlatform.communities.at(connection, {
      communityIdentifier: createdCommunity.id,
    });
  typia.assert(fetchAfterRemovalByUuid);

  TestValidator.equals(
    "after removal, fetch by UUID id matches created id",
    fetchAfterRemovalByUuid.id,
    createdCommunity.id,
  );
  TestValidator.equals(
    "after removal, fetch by UUID keeps same identifier",
    fetchAfterRemovalByUuid.identifier,
    createdCommunity.identifier,
  );
  TestValidator.predicate(
    "after removal, GET by UUID reports is_removed === true",
    fetchAfterRemovalByUuid.is_removed === true,
  );
}
