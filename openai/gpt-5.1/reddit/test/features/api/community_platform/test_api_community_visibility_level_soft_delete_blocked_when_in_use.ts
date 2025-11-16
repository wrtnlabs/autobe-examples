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
 * Validate that a community visibility level cannot be soft-deleted while it is
 * in use.
 *
 * Business workflow covered by this test:
 *
 * 1. A platform administrator joins (registers) and becomes authenticated.
 * 2. The platform admin creates a new community visibility level with a unique
 *    code.
 * 3. A member user joins and becomes authenticated.
 * 4. The member user creates a new community that references the created
 *    visibility level by its code.
 * 5. The test verifies that the community is created successfully and that its
 *    visibilityLevel summary uses the same code.
 * 6. The test switches back to the platform admin authentication context.
 * 7. The platform admin attempts to logically delete (soft-delete) the visibility
 *    level via DELETE by code.
 * 8. Because the visibility level is still referenced by an existing community,
 *    the delete operation is expected to fail.
 * 9. The test asserts that an error is thrown for this delete attempt
 *    (conflict-style referential integrity enforcement).
 *
 * Due to limited read APIs for visibility levels and communities in the
 * provided SDK, the test validates associations using the in-memory responses
 * from creation operations rather than re-fetching the entities.
 */
export async function test_api_community_visibility_level_soft_delete_blocked_when_in_use(
  connection: api.IConnection,
) {
  // 1. Platform admin joins and is authenticated
  const adminJoinBody = {
    username: RandomGenerator.alphabets(12),
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(16),
    displayName: RandomGenerator.name(),
    ip: "127.0.0.1",
    href: typia.random<string & tags.Format<"uri">>(),
    referrer: typia.random<string & tags.Format<"uri">>(),
  } satisfies ICommunityPlatformPlatformadmin.IJoin;

  const adminAuthorized: ICommunityPlatformPlatformadmin.IAuthorized =
    await api.functional.auth.platformAdmin.join(connection, {
      body: adminJoinBody,
    });
  typia.assert(adminAuthorized);

  // 2. Platform admin creates a new visibility level with a controlled code
  const visibilityLevelCode: string = `in_use_${RandomGenerator.alphaNumeric(8)}`;

  const createVisibilityBody = {
    code: visibilityLevelCode,
    name: `Visibility ${RandomGenerator.name(1)}`,
    description: RandomGenerator.paragraph({ sentences: 5 }),
  } satisfies ICommunityPlatformCommunityVisibilityLevel.ICreate;

  const visibilityLevel: ICommunityPlatformCommunityVisibilityLevel =
    await api.functional.communityPlatform.platformAdmin.communityVisibilityLevels.create(
      connection,
      {
        body: createVisibilityBody,
      },
    );
  typia.assert(visibilityLevel);

  TestValidator.equals(
    "created visibility level code should match requested code",
    visibilityLevel.code,
    visibilityLevelCode,
  );

  TestValidator.predicate(
    "created visibility level must not be soft-deleted initially",
    visibilityLevel.deleted_at === null ||
      visibilityLevel.deleted_at === undefined,
  );

  // 3. Member user joins and is authenticated
  const memberJoinBody = {
    username: RandomGenerator.alphabets(10),
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(16),
    ip: "127.0.0.1",
    href: typia.random<string & tags.Format<"uri">>(),
    referrer: typia.random<string & tags.Format<"uri">>(),
  } satisfies ICommunityPlatformMemberuser.IJoinRequest;

  const memberAuthorized: ICommunityPlatformMemberuser.IAuthorized =
    await api.functional.auth.memberUser.join(connection, {
      body: memberJoinBody,
    });
  typia.assert(memberAuthorized);

  // 4. Member user creates a community referencing the visibility level code
  const communityIdentifier = `community_${RandomGenerator.alphaNumeric(10)}`;

  const createCommunityBody = {
    identifier: communityIdentifier,
    title: RandomGenerator.paragraph({ sentences: 3 }),
    description: RandomGenerator.paragraph({ sentences: 8 }),
    visibilityLevelCode,
    isNsfw: false,
    primaryTagIds: [],
  } satisfies ICommunityPlatformCommunity.ICreate;

  const community: ICommunityPlatformCommunity =
    await api.functional.communityPlatform.memberUser.communities.create(
      connection,
      {
        body: createCommunityBody,
      },
    );
  typia.assert(community);

  TestValidator.equals(
    "created community identifier should match requested identifier",
    community.identifier,
    communityIdentifier,
  );

  TestValidator.equals(
    "community visibility level code should match created visibility level code",
    community.visibilityLevel.code,
    visibilityLevelCode,
  );

  // 5. Switch back to platform admin by logging in again
  const adminLoginBody = {
    identifier: adminJoinBody.email,
    password: adminJoinBody.password,
    ip: "127.0.0.1",
    href: typia.random<string & tags.Format<"uri">>(),
    referrer: typia.random<string & tags.Format<"uri">>(),
  } satisfies ICommunityPlatformPlatformadmin.ILogin;

  const adminLoggedIn: ICommunityPlatformPlatformadmin.IAuthorized =
    await api.functional.auth.platformAdmin.login(connection, {
      body: adminLoginBody,
    });
  typia.assert(adminLoggedIn);

  // 6. Attempt to delete the in-use visibility level; expect error due to referential use
  await TestValidator.error(
    "deleting a visibility level that is in use by a community must fail",
    async () => {
      await api.functional.communityPlatform.platformAdmin.communityVisibilityLevels.erase(
        connection,
        {
          visibilityLevelCode,
        },
      );
    },
  );

  // Note: We cannot re-fetch the visibility level or community with the given SDK,
  // so we assume the backend left visibilityLevel.deleted_at unchanged and that
  // the community remains associated with the same visibility level code. The
  // core behavior under test is that the delete operation fails when the
  // visibility level is still referenced.
}
