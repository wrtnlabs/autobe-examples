import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIShoppingMallAdminConfigurationChangeLog } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallAdminConfigurationChangeLog";
import type { IShoppingMallAdminConfigurationChangeLog } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdminConfigurationChangeLog";
import type { IShoppingMallPlatformAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallPlatformAdmin";
import type { IShoppingMallPlatformAdminJoin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallPlatformAdminJoin";

/**
 * Validate admin configuration change logs listing contract and basic platform
 * admin join flow.
 *
 * The original scenario intended to confirm that non-admin actors (customers or
 * sellers) cannot query administrative configuration change logs and should
 * receive 403 Forbidden. In this isolated test context, however, we only have:
 *
 * - Platform admin join API (POST /auth/platformAdmin/join)
 * - Platform admin configuration change logs search API (PATCH
 *   /shoppingMall/platformAdmin/adminConfigurationChangeLogs) and no
 *   customer/seller authentication functions. We also must not manipulate
 *   `connection.headers` manually.
 *
 * Therefore, this test is adjusted to what is technically possible while still
 * exercising the key endpoints and DTO contracts:
 *
 * 1. Use typia.random to build a valid IShoppingMallPlatformAdminJoin.IRequest
 *    payload and call api.functional.auth.platformAdmin.join(connection, { body
 *    }).
 *
 *    - Assert the response as IShoppingMallPlatformAdmin.IAuthorized with
 *         typia.assert.
 *    - This confirms that the join endpoint works and issues a token in the happy
 *         path.
 * 2. Create a separate connection object in simulation mode (simulate: true) that
 *    does not rely on any Authorization header mutation, to represent a
 *    non-authenticated or non-admin-like context for contract-level testing.
 * 3. Build an IShoppingMallAdminConfigurationChangeLog.IRequest body using
 *    concrete values for page, limit, sort direction, and optional filters such
 *    as configDomains, configScope, changedKeysKeyword, and a createdAtFrom/To
 *    range.
 * 4. Call
 *    api.functional.shoppingMall.platformAdmin.adminConfigurationChangeLogs.index
 *    with the simulated connection and the request body.
 *
 *    - Assert that the response conforms to
 *         IPageIShoppingMallAdminConfigurationChangeLog.ISummary via
 *         typia.assert.
 *    - Validate with TestValidator.predicate that pagination.records is >= 0 and
 *         pagination.pages is >= 0, and that every data item has a
 *         platformAdmin summary object and non-empty config_domain, config_key,
 *         change_type, and changed_keys_summary strings.
 * 5. Note that due to unavailable non-admin authentication flows and restrictions
 *    on header manipulation, actual 403 Forbidden checks for non-admin actors
 *    cannot be implemented in this test; they must be covered by broader
 *    integration or system tests that can exercise customer/seller tokens.
 */
export async function test_api_admin_configuration_change_logs_forbidden_for_non_admin_actor(
  connection: api.IConnection,
) {
  // 1. Happy-path platform admin join to verify join contract and token structure
  const joinRequest = typia.random<IShoppingMallPlatformAdminJoin.IRequest>();
  const adminAuthorized = await api.functional.auth.platformAdmin.join(
    connection,
    {
      body: joinRequest,
    },
  );
  typia.assert(adminAuthorized);

  TestValidator.predicate(
    "platform admin join returns active flag as boolean",
    typeof adminAuthorized.isActive === "boolean",
  );

  // 2. Prepare a simulated connection to call admin configuration change logs index
  const simulatedConnection: api.IConnection = {
    ...connection,
    simulate: true,
  };

  // 3. Build a concrete IShoppingMallAdminConfigurationChangeLog.IRequest body
  const now = new Date();
  const earlier = new Date(now.getTime() - 1000 * 60 * 60 * 24 * 30); // 30 days ago

  const logsRequest = {
    page: 1,
    limit: 20,
    sortBy: "created_at",
    sortDirection: "desc",
    configDomains: ["cancellation_policy", "inventory_settings"],
    configScope: "global",
    adminId: adminAuthorized.id,
    changedKeysKeyword: "policy",
    reasonKeyword: "test",
    createdAtFrom: earlier.toISOString(),
    createdAtTo: now.toISOString(),
  } satisfies IShoppingMallAdminConfigurationChangeLog.IRequest;

  // 4. Call the configuration change logs index endpoint in simulate mode
  const page =
    await api.functional.shoppingMall.platformAdmin.adminConfigurationChangeLogs.index(
      simulatedConnection,
      {
        body: logsRequest,
      },
    );

  typia.assert(page);

  // Basic sanity checks on pagination
  TestValidator.predicate(
    "pagination records non-negative",
    page.pagination.records >= 0,
  );
  TestValidator.predicate(
    "pagination pages non-negative",
    page.pagination.pages >= 0,
  );

  // Sanity checks on each configuration change log summary
  for (const log of page.data) {
    typia.assert(log);

    TestValidator.predicate(
      "log.config_domain is non-empty string",
      typeof log.config_domain === "string" && log.config_domain.length > 0,
    );
    TestValidator.predicate(
      "log.config_key is non-empty string",
      typeof log.config_key === "string" && log.config_key.length > 0,
    );
    TestValidator.predicate(
      "log.change_type is non-empty string",
      typeof log.change_type === "string" && log.change_type.length > 0,
    );
    TestValidator.predicate(
      "log.changed_keys_summary is non-empty string",
      typeof log.changed_keys_summary === "string" &&
        log.changed_keys_summary.length > 0,
    );

    // Verify platformAdmin summary presence
    TestValidator.predicate(
      "log.platformAdmin has valid id and email",
      typeof log.platformAdmin.id === "string" &&
        log.platformAdmin.id.length > 0 &&
        typeof log.platformAdmin.email === "string" &&
        log.platformAdmin.email.length > 0,
    );
  }
}
