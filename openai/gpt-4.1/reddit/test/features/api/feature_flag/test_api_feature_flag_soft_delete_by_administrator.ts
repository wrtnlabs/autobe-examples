import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAdministrator";
import type { ICommunityPlatformFeatureFlag } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformFeatureFlag";

/**
 * Validate that an administrator can softly delete a platform feature flag
 * (soft-deletion sets deleted_at timestamp).
 *
 * Steps:
 *
 * 1. Register administrator using the join endpoint, get token.
 * 2. Create a new feature flag under admin context.
 * 3. Soft delete the feature flag with its flag_key.
 * 4. Assert that deleted_at is now non-null (ISO timestamp), and record is
 *    retained.
 * 5. Attempt to soft delete the same flag again (should error: not-found).
 * 6. (Business rule) Only administrators can soft delete; only audit fields change
 *    (deleted_at/updated_at).
 * 7. Verify audit trail preservation (deleted_at/updated_at stay after soft
 *    delete, flag remains for traceability).
 */
export async function test_api_feature_flag_soft_delete_by_administrator(
  connection: api.IConnection,
) {
  // 1. Register new administrator
  const adminEmail = typia.random<string & tags.Format<"email">>();
  const adminPassword = typia.random<string & tags.Format<"password">>();
  const admin = await api.functional.auth.administrator.join(connection, {
    body: {
      email: adminEmail,
      password: adminPassword,
    } satisfies ICommunityPlatformAdministrator.ICreate,
  });
  typia.assert(admin);

  // 2. Create platform feature flag
  const flagKey = RandomGenerator.alphaNumeric(12);
  const flagCreate =
    await api.functional.communityPlatform.administrator.featureFlags.create(
      connection,
      {
        body: {
          flag_key: flagKey,
          flag_type: "boolean",
          status: "enabled",
          description: RandomGenerator.paragraph({ sentences: 2 }),
        } satisfies ICommunityPlatformFeatureFlag.ICreate,
      },
    );
  typia.assert(flagCreate);
  TestValidator.equals(
    "feature flag key correctly stored after creation",
    flagCreate.flag_key,
    flagKey,
  );
  TestValidator.equals(
    "feature flag is active before deletion",
    flagCreate.deleted_at,
    null,
  );

  // 3. Soft delete feature flag
  const erasedFlag =
    await api.functional.communityPlatform.administrator.featureFlags.erase(
      connection,
      {
        flagKey: flagKey,
      },
    );
  typia.assert(erasedFlag);
  TestValidator.equals(
    "deleted_at is now set after soft delete",
    typeof erasedFlag.deleted_at,
    "string",
  );
  TestValidator.notEquals(
    "soft deleted flag audit record is retained",
    erasedFlag.deleted_at,
    null,
  );
  TestValidator.equals(
    "feature flag key matches after delete",
    erasedFlag.flag_key,
    flagKey,
  );

  // 4. Check audit trail retention after soft delete
  TestValidator.equals(
    "flag audit trail (id matches after deletion)",
    erasedFlag.id,
    flagCreate.id,
  );
  TestValidator.notEquals(
    "deleted_at timestamp differs from created_at",
    erasedFlag.deleted_at,
    erasedFlag.created_at,
  );
  TestValidator.notEquals(
    "updated_at timestamp is changed after soft delete",
    erasedFlag.updated_at,
    flagCreate.updated_at,
  );

  // 5. Soft deleting the already-deleted flag should return not-found error
  await TestValidator.error(
    "deleting the same non-existent feature flag returns error",
    async () => {
      await api.functional.communityPlatform.administrator.featureFlags.erase(
        connection,
        { flagKey },
      );
    },
  );

  // (Extra) Only administrators can delete (the join/auth had to succeed for admin context)
}
