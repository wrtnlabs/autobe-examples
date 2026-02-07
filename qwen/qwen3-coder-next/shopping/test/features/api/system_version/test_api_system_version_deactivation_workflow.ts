import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IShoppingMallSuperAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSuperAdmin";
import type { IShoppingMallSystematicVersion } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSystematicVersion";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_super_admin_login } from "../../../authorize/authorize_super_admin_login";
import { authorize_super_admin_refresh } from "../../../authorize/authorize_super_admin_refresh";
import { generate_random_shopping_mall_super_admin_versions_create } from "../../../generate/generate_random_shopping_mall_super_admin_versions_create";
import { prepare_random_shopping_mall_systematic_version } from "../../../prepare/prepare_random_shopping_mall_systematic_version";

export async function test_api_system_version_deactivation_workflow(
  connection: api.IConnection,
): Promise<void> {
  // 1. Authenticate as super admin
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_super_admin_login(adminConnection, {
    body: typia.random<IShoppingMallSuperAdmin.IJoin>(),
  });
  // 2. Create first version for 'database' component
  const firstVersion =
    await generate_random_shopping_mall_super_admin_versions_create(
      adminConnection,
      {
        body: {
          component_name: "database",
          version_number: "1.0.0",
          migration_timestamp: new Date().toISOString(),
          description: "Initial database version",
          is_active: true,
        } satisfies IShoppingMallSystematicVersion.ICreate,
      },
    );
  typia.assert(firstVersion);
  // 3. Create second version for same 'database' component with is_active=true
  const secondVersion =
    await generate_random_shopping_mall_super_admin_versions_create(
      adminConnection,
      {
        body: {
          component_name: "database",
          version_number: "2.0.0",
          migration_timestamp: new Date().toISOString(),
          description: "Updated database version",
          is_active: true,
        } satisfies IShoppingMallSystematicVersion.ICreate,
      },
    );
  typia.assert(secondVersion);
  // 4. Verify business logic: first version should be automatically deactivated
  TestValidator.equals(
    "first version is_active should be false",
    (firstVersion as any).is_active,
    false,
  );
  TestValidator.equals(
    "second version is_active should be true",
    (secondVersion as any).is_active,
    true,
  );
  TestValidator.equals(
    "first component_name matches",
    (firstVersion as any).component_name,
    "database",
  );
  TestValidator.equals(
    "second component_name matches",
    (secondVersion as any).component_name,
    "database",
  );
}