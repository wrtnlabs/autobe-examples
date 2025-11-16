import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformAccountStatus } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAccountStatus";
import type { ICommunityPlatformCommunityVisibilityLevel } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunityVisibilityLevel";
import type { ICommunityPlatformPlatformadmin } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformPlatformadmin";

/**
 * Validate soft-delete and idempotent-like behavior of community visibility
 * levels.
 *
 * Business intent:
 *
 * - A platform admin defines visibility level master records that communities
 *   reference.
 * - These levels are soft-deleted via deleted_at when no longer usable for new
 *   communities.
 * - The DELETE endpoint is documented to target only active rows (deleted_at ===
 *   null) by code and to respond with a not-found/conflict style error when
 *   there is no active record.
 *
 * This test ensures:
 *
 * 1. A platform admin can join and obtain an authenticated context.
 * 2. The admin can create a visibility level with a unique business code.
 * 3. The created visibility level is initially active (deleted_at === null).
 * 4. The first DELETE call:
 *
 *    - Succeeds
 *    - Returns the updated record with deleted_at populated.
 * 5. A second DELETE with the same code:
 *
 *    - Fails with an HttpError surfaced through the SDK
 *    - Is captured via TestValidator.error, proving soft-deleted records are not
 *         re-processed.
 */
export async function test_api_community_visibility_level_soft_delete_idempotent_behavior(
  connection: api.IConnection,
) {
  // 1. Platform admin joins to obtain authenticated context and token.
  const joinBody = {
    username: `admin_${RandomGenerator.alphaNumeric(8)}`,
    email: `${RandomGenerator.alphaNumeric(8)}@example.com`,
    password: RandomGenerator.alphaNumeric(12),
    displayName: RandomGenerator.name(),
    href: "https://admin.console.example.com/register",
    referrer: "https://admin.console.example.com/landing",
  } satisfies ICommunityPlatformPlatformadmin.IJoin;

  const admin: ICommunityPlatformPlatformadmin.IAuthorized =
    await api.functional.auth.platformAdmin.join(connection, {
      body: joinBody,
    });
  typia.assert(admin);

  // 2. Create a new community visibility level with a unique business code.
  const visibilityCode = `vis_${RandomGenerator.alphaNumeric(12)}`;
  const createBody = {
    code: visibilityCode,
    name: `Visibility ${RandomGenerator.name(1)}`,
    description: RandomGenerator.paragraph({ sentences: 5 }),
  } satisfies ICommunityPlatformCommunityVisibilityLevel.ICreate;

  const created: ICommunityPlatformCommunityVisibilityLevel =
    await api.functional.communityPlatform.platformAdmin.communityVisibilityLevels.create(
      connection,
      {
        body: createBody,
      },
    );
  typia.assert(created);

  // Confirm newly created record is active (deleted_at === null).
  TestValidator.equals(
    "created visibility level has matching code",
    created.code,
    visibilityCode,
  );
  TestValidator.equals(
    "created visibility level is not soft-deleted",
    created.deleted_at ?? null,
    null,
  );

  // 3. First DELETE: logically delete the active visibility level.
  const firstErase: ICommunityPlatformCommunityVisibilityLevel =
    await api.functional.communityPlatform.platformAdmin.communityVisibilityLevels.erase(
      connection,
      {
        visibilityLevelCode: visibilityCode,
      },
    );
  typia.assert(firstErase);

  TestValidator.equals(
    "first erase returns same visibility code",
    firstErase.code,
    visibilityCode,
  );
  TestValidator.predicate(
    "first erase marks record as soft-deleted (deleted_at not null)",
    firstErase.deleted_at !== null && firstErase.deleted_at !== undefined,
  );

  // 4. Second DELETE: ensure an error is thrown because the record is already soft-deleted.
  await TestValidator.error(
    "second erase on same visibility code must fail (no active row)",
    async () => {
      await api.functional.communityPlatform.platformAdmin.communityVisibilityLevels.erase(
        connection,
        {
          visibilityLevelCode: visibilityCode,
        },
      );
    },
  );
}
