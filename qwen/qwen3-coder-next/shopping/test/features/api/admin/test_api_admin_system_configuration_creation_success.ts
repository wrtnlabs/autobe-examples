import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEcommerceMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallAdmin";
import type { IEcommerceMallSystemConfiguration } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSystemConfiguration";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";
import { generate_random_ecommerce_mall_admin_system_configurations_create } from "../../../generate/generate_random_ecommerce_mall_admin_system_configurations_create";
import { prepare_random_ecommerce_mall_system_configuration } from "../../../prepare/prepare_random_ecommerce_mall_system_configuration";

export async function test_api_admin_system_configuration_creation_success(
  connection: api.IConnection,
): Promise<void> {
  // Create actor-specific connection for super admin
  const adminConnection: api.IConnection = { host: connection.host };
  // Register and login as super admin
  const admin = await authorize_admin_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
    } satisfies IEcommerceMallAdmin.IJoin,
  });
  // Create system configuration
  const key = `config_${typia.random<string & tags.Format<"uuid">>()}`;
  const config =
    await api.functional.ecommerceMall.admin.system_configurations.create(
      adminConnection,
      {
        body: {
          key: key,
          value: JSON.stringify({
            setting1: typia.random<string>(),
            setting2: typia.random<number>(),
          }),
          description: RandomGenerator.paragraph({ sentences: 2 }),
        } satisfies IEcommerceMallSystemConfiguration.ICreate,
      },
    );
  typia.assert(config);
  // Validate created configuration
  TestValidator.equals("key matches", config.key, key);
  TestValidator.predicate("value is valid JSON", () => {
    try {
      JSON.parse(config.value);
      return true;
    } catch {
      return false;
    }
  });
  TestValidator.predicate("has valid UUID", () =>
    /^\{?[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}\}?$/i.test(
      config.id,
    ),
  );
  TestValidator.predicate(
    "has created_at timestamp",
    () => config.created_at !== null && config.created_at !== undefined,
  );
  TestValidator.predicate(
    "has updated_at timestamp",
    () => config.updated_at !== null && config.updated_at !== undefined,
  );
  TestValidator.equals("deleted_at is null", config.deleted_at, null);
}
