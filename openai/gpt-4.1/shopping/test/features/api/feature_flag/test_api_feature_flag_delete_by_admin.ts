import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IShoppingAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingAdmin";
import type { IShoppingAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingAuthorizationToken";

/**
 * Test that a platform admin can permanently delete a feature flag by its
 * flagName.
 *
 * Steps:
 *
 * 1. Register and authenticate as a new platform admin using /auth/admin/join.
 * 2. Attempt to delete a feature flag by its flagName (using plausible random
 *    string).
 * 3. Attempting to delete the same flag a second time should yield an error
 *    (non-existent).
 *
 * Note: Since no feature flag creation API is exposed, deletion is attempted on
 * plausible flagName. Success is validated by the operation not throwing an
 * error the first time, and by confirming a business logic error occurs upon
 * repeated deletion attempt (flag already deleted).
 */
export async function test_api_feature_flag_delete_by_admin(
  connection: api.IConnection,
) {
  // 1. Register a new admin and authenticate
  const adminJoinBody = {
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(12),
    name: RandomGenerator.name(2),
    role: "super",
    status: "active",
  } satisfies IShoppingAdmin.IJoin;
  const admin: IShoppingAdmin.IAuthorized =
    await api.functional.auth.admin.join(connection, {
      body: adminJoinBody,
    });
  typia.assert(admin);

  // 2. Admin deletes a feature flag by flagName
  const flagName = RandomGenerator.alphaNumeric(10);
  await api.functional.shopping.admin.featureFlags.erase(connection, {
    flagName,
  });

  // 3. Attempt to delete the same flag again should result in error
  await TestValidator.error(
    "Deleting already-removed or non-existent flag yields a business logic error",
    async () => {
      await api.functional.shopping.admin.featureFlags.erase(connection, {
        flagName,
      });
    },
  );
}
