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

export async function test_api_admin_update_system_configuration_duplicate_key(
  connection: api.IConnection,
): Promise<void> {
  // 1. Register and login as admin
  const adminConnection: api.IConnection = { host: connection.host };
  const admin = await authorize_admin_join(adminConnection, {
    body: typia.random<IEcommerceMallAdmin.IJoin>(),
  });
  typia.assert(admin);
  // 2. Create two distinct system configurations with unique keys
  const config1 =
    await api.functional.ecommerceMall.admin.system_configurations.update(
      adminConnection,
      {
        configurationId: "00000000-0000-0000-0000-000000000001",
        body: {
          key: "config_key_1",
          value: JSON.stringify({ setting: "value1" }),
          description: "First configuration",
        } satisfies IEcommerceMallSystemConfiguration.IUpdate,
      },
    );
  typia.assert(config1);
  const config2 =
    await api.functional.ecommerceMall.admin.system_configurations.update(
      adminConnection,
      {
        configurationId: "00000000-0000-0000-0000-000000000002",
        body: {
          key: "config_key_2",
          value: JSON.stringify({ setting: "value2" }),
          description: "Second configuration",
        } satisfies IEcommerceMallSystemConfiguration.IUpdate,
      },
    );
  typia.assert(config2);
  // 3. Attempt to update config1 with config2's key (duplicate key)
  await TestValidator.error(
    "should throw on duplicate key",
    async () =>
      await api.functional.ecommerceMall.admin.system_configurations.update(
        adminConnection,
        {
          configurationId: config1.id,
          body: {
            key: config2.key, // Attempting to use duplicate key
            value: config1.value,
            description: config1.description,
          } satisfies IEcommerceMallSystemConfiguration.IUpdate,
        },
      ),
  );
  // 4. Verify config1's data remains unchanged
  const updatedConfig1 =
    await api.functional.ecommerceMall.admin.system_configurations.update(
      adminConnection,
      {
        configurationId: config1.id,
        body: {
          key: config1.key,
          value: config1.value,
          description: config1.description,
        } satisfies IEcommerceMallSystemConfiguration.IUpdate,
      },
    );
  typia.assert(updatedConfig1);
  TestValidator.equals(
    "config1 key unchanged",
    updatedConfig1.key,
    config1.key,
  );
  TestValidator.equals(
    "config1 value unchanged",
    updatedConfig1.value,
    config1.value,
  );
  TestValidator.equals(
    "config1 description unchanged",
    updatedConfig1.description,
    config1.description,
  );
}
