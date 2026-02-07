import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IShoppingMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdmin";
import type { IShoppingMallSystematicVersion } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSystematicVersion";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";
import { generate_random_shopping_mall_admin_versions_create } from "../../../generate/generate_random_shopping_mall_admin_versions_create";
import { prepare_random_shopping_mall_systematic_version } from "../../../prepare/prepare_random_shopping_mall_systematic_version";

export async function test_api_system_version_creation(
  connection: api.IConnection,
): Promise<void> {
  // 1. Admin setup - login as admin
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_admin_join(adminConnection, {
    body: {
      email: "admin@test.com",
      password: "1234",
      name: "Admin",
    } satisfies IShoppingMallAdmin.IJoin,
  });
  // 2. Create a new system version record
  const version = await api.functional.shoppingMall.admin.versions.create(
    adminConnection,
    {
      body: {
        component_name: "database_migration",
        version_number: "1.0.0",
        migration_timestamp: new Date().toISOString(),
        description: "Initial database schema setup",
        is_active: true,
      } satisfies IShoppingMallSystematicVersion.ICreate,
    },
  );
  typia.assert(version);
  // 3. Validate version record
  // Skip validation of non-existent properties
}