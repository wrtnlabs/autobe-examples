import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallConfig } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallConfig";
import type { IShoppingMallPlatformAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallPlatformAdmin";
import type { IShoppingMallPlatformAdminJoin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallPlatformAdminJoin";

export async function test_api_platform_admin_create_config_with_descriptive_metadata(
  connection: api.IConnection,
) {
  // 1. Join a new platform admin to obtain an authorized session.
  const joinRequestBody = {
    email: typia.random<string & tags.Format<"email">>(),
    name: RandomGenerator.name(),
    password: RandomGenerator.alphaNumeric(16),
    href: typia.random<string & tags.Format<"uri">>(),
    referrer: typia.random<string & tags.Format<"uri">>(),
    // ip is optional; omit to let backend handle it.
  } satisfies IShoppingMallPlatformAdminJoin.IRequest;

  const adminAuthorized = await api.functional.auth.platformAdmin.join(
    connection,
    {
      body: joinRequestBody,
    },
  );
  typia.assert<IShoppingMallPlatformAdmin.IAuthorized>(adminAuthorized);

  // 2. Prepare a descriptive configuration creation payload.
  const descriptionText =
    "Controls the maximum number of promotions that can be applied concurrently at checkout. " +
    "Use this setting to prevent overly generous stacking of discounts that could erode margins. " +
    "Recommended range is between 1 and 5, where 3 is a balanced default for most merchants.";

  const createConfigBody = {
    namespace: "checkout",
    key: "max_concurrent_promotions",
    value: "3",
    description: descriptionText,
    active: true,
  } satisfies IShoppingMallConfig.ICreate;

  // 3. Call the configs.create endpoint as an authenticated platform admin.
  const createdConfig =
    await api.functional.shoppingMall.platformAdmin.configs.create(connection, {
      body: createConfigBody,
    });
  typia.assert<IShoppingMallConfig>(createdConfig);

  // 4. Validate that the response echoes back all business fields correctly.
  TestValidator.equals(
    "namespace should match the submitted namespace",
    createdConfig.namespace,
    createConfigBody.namespace,
  );

  TestValidator.equals(
    "key should match the submitted key",
    createdConfig.key,
    createConfigBody.key,
  );

  TestValidator.equals(
    "value should match the submitted value string",
    createdConfig.value,
    createConfigBody.value,
  );

  TestValidator.equals(
    "active flag should match the submitted active state",
    createdConfig.active,
    createConfigBody.active,
  );

  TestValidator.equals(
    "description should be persisted exactly as submitted",
    createdConfig.description,
    createConfigBody.description,
  );

  // 5. Validate that system metadata fields are populated as expected.
  TestValidator.predicate(
    "created configuration must have a non-empty UUID id",
    createdConfig.id.length > 0,
  );

  TestValidator.predicate(
    "created configuration must have a non-empty created_at timestamp",
    createdConfig.created_at.length > 0,
  );

  TestValidator.predicate(
    "created configuration must have a non-empty updated_at timestamp",
    createdConfig.updated_at.length > 0,
  );

  TestValidator.predicate(
    "newly created configuration must not be soft-deleted",
    createdConfig.deleted_at === null || createdConfig.deleted_at === undefined,
  );
}
