import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallAdminConfigurationChangeLog } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdminConfigurationChangeLog";
import type { IShoppingMallConfig } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallConfig";
import type { IShoppingMallPlatformAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallPlatformAdmin";
import type { IShoppingMallPlatformAdminJoin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallPlatformAdminJoin";

/**
 * Validate retrieval of a detailed admin configuration change log entry for
 * platform admins, focusing on DTO shape and authenticated access.
 *
 * Business context and limitations:
 *
 * - In a real system, creating or updating configurations would append rows to
 *   `shopping_mall_admin_configuration_change_logs`, and admins could drill
 *   into those records via the detail endpoint.
 * - From the provided SDK, we can:
 *
 *   - Join a platform admin account and obtain an authorized session.
 *   - Create global configuration rows.
 *   - Fetch a single admin configuration change log by id.
 * - We CANNOT:
 *
 *   - List configuration change logs or otherwise obtain an actual existing log id
 *       from any available API.
 *
 * Therefore, this test focuses on a happy-path detail call under an
 * authenticated platform-admin session using the simulator/random behavior. It
 * validates structure and basic invariants of the
 * IShoppingMallAdminConfigurationChangeLog DTO without asserting specific
 * identity correlations.
 *
 * Steps:
 *
 * 1. Register a new platform admin via POST /auth/platformAdmin/join using
 *    IShoppingMallPlatformAdminJoin.IRequest.
 * 2. Assert the returned IShoppingMallPlatformAdmin.IAuthorized to confirm a valid
 *    admin session and rely on the SDK to set Authorization headers.
 * 3. Create a new config via POST /shoppingMall/platformAdmin/configs using
 *    IShoppingMallConfig.ICreate and assert the IShoppingMallConfig response.
 * 4. Generate a random UUID for adminConfigurationChangeLogId using
 *    typia.random<string & tags.Format<"uuid">>().
 * 5. Call GET /shoppingMall/platformAdmin/adminConfigurationChangeLogs/{id} with
 *    that id through
 *    api.functional.shoppingMall.platformAdmin.adminConfigurationChangeLogs.at.
 * 6. Assert the response as IShoppingMallAdminConfigurationChangeLog via
 *    typia.assert.
 * 7. Use TestValidator to verify key structural expectations:
 *
 *    - Log.id is the same as the requested id
 *    - Admin has non-empty id/name/email and a status string
 *    - ConfigDomain is non-empty
 *    - ChangedKeysSummary is non-empty
 *    - BeforeValue and afterValue are non-empty strings
 *    - CreatedAt is a non-empty ISO date-time string.
 */
export async function test_api_admin_configuration_change_log_detail_after_config_update(
  connection: api.IConnection,
) {
  // 1. Register a new platform admin (join)
  const joinBody = {
    email: typia.random<string & tags.Format<"email">>(),
    name: RandomGenerator.name(),
    password: "Admin1234!",
    ip: null,
    href: typia.random<string & tags.Format<"uri">>(),
    referrer: typia.random<string & tags.Format<"uri">>(),
  } satisfies IShoppingMallPlatformAdminJoin.IRequest;

  const admin: IShoppingMallPlatformAdmin.IAuthorized =
    await api.functional.auth.platformAdmin.join(connection, {
      body: joinBody,
    });
  typia.assert<IShoppingMallPlatformAdmin.IAuthorized>(admin);

  // 2. Create a new configuration entry as this platform admin
  const configBody = {
    namespace: "checkout",
    key: `max_cart_items_${RandomGenerator.alphaNumeric(8)}`,
    value: JSON.stringify({ maxItems: 99 }),
    description: RandomGenerator.paragraph({ sentences: 4 }),
    active: true,
  } satisfies IShoppingMallConfig.ICreate;

  const config: IShoppingMallConfig =
    await api.functional.shoppingMall.platformAdmin.configs.create(connection, {
      body: configBody,
    });
  typia.assert<IShoppingMallConfig>(config);

  // 3. Generate a random UUID for the adminConfigurationChangeLogId path param
  const adminConfigurationChangeLogId: string & tags.Format<"uuid"> =
    typia.random<string & tags.Format<"uuid">>();

  // 4. Call the detail endpoint for admin configuration change logs
  const log: IShoppingMallAdminConfigurationChangeLog =
    await api.functional.shoppingMall.platformAdmin.adminConfigurationChangeLogs.at(
      connection,
      {
        adminConfigurationChangeLogId,
      },
    );
  typia.assert<IShoppingMallAdminConfigurationChangeLog>(log);

  // 5. Structural validations using TestValidator

  // 5.1. The log must have the requested id
  TestValidator.equals(
    "log id should match requested adminConfigurationChangeLogId",
    log.id,
    adminConfigurationChangeLogId,
  );

  // 5.2. Admin summary should be structurally reasonable
  TestValidator.predicate(
    "admin summary should have non-empty id",
    typeof log.admin.id === "string" && log.admin.id.length > 0,
  );
  TestValidator.predicate(
    "admin summary should have non-empty name",
    typeof log.admin.name === "string" && log.admin.name.length > 0,
  );
  TestValidator.predicate(
    "admin summary should have non-empty email",
    typeof log.admin.email === "string" && log.admin.email.length > 0,
  );
  TestValidator.predicate(
    "admin summary should have status string",
    typeof log.admin.status === "string" && log.admin.status.length > 0,
  );

  // 5.3. Config domain and changedKeysSummary should be non-empty
  TestValidator.predicate(
    "configDomain should be non-empty",
    typeof log.configDomain === "string" && log.configDomain.length > 0,
  );
  TestValidator.predicate(
    "changedKeysSummary should be non-empty",
    typeof log.changedKeysSummary === "string" &&
      log.changedKeysSummary.length > 0,
  );

  // 5.4. beforeValue and afterValue should be non-empty JSON strings
  TestValidator.predicate(
    "beforeValue should be a non-empty string",
    typeof log.beforeValue === "string" && log.beforeValue.length > 0,
  );
  TestValidator.predicate(
    "afterValue should be a non-empty string",
    typeof log.afterValue === "string" && log.afterValue.length > 0,
  );

  // 5.5. createdAt should be a non-empty ISO string
  TestValidator.predicate(
    "createdAt should be a non-empty string",
    typeof log.createdAt === "string" && log.createdAt.length > 0,
  );
}
