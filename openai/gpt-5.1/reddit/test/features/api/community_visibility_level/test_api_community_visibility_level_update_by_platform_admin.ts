import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformAccountStatus } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAccountStatus";
import type { ICommunityPlatformCommunityVisibilityLevel } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunityVisibilityLevel";
import type { ICommunityPlatformPlatformadmin } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformPlatformadmin";

/**
 * Validate that a platform administrator can update mutable fields of a
 * community visibility level identified by its business code.
 *
 * Business context
 *
 * - Visibility levels are master data referenced by communities via `code`.
 * - Platform admins manage this catalog; only `name` and `description` are
 *   mutable via the update endpoint. Immutable/system fields include `id`,
 *   `code`, `created_at`, and soft-delete state.
 *
 * Test steps
 *
 * 1. Register and authenticate a platform admin using the join endpoint.
 *
 *    - This call must be made first so that subsequent calls run under the
 *         platformAdmin actor. The SDK automatically propagates the JWT access
 *         token into the connection headers.
 * 2. Create a new community visibility level using a unique business code.
 *
 *    - Use api.functional.communityPlatform.platformAdmin.communityVisibilityLevels.create
 *         with an ICommunityPlatformCommunityVisibilityLevel.ICreate body.
 *    - Capture the returned ICommunityPlatformCommunityVisibilityLevel as the
 *         baseline state.
 * 3. Perform an update that changes both `name` and `description`.
 *
 *    - Call api.functional.communityPlatform.platformAdmin.communityVisibilityLevels.update
 *         with `visibilityLevelCode` set to the created record's `code`, and a
 *         body satisfying ICommunityPlatformCommunityVisibilityLevel.IUpdate.
 *    - Assert via typia.assert that the response is a valid
 *         ICommunityPlatformCommunityVisibilityLevel.
 *    - Use TestValidator to confirm:
 *
 *         - `id` is unchanged.
 *         - `code` is unchanged.
 *         - `name` and `description` match the new values.
 *         - `created_at` is unchanged.
 *         - `updated_at` has advanced (i.e., different from the original `updated_at`).
 *                   Because we only have string date-times, compare for
 *                   inequality rather than ordering.
 * 4. Perform a partial update that only changes `description`.
 *
 *    - Call update again with a body that omits `name` and provides a new
 *         `description`.
 *    - Assert via typia.assert and TestValidator that:
 *
 *         - `name` remains the value from the previous update.
 *         - `description` reflects the latest value.
 *         - `id`, `code`, and `created_at` remain stable.
 *         - `updated_at` has changed again compared to the first update response.
 *
 * Additional constraints
 *
 * - Do not touch connection.headers directly in the test; authentication is
 *   handled by the join SDK function.
 * - Use typia.random for generating realistic random values where helpful, and
 *   RandomGenerator for free-text fields.
 * - Focus only on business-level behavior; avoid any explicit type-error
 *   scenarios or HTTP status code assertions.
 */
export async function test_api_community_visibility_level_update_by_platform_admin(
  connection: api.IConnection,
) {
  // 1. Register and authenticate a platform admin
  const joinBody = typia.random<ICommunityPlatformPlatformadmin.IJoin>();
  const admin = await api.functional.auth.platformAdmin.join(connection, {
    body: joinBody,
  });
  typia.assert<ICommunityPlatformPlatformadmin.IAuthorized>(admin);

  // 2. Create a new visibility level with a unique business code
  const createBody = {
    code: RandomGenerator.alphaNumeric(8),
    name: RandomGenerator.paragraph({ sentences: 2 }),
    description: RandomGenerator.paragraph({ sentences: 4 }),
  } satisfies ICommunityPlatformCommunityVisibilityLevel.ICreate;

  const created =
    await api.functional.communityPlatform.platformAdmin.communityVisibilityLevels.create(
      connection,
      { body: createBody },
    );
  typia.assert<ICommunityPlatformCommunityVisibilityLevel>(created);

  // 3. Update both name and description
  const updatedName = RandomGenerator.paragraph({ sentences: 3 });
  const updatedDescription = RandomGenerator.paragraph({ sentences: 5 });

  const updateBodyFull = {
    name: updatedName,
    description: updatedDescription,
  } satisfies ICommunityPlatformCommunityVisibilityLevel.IUpdate;

  const afterFullUpdate =
    await api.functional.communityPlatform.platformAdmin.communityVisibilityLevels.update(
      connection,
      {
        visibilityLevelCode: created.code,
        body: updateBodyFull,
      },
    );
  typia.assert<ICommunityPlatformCommunityVisibilityLevel>(afterFullUpdate);

  // Validate full update business rules
  TestValidator.equals(
    "id must remain unchanged after full update",
    afterFullUpdate.id,
    created.id,
  );
  TestValidator.equals(
    "code must remain unchanged after full update",
    afterFullUpdate.code,
    created.code,
  );
  TestValidator.equals(
    "name must reflect updated value after full update",
    afterFullUpdate.name,
    updatedName,
  );
  TestValidator.equals(
    "description must reflect updated value after full update",
    afterFullUpdate.description,
    updatedDescription,
  );
  TestValidator.equals(
    "created_at must remain unchanged after full update",
    afterFullUpdate.created_at,
    created.created_at,
  );
  TestValidator.notEquals(
    "updated_at must change after full update",
    afterFullUpdate.updated_at,
    created.updated_at,
  );

  // 4. Partial update: change only description
  const partiallyUpdatedDescription = RandomGenerator.paragraph({
    sentences: 6,
  });

  const updateBodyPartial = {
    description: partiallyUpdatedDescription,
  } satisfies ICommunityPlatformCommunityVisibilityLevel.IUpdate;

  const afterPartialUpdate =
    await api.functional.communityPlatform.platformAdmin.communityVisibilityLevels.update(
      connection,
      {
        visibilityLevelCode: created.code,
        body: updateBodyPartial,
      },
    );
  typia.assert<ICommunityPlatformCommunityVisibilityLevel>(afterPartialUpdate);

  // Validate partial update business rules
  TestValidator.equals(
    "id must remain unchanged after partial update",
    afterPartialUpdate.id,
    created.id,
  );
  TestValidator.equals(
    "code must remain unchanged after partial update",
    afterPartialUpdate.code,
    created.code,
  );
  TestValidator.equals(
    "name must remain as value from full update after partial update",
    afterPartialUpdate.name,
    afterFullUpdate.name,
  );
  TestValidator.equals(
    "description must reflect the latest partial update value",
    afterPartialUpdate.description,
    partiallyUpdatedDescription,
  );
  TestValidator.equals(
    "created_at must remain unchanged after partial update",
    afterPartialUpdate.created_at,
    created.created_at,
  );
  TestValidator.notEquals(
    "updated_at must change again after partial update",
    afterPartialUpdate.updated_at,
    afterFullUpdate.updated_at,
  );
}
