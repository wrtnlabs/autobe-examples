import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdmin";
import type { IShoppingMallAdminJoin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdminJoin";
import type { IShoppingMallBusinessPolicy } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallBusinessPolicy";
import type { IShoppingMallCaseSlaConfig } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCaseSlaConfig";
import type { IShoppingMallPolicyVersion } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallPolicyVersion";

/**
 * Validate behavior when deleting a non-existent SLA configuration.
 *
 * Business goal: Ensure that the admin-facing DELETE endpoint for case SLA
 * configurations (DELETE /shoppingMall/admin/caseSlaConfigs/{caseSlaConfigId})
 * rejects deletion attempts for unknown UUIDs by raising an error, and that
 * such failed attempts do not impact the lifecycle of existing SLA configs.
 *
 * Scenario steps:
 *
 * 1. Register an admin using POST /auth/admin/join to obtain an authenticated
 *    admin context. The SDK automatically wires the returned access token onto
 *    the connection headers, so no manual token handling is required.
 * 2. Create a valid SLA configuration via POST /shoppingMall/admin/caseSlaConfigs,
 *    using a random but schema-compliant IShoppingMallCaseSlaConfig.ICreate
 *    payload.
 *
 *    - Assert that the response conforms to IShoppingMallCaseSlaConfig.
 * 3. Construct a clearly non-existent SLA configuration id by generating a fresh
 *    random UUID with typia.random<string & tags.Format<"uuid">>().
 *
 *    - The probability that it matches an existing config is negligible, and there
 *         is no need to derive it from existing ids.
 * 4. Attempt to delete this non-existent id using
 *    api.functional.shoppingMall.admin.caseSlaConfigs.erase inside
 *    TestValidator.error.
 *
 *    - This asserts that the call fails (throws), without checking specific HTTP
 *         status codes or error payloads.
 * 5. After the failed deletion, call erase again with the real id of the SLA
 *    config created in step 2.
 *
 *    - This call MUST succeed without throwing, demonstrating that the earlier
 *         failure did not accidentally remove or otherwise corrupt the valid
 *         configuration.
 */
export async function test_api_case_sla_config_delete_nonexistent_id(
  connection: api.IConnection,
) {
  // 1. Admin join to obtain authorized admin context.
  const joinBody = typia.random<IShoppingMallAdminJoin.ICreate>();
  const admin: IShoppingMallAdmin.IAuthorized =
    await api.functional.auth.admin.join(connection, {
      body: joinBody,
    });
  typia.assert<IShoppingMallAdmin.IAuthorized>(admin);

  // 2. Create a valid SLA configuration to have a known-good id on the system.
  const createBody = typia.random<IShoppingMallCaseSlaConfig.ICreate>();
  const created: IShoppingMallCaseSlaConfig =
    await api.functional.shoppingMall.admin.caseSlaConfigs.create(connection, {
      body: createBody,
    });
  typia.assert<IShoppingMallCaseSlaConfig>(created);

  // 3. Build a definitely non-existent caseSlaConfigId using a fresh random UUID.
  const nonExistingId: string & tags.Format<"uuid"> = typia.random<
    string & tags.Format<"uuid">
  >();

  // 4. Attempt to delete the non-existent id and expect an error.
  await TestValidator.error(
    "deleting non-existent case SLA config must fail",
    async () => {
      await api.functional.shoppingMall.admin.caseSlaConfigs.erase(connection, {
        caseSlaConfigId: nonExistingId,
      });
    },
  );

  // 5. Ensure the existing SLA configuration can still be deleted successfully.
  await api.functional.shoppingMall.admin.caseSlaConfigs.erase(connection, {
    caseSlaConfigId: created.id,
  });
}
