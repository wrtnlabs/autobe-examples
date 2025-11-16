import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformAccountStatus } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAccountStatus";
import type { ICommunityPlatformCommunityVisibilityLevel } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunityVisibilityLevel";
import type { ICommunityPlatformPlatformadmin } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformPlatformadmin";

/**
 * Validate that a platform administrator can soft-delete a community visibility
 * level by its business code.
 *
 * Business purpose:
 *
 * - Platform admins manage master data for community visibility levels that
 *   determine how communities are exposed and discoverable. Deletion must be
 *   logical (soft) so historical data remains intact.
 *
 * This test covers:
 *
 * 1. Platform admin registration and authentication via join endpoint.
 * 2. Creation of a new community visibility level master record with a unique
 *    code.
 * 3. Verification that the created record is active (no deleted_at) and
 *    structurally valid.
 * 4. Soft deletion by code using the erase endpoint.
 * 5. Verification that deleted_at is populated, updated_at has advanced, and
 *    id/code remain stable.
 *
 * Notes:
 *
 * - Community creation using the deleted visibility level is not tested because
 *   no such API is provided in the current SDK. The test instead focuses on the
 *   master record lifecycle itself.
 */
export async function test_api_community_visibility_level_soft_delete_by_platform_admin(
  connection: api.IConnection,
) {
  // 1. Register a new platform administrator to obtain an authenticated context.
  const joinBody = {
    username: `admin_${RandomGenerator.alphaNumeric(8)}`,
    email: `${RandomGenerator.alphabets(8)}@example.com`,
    password: RandomGenerator.alphaNumeric(12),
    displayName: RandomGenerator.name(2),
    href: "https://admin.console.example.com/register",
    referrer: "https://admin.console.example.com/",
  } satisfies ICommunityPlatformPlatformadmin.IJoin;

  const admin: ICommunityPlatformPlatformadmin.IAuthorized =
    await api.functional.auth.platformAdmin.join(connection, {
      body: joinBody,
    });
  typia.assert<ICommunityPlatformPlatformadmin.IAuthorized>(admin);

  // 2. Create a new community visibility level with a unique business code.
  const visibilityCode = `public_test_${RandomGenerator.alphaNumeric(6)}`;
  const createBody = {
    code: visibilityCode,
    name: `Public Test ${RandomGenerator.name(1)}`,
    description: RandomGenerator.paragraph({ sentences: 5 }),
  } satisfies ICommunityPlatformCommunityVisibilityLevel.ICreate;

  const created: ICommunityPlatformCommunityVisibilityLevel =
    await api.functional.communityPlatform.platformAdmin.communityVisibilityLevels.create(
      connection,
      {
        body: createBody,
      },
    );
  typia.assert<ICommunityPlatformCommunityVisibilityLevel>(created);

  // 3. Validate structural fields and that the record is active (not soft deleted yet).
  TestValidator.predicate(
    "created visibility level has non-empty UUID id",
    typeof created.id === "string" && created.id.length > 0,
  );
  TestValidator.equals(
    "created visibility level code matches input",
    created.code,
    visibilityCode,
  );
  TestValidator.equals(
    "created visibility level name matches input",
    created.name,
    createBody.name,
  );
  TestValidator.predicate(
    "created_at and updated_at are ISO date-time strings",
    typeof created.created_at === "string" &&
      typeof created.updated_at === "string" &&
      created.created_at.length > 0 &&
      created.updated_at.length > 0,
  );
  TestValidator.predicate(
    "created visibility level is active (deleted_at is null or undefined)",
    created.deleted_at === null || created.deleted_at === undefined,
  );

  const beforeUpdatedAt = created.updated_at;
  const beforeCreatedAt = created.created_at;

  // 4. Perform soft delete by business code.
  const erased: ICommunityPlatformCommunityVisibilityLevel =
    await api.functional.communityPlatform.platformAdmin.communityVisibilityLevels.erase(
      connection,
      {
        visibilityLevelCode: visibilityCode,
      },
    );
  typia.assert<ICommunityPlatformCommunityVisibilityLevel>(erased);

  // 5. Validate that soft delete semantics are applied correctly.
  TestValidator.equals(
    "erased visibility level keeps the same id",
    erased.id,
    created.id,
  );
  TestValidator.equals(
    "erased visibility level keeps the same code",
    erased.code,
    created.code,
  );
  TestValidator.equals(
    "erased visibility level keeps the same created_at",
    erased.created_at,
    beforeCreatedAt,
  );
  TestValidator.predicate(
    "erased visibility level has updated_at advanced or equal to before",
    erased.updated_at >= beforeUpdatedAt,
  );
  TestValidator.predicate(
    "erased visibility level is soft deleted (deleted_at is non-null)",
    erased.deleted_at !== null && erased.deleted_at !== undefined,
  );

  // 6. Confirm that the logically deleted record is still structurally valid master data.
  typia.assert<ICommunityPlatformCommunityVisibilityLevel>(erased);
}
