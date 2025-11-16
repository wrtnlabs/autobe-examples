import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallConfig } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallConfig";
import type { IShoppingMallPlatformAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallPlatformAdmin";
import type { IShoppingMallPlatformAdminJoin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallPlatformAdminJoin";

export async function test_api_platform_admin_create_inactive_config_for_future_use(
  connection: api.IConnection,
) {
  // 1. Register a new platform admin (join)
  const joinBody = {
    email: typia.random<string & tags.Format<"email">>(),
    name: RandomGenerator.name(),
    password: RandomGenerator.alphaNumeric(16),
    href: typia.random<string & tags.Format<"uri">>(),
    referrer: typia.random<string & tags.Format<"uri">>(),
    ip: null,
  } satisfies IShoppingMallPlatformAdminJoin.IRequest;

  const admin: IShoppingMallPlatformAdmin.IAuthorized =
    await api.functional.auth.platformAdmin.join(connection, {
      body: joinBody,
    });
  typia.assert(admin);

  // 2. Create an inactive config entry for future use
  const createBody = {
    namespace: "reviews",
    key: "auto_moderation_threshold",
    value: "0.8",
    description:
      "Threshold for automatic review moderation, staged for future activation.",
    active: false,
  } satisfies IShoppingMallConfig.ICreate;

  const createdConfig: IShoppingMallConfig =
    await api.functional.shoppingMall.platformAdmin.configs.create(connection, {
      body: createBody,
    });
  typia.assert(createdConfig);

  // 3. Validate basic field round-trip from request to response
  TestValidator.equals(
    "config namespace should match request",
    createdConfig.namespace,
    createBody.namespace,
  );
  TestValidator.equals(
    "config key should match request",
    createdConfig.key,
    createBody.key,
  );
  TestValidator.equals(
    "config value should match request",
    createdConfig.value,
    createBody.value,
  );
  TestValidator.equals(
    "config description should match request",
    createdConfig.description,
    createBody.description,
  );

  // 4. Validate active flag and system metadata
  TestValidator.equals(
    "config should be created as inactive",
    createdConfig.active,
    false,
  );

  // id / created_at / updated_at already structurally validated by typia.assert
  // but we ensure id is non-empty string for sanity
  TestValidator.predicate(
    "config id should be a non-empty string",
    createdConfig.id.length > 0,
  );

  TestValidator.predicate(
    "config created_at should be a non-empty string",
    createdConfig.created_at.length > 0,
  );
  TestValidator.predicate(
    "config updated_at should be a non-empty string",
    createdConfig.updated_at.length > 0,
  );

  // deleted_at should not be set on a freshly created config
  TestValidator.predicate(
    "config deleted_at should be null or undefined right after creation",
    createdConfig.deleted_at === null || createdConfig.deleted_at === undefined,
  );
}
