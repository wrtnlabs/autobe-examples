import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IShoppingMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdmin";
import type { IShoppingMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomer";
import type { IShoppingMallSystemConfiguration } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSystemConfiguration";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";
import { generate_random_shopping_mall_admin_configurations_create } from "../../../generate/generate_random_shopping_mall_admin_configurations_create";
import { prepare_random_shopping_mall_system_configuration } from "../../../prepare/prepare_random_shopping_mall_system_configuration";

export async function test_api_admin_configuration_creation(
  connection: api.IConnection,
): Promise<void> {
  // Step 1: Create administrator connection
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_admin_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "admin1234" as string & tags.Format<"password">,
    } satisfies IShoppingMallAdmin.IJoin,
  });
  // Step 2: Create a new configuration
  const configKey = RandomGenerator.alphabets(8);
  const category = RandomGenerator.pick([
    "payment",
    "shipping",
    "security",
    "feature",
  ]);
  const created = await api.functional.shoppingMall.admin.configurations.create(
    adminConnection,
    {
      body: {
        config_key: configKey,
        category: category,
        is_enabled: true,
        description: RandomGenerator.paragraph({ sentences: 2 }),
      } satisfies IShoppingMallSystemConfiguration.ICreate,
    },
  );
  // Step 3: Validate the created configuration
  typia.assert(created);
  // Verify required fields are present
  TestValidator.equals("config_key matches", (created as any).config_key, configKey);
  TestValidator.equals("category matches", (created as any).category, category);
  TestValidator.equals("is_enabled is true", (created as any).is_enabled, true);
  // Verify UUID format
  TestValidator.predicate(
    "has valid UUID",
    /^[0-9a-f-]{36}$/i.test((created as any).id),
  );
  // Verify timestamps exist and are valid ISO strings
  TestValidator.predicate(
    "has created_at",
    (created as any).created_at !== null && (created as any).created_at !== undefined,
  );
  TestValidator.predicate(
    "created_at is valid ISO",
    /^[0-9]{4}-[0-9]{2}-[0-9]{2}T[0-9]{2}:[0-9]{2}:[0-9]{2}/.test(
      (created as any).created_at,
    ),
  );
  // Verify updated_at follows the same pattern
  TestValidator.predicate(
    "has updated_at",
    (created as any).updated_at !== null && (created as any).updated_at !== undefined,
  );
  TestValidator.predicate(
    "updated_at is valid ISO",
    /^[0-9]{4}-[0-9]{2}-[0-9]{2}T[0-9]{2}:[0-9]{2}:[0-9]{2}/.test(
      (created as any).updated_at,
    ),
  );
}