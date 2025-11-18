import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdmin";
import type { IShoppingMallAdminJoin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdminJoin";
import type { IShoppingMallConfig } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallConfig";

/**
 * Validate minimal, successful creation of a shopping mall global configuration
 * by an authenticated administrator using POST /shoppingMall/admin/configs.
 *
 * Business flow:
 *
 * 1. Register a new admin account through POST /auth/admin/join.
 *
 *    - This both creates the admin row and establishes the authenticated context via
 *         the returned JWT token, managed internally by the SDK.
 * 2. Using the now-authenticated connection, create a new configuration via POST
 *    /shoppingMall/admin/configs with a minimal but valid payload of type
 *    IShoppingMallConfig.ICreate.
 *
 *    - Namespace: a non-empty string such as "checkout".
 *    - Config_key: a key such as "maxCartItems" which is unique in the DB at the
 *         time of test; we will randomize/suffix it to avoid collisions.
 *    - Environment: a valid environment string such as "production".
 *    - Description: an explanatory sentence.
 *    - Value_json: a syntactically valid JSON string, e.g. '{"maxItems": 100}'.
 *    - Is_active: true, so the record is immediately active.
 * 3. Assert the response type and core business invariants on the returned
 *    IShoppingMallConfig instance:
 *
 *    - Type correctness via typia.assert.
 *    - Id is a non-empty UUID string.
 *    - Namespace, config_key, environment, description, value_json, is_active echo
 *         what was submitted.
 *    - Is_active is true.
 *    - Created_at and updated_at are valid date-time strings and created_at <=
 *         updated_at.
 *    - Deleted_at is null or undefined (i.e., not logically deleted).
 *
 * Only APIs allowed by the specification are used:
 *
 * - Api.functional.auth.admin.join for admin registration and authentication.
 * - Api.functional.shoppingMall.admin.configs.create for config creation.
 */
export async function test_api_admin_config_creation_minimal_valid_payload(
  connection: api.IConnection,
) {
  // 1. Register a new admin (unauthenticated join)
  const adminJoinBody = {
    email: `admin+${RandomGenerator.alphaNumeric(8)}@example.com`,
    password: "P@ssw0rd!", // satisfies password format
    href: "https://admin.example.com/signup",
    referrer: "https://admin.example.com/landing",
  } satisfies IShoppingMallAdminJoin.ICreate;

  const authorizedAdmin = await api.functional.auth.admin.join(connection, {
    body: adminJoinBody,
  });
  typia.assert<IShoppingMallAdmin.IAuthorized>(authorizedAdmin);

  // 2. Prepare minimal, valid config creation payload
  const namespace = "checkout";
  const configKey = `maxCartItems_${RandomGenerator.alphaNumeric(8)}`;
  const environment = "production";
  const valueObject = { maxItems: 100 };
  const valueJson = JSON.stringify(valueObject);

  const createBody = {
    namespace,
    config_key: configKey,
    environment,
    description: "Maximum number of items allowed in a single shopping cart.",
    value_json: valueJson,
    is_active: true,
  } satisfies IShoppingMallConfig.ICreate;

  const createdConfig = await api.functional.shoppingMall.admin.configs.create(
    connection,
    { body: createBody },
  );
  typia.assert<IShoppingMallConfig>(createdConfig);

  // 3. Business assertions on returned configuration
  // 3-1. Basic echo and flags
  TestValidator.equals(
    "namespace should echo request",
    createdConfig.namespace,
    namespace,
  );
  TestValidator.equals(
    "config_key should echo request",
    createdConfig.config_key,
    configKey,
  );
  TestValidator.equals(
    "environment should echo request",
    createdConfig.environment,
    environment,
  );
  TestValidator.equals(
    "description should echo request",
    createdConfig.description ?? null,
    createBody.description ?? null,
  );
  TestValidator.equals(
    "value_json should echo request",
    createdConfig.value_json,
    valueJson,
  );
  TestValidator.equals(
    "is_active should be true",
    createdConfig.is_active,
    true,
  );

  // 3-2. id must be a non-empty UUID string
  TestValidator.predicate(
    "id must be a non-empty string",
    typeof createdConfig.id === "string" && createdConfig.id.length > 0,
  );

  // 3-3. created_at and updated_at must be valid date-time strings with
  // created_at <= updated_at.
  const createdAt = new Date(createdConfig.created_at);
  const updatedAt = new Date(createdConfig.updated_at);

  TestValidator.predicate(
    "created_at should be a valid date",
    !Number.isNaN(createdAt.getTime()),
  );
  TestValidator.predicate(
    "updated_at should be a valid date",
    !Number.isNaN(updatedAt.getTime()),
  );
  TestValidator.predicate(
    "created_at must be earlier than or equal to updated_at",
    createdAt.getTime() <= updatedAt.getTime(),
  );

  // 3-4. deleted_at should indicate non-deleted state (null or undefined)
  TestValidator.predicate(
    "deleted_at should be null or undefined for newly created config",
    createdConfig.deleted_at === null || createdConfig.deleted_at === undefined,
  );
}
