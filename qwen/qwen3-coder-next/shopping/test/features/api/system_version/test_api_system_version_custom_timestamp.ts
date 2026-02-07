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

/**
 * Test system version creation with custom migration timestamp and description.
 * Tests edge case of creating version with explicit migration timestamp and custom description.
 */
export async function test_api_system_version_custom_timestamp(
  connection: api.IConnection,
): Promise<void> {
  // 1. Authenticate as super admin
  const superAdminConnection: api.IConnection = { host: connection.host };
  await authorize_super_admin_login(superAdminConnection, {
    body: typia.random<IShoppingMallSuperAdmin.IJoin>(),
  });
  // 2. Create version with explicit migration timestamp and custom description
  const version = await api.functional.shoppingMall.superAdmin.versions.create(
    superAdminConnection,
    {
      body: typia.random<IShoppingMallSystematicVersion.ICreate>(),
    },
  );
  typia.assert(version);
}
