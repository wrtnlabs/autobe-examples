import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdmin";
import type { IShoppingMallAdminJoin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdminJoin";
import type { IShoppingMallConfig } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallConfig";

/**
 * Validate that public configuration retrieval by namespace prefers the active
 * production configuration.
 *
 * Business rationale: The shopping mall platform stores global configuration
 * rows in `shopping_mall_configs`. Although the public GET
 * /shoppingMall/configs/byNamespace/{namespace} API only accepts a namespace
 * string, internal business rules are expected to ensure that this lookup
 * resolves to a single, effective configuration for that namespace, commonly
 * the active configuration for the production environment.
 *
 * This test verifies that, when multiple configurations exist for the same
 * namespace across different environments and active flags, the public
 * retrieval still selects the intended active production configuration.
 *
 * High-level steps:
 *
 * 1. Register an admin via POST /auth/admin/join to obtain an authenticated admin
 *    context.
 * 2. As that admin, create three configurations under a shared namespace:
 *
 *    - An active configuration for environment "production".
 *    - An inactive configuration for environment "production".
 *    - An active configuration for environment "staging".
 * 3. Simulate a public (unauthenticated) client by using a fresh connection object
 *    without Authorization headers.
 * 4. Call GET /shoppingMall/configs/byNamespace/{namespace}.
 * 5. Assert that the returned configuration matches the active production
 *    configuration we created (config_key, environment, is_active, value_json,
 *    description).
 */
export async function test_api_public_config_retrieval_prefers_active_configuration(
  connection: api.IConnection,
) {
  // 1. Admin joins and obtains authorization
  const adminJoinBody = typia.random<IShoppingMallAdminJoin.ICreate>();

  const adminAuthorized: IShoppingMallAdmin.IAuthorized =
    await api.functional.auth.admin.join(connection, {
      body: adminJoinBody,
    });
  typia.assert(adminAuthorized);

  // 2. Prepare a unique namespace for this test run
  const namespaceSuffix = RandomGenerator.alphaNumeric(12);
  const namespace = `e2e-public-config-${namespaceSuffix}`;

  // Build JSON payloads as strings so we can compare them later
  const activeProdPayload = {
    tier: "prod",
    active: true,
    marker: RandomGenerator.alphaNumeric(8),
  };
  const inactiveProdPayload = {
    tier: "prod",
    active: false,
    marker: RandomGenerator.alphaNumeric(8),
  };
  const activeStagingPayload = {
    tier: "staging",
    active: true,
    marker: RandomGenerator.alphaNumeric(8),
  };

  const activeProdBody = {
    namespace,
    config_key: "prod-main",
    environment: "production",
    description: RandomGenerator.paragraph({ sentences: 4 }),
    value_json: JSON.stringify(activeProdPayload),
    is_active: true,
  } satisfies IShoppingMallConfig.ICreate;

  const inactiveProdBody = {
    namespace,
    config_key: "prod-inactive",
    environment: "production",
    description: RandomGenerator.paragraph({ sentences: 4 }),
    value_json: JSON.stringify(inactiveProdPayload),
    is_active: false,
  } satisfies IShoppingMallConfig.ICreate;

  const activeStagingBody = {
    namespace,
    config_key: "staging-main",
    environment: "staging",
    description: RandomGenerator.paragraph({ sentences: 4 }),
    value_json: JSON.stringify(activeStagingPayload),
    is_active: true,
  } satisfies IShoppingMallConfig.ICreate;

  // 3. Create configurations via admin API
  const createdActiveProd: IShoppingMallConfig =
    await api.functional.shoppingMall.admin.configs.create(connection, {
      body: activeProdBody,
    });
  typia.assert(createdActiveProd);

  const createdInactiveProd: IShoppingMallConfig =
    await api.functional.shoppingMall.admin.configs.create(connection, {
      body: inactiveProdBody,
    });
  typia.assert(createdInactiveProd);

  const createdActiveStaging: IShoppingMallConfig =
    await api.functional.shoppingMall.admin.configs.create(connection, {
      body: activeStagingBody,
    });
  typia.assert(createdActiveStaging);

  // Sanity checks: all created records share the same namespace but differ
  // by config_key, environment, and/or is_active
  TestValidator.equals(
    "created active prod namespace matches",
    createdActiveProd.namespace,
    namespace,
  );
  TestValidator.equals(
    "created inactive prod namespace matches",
    createdInactiveProd.namespace,
    namespace,
  );
  TestValidator.equals(
    "created active staging namespace matches",
    createdActiveStaging.namespace,
    namespace,
  );

  // 4. Simulate a public client without Authorization header by cloning the
  //    connection and overriding headers with an empty object. This avoids
  //    mutating the original connection.headers after the SDK has touched it.
  const publicConnection: api.IConnection = {
    ...connection,
    headers: {},
  };

  // 5. Public retrieval by namespace
  const resolvedConfig: IShoppingMallConfig =
    await api.functional.shoppingMall.configs.byNamespace.at(publicConnection, {
      namespace,
    });
  typia.assert(resolvedConfig);

  // 6. Validate that the resolved configuration matches the active
  //    production configuration we created, not the inactive or staging one.
  TestValidator.equals(
    "public config namespace matches requested namespace",
    resolvedConfig.namespace,
    namespace,
  );

  TestValidator.equals(
    "public config selects active production config_key",
    resolvedConfig.config_key,
    createdActiveProd.config_key,
  );

  TestValidator.equals(
    "public config selects active production environment",
    resolvedConfig.environment,
    createdActiveProd.environment,
  );

  TestValidator.equals(
    "public config is_active flag matches active production",
    resolvedConfig.is_active,
    createdActiveProd.is_active,
  );

  TestValidator.equals(
    "public config value_json matches active production payload",
    resolvedConfig.value_json,
    createdActiveProd.value_json,
  );

  TestValidator.equals(
    "public config description matches active production description",
    resolvedConfig.description ?? null,
    createdActiveProd.description ?? null,
  );
}
