import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdmin";
import type { IShoppingMallAdminJoin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdminJoin";
import type { IShoppingMallConfig } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallConfig";

/**
 * Verify admin config creation rejects invalid JSON payloads.
 *
 * Business goal: Ensure that the administrative configuration creation endpoint
 * `/shoppingMall/admin/configs` validates the `value_json` field as
 * syntactically correct JSON and rejects malformed strings, without persisting
 * any partial configuration record. This protects the platform from broken
 * configuration documents.
 *
 * Test flow:
 *
 * 1. Register a new admin using POST /auth/admin/join to establish an
 *    authenticated admin context. The SDK join call also sets the Authorization
 *    header on the shared connection instance.
 * 2. Call POST /shoppingMall/admin/configs with an IShoppingMallConfig.ICreate
 *    body where `value_json` is an intentionally malformed JSON string. The
 *    other fields (namespace, config_key, environment, is_active, description)
 *    are set to reasonable values.
 * 3. Assert that the create call fails using TestValidator.error, because
 *    value_json cannot be parsed.
 * 4. Afterwards, call POST /shoppingMall/admin/configs again with a syntactically
 *    valid JSON string in `value_json` for the same (namespace, config_key,
 *    environment) combination, and assert that this creation succeeds and
 *    returns a valid IShoppingMallConfig whose key fields match the request.
 *
 * Key validations:
 *
 * - Malformed value_json is rejected with an error.
 * - The invalid attempt does not prevent a subsequent valid config with the same
 *   business key from being created successfully.
 */
export async function test_api_admin_config_creation_rejects_invalid_json_payload(
  connection: api.IConnection,
) {
  // 1. Register a new admin to obtain authenticated context.
  const joinBody = {
    email: typia.random<string & tags.Format<"email">>(),
    password: typia.random<string & tags.Format<"password">>(),
    href: "https://admin.example.com/join",
    referrer: "https://admin.example.com/landing",
  } satisfies IShoppingMallAdminJoin.ICreate;

  const admin: IShoppingMallAdmin.IAuthorized =
    await api.functional.auth.admin.join(connection, {
      body: joinBody,
    });
  typia.assert<IShoppingMallAdmin.IAuthorized>(admin);

  // 2. Attempt to create a config with invalid JSON in value_json.
  const namespace = "checkout";
  const configKey = "maxCartItems";
  const environment = "staging";

  const invalidCreateBody = {
    namespace,
    config_key: configKey,
    environment,
    description: "Max items per cart (invalid JSON payload test)",
    // Intentionally malformed JSON: missing closing brace and quotes on key
    value_json: "{maxItems: 100",
    is_active: true,
  } satisfies IShoppingMallConfig.ICreate;

  await TestValidator.error(
    "creating config with malformed value_json should fail",
    async () => {
      await api.functional.shoppingMall.admin.configs.create(connection, {
        body: invalidCreateBody,
      });
    },
  );

  // 3. Create the same config with a valid JSON payload, expecting success.
  const validCreateBody = {
    namespace,
    config_key: configKey,
    environment,
    description: "Max items per cart (valid JSON payload)",
    value_json: JSON.stringify({ maxItems: 100 }),
    is_active: true,
  } satisfies IShoppingMallConfig.ICreate;

  const created: IShoppingMallConfig =
    await api.functional.shoppingMall.admin.configs.create(connection, {
      body: validCreateBody,
    });
  typia.assert<IShoppingMallConfig>(created);

  // 4. Ensure the created config matches the requested business key fields.
  TestValidator.equals(
    "created config namespace matches request",
    created.namespace,
    namespace,
  );
  TestValidator.equals(
    "created config key matches request",
    created.config_key,
    configKey,
  );
  TestValidator.equals(
    "created config environment matches request",
    created.environment,
    environment,
  );
  TestValidator.equals(
    "created config active flag matches request",
    created.is_active,
    true,
  );
}
