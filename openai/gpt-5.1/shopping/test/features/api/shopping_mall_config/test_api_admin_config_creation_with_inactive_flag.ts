import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdmin";
import type { IShoppingMallAdminJoin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdminJoin";
import type { IShoppingMallConfig } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallConfig";

export async function test_api_admin_config_creation_with_inactive_flag(
  connection: api.IConnection,
) {
  // 1. Join as an admin to obtain authorized context
  const adminJoinBody = {
    email: typia.random<string & tags.Format<"email">>(),
    password: typia.random<string & tags.Format<"password">>(),
    href: typia.random<string & tags.Format<"uri">>(),
    referrer: typia.random<string & tags.Format<"uri">>(),
  } satisfies IShoppingMallAdminJoin.ICreate;

  const authorizedAdmin = await api.functional.auth.admin.join(connection, {
    body: adminJoinBody,
  });
  typia.assert<IShoppingMallAdmin.IAuthorized>(authorizedAdmin);

  // 2. Prepare inactive configuration creation payload
  const namespace = "reviews";
  const configKey = "autoApproveThreshold";
  const environment = "staging";
  const description =
    "Staging config for review auto-approval thresholds with inactive flag";
  const valueObject = {
    minRating: 4,
    minOrders: 10,
  };
  const valueJson = JSON.stringify(valueObject);

  const createConfigBody = {
    namespace,
    config_key: configKey,
    environment,
    description,
    value_json: valueJson,
    is_active: false,
  } satisfies IShoppingMallConfig.ICreate;

  const createdConfig = await api.functional.shoppingMall.admin.configs.create(
    connection,
    {
      body: createConfigBody,
    },
  );
  typia.assert<IShoppingMallConfig>(createdConfig);

  // 3. Business validations on returned configuration
  // Type-level guarantees are covered by typia.assert; here we check
  // business rules and field equality with the request body.

  // Ensure it remains inactive
  TestValidator.equals(
    "created config should be inactive",
    createdConfig.is_active,
    false,
  );

  // Ensure core identifying fields match request body
  TestValidator.equals(
    "namespace should match request",
    createdConfig.namespace,
    namespace,
  );
  TestValidator.equals(
    "config_key should match request",
    createdConfig.config_key,
    configKey,
  );
  TestValidator.equals(
    "environment should match request",
    createdConfig.environment,
    environment,
  );
  TestValidator.equals(
    "description should match request",
    createdConfig.description ?? null,
    description,
  );
  TestValidator.equals(
    "value_json should match request",
    createdConfig.value_json,
    valueJson,
  );

  // Ensure config has not been soft-deleted
  TestValidator.equals(
    "newly created config should not be soft-deleted",
    createdConfig.deleted_at ?? null,
    null,
  );

  // Sanity check: id and timestamps are populated (exact format already
  // validated by typia.assert)
  TestValidator.predicate(
    "created config id should be a non-empty string",
    typeof createdConfig.id === "string" && createdConfig.id.length > 0,
  );
  TestValidator.predicate(
    "created_at should be a non-empty string",
    typeof createdConfig.created_at === "string" &&
      createdConfig.created_at.length > 0,
  );
  TestValidator.predicate(
    "updated_at should be a non-empty string",
    typeof createdConfig.updated_at === "string" &&
      createdConfig.updated_at.length > 0,
  );
}
