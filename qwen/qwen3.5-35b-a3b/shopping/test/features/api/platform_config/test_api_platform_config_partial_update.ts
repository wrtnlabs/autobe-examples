import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEcommerceMallPlatformConfiguration } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallPlatformConfiguration";
import type { IEcommerceMallSuperAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSuperAdmin";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_super_admin_join } from "../../../authorize/authorize_super_admin_join";
import { authorize_super_admin_login } from "../../../authorize/authorize_super_admin_login";
import { authorize_super_admin_refresh } from "../../../authorize/authorize_super_admin_refresh";

export async function test_api_platform_config_partial_update(
  connection: api.IConnection,
): Promise<void> {
  // 1. Register super administrator
  const adminConnection: api.IConnection = { host: connection.host };
  const adminAuth = await authorize_super_admin_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      display_name: RandomGenerator.name(),
    } satisfies IEcommerceMallSuperAdmin.IJoin,
  });
  typia.assert(adminAuth);
  // 2. Generate initial configuration state (mock existing config)
  const initialConfig = typia.random<IEcommerceMallPlatformConfiguration>();
  typia.assert(initialConfig);
  // 3. Perform partial update with only description and is_active
  const updateBody = {
    description: "Updated description - partial update test",
    is_active: !initialConfig.is_active,
  } satisfies IEcommerceMallPlatformConfiguration.IUpdate;
  const updatedConfig =
    await api.functional.ecommerceMall.superAdmin.platform_configurations.update(
      adminConnection,
      {
        configId: initialConfig.id,
        body: updateBody,
      },
    );
  typia.assert(updatedConfig);
  // 4. Validate partial update results - fields that were updated
  TestValidator.equals(
    "description was updated",
    updatedConfig.description,
    updateBody.description,
  );
  TestValidator.equals(
    "is_active was toggled",
    updatedConfig.is_active,
    updateBody.is_active,
  );
  // 5. Validate fields that were NOT included in update remain unchanged
  TestValidator.equals(
    "configuration_type unchanged",
    updatedConfig.configuration_type,
    initialConfig.configuration_type,
  );
  TestValidator.equals(
    "scope unchanged",
    updatedConfig.scope,
    initialConfig.scope,
  );
  TestValidator.equals(
    "default_value unchanged",
    updatedConfig.default_value,
    initialConfig.default_value,
  );
  TestValidator.equals(
    "configuration_key unchanged",
    updatedConfig.configuration_key,
    initialConfig.configuration_key,
  );
  // 6. Validate immutable fields remain unchanged
  TestValidator.equals("id unchanged", updatedConfig.id, initialConfig.id);
  TestValidator.equals(
    "created_at unchanged",
    updatedConfig.created_at,
    initialConfig.created_at,
  );
  // 7. Validate updated_at timestamp changed
  TestValidator.notEquals(
    "updated_at timestamp changed",
    initialConfig.updated_at,
    updatedConfig.updated_at,
  );
  // 8. Validate deleted_at unchanged (should remain null)
  TestValidator.equals(
    "deleted_at unchanged (null)",
    updatedConfig.deleted_at,
    initialConfig.deleted_at,
  );
}
