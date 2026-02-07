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

export async function test_api_system_version_semantic_validation(
  connection: api.IConnection,
): Promise<void> {
  // 1. Authenticate as super admin
  const adminConnection: api.IConnection = { host: connection.host };
  const loginResult = await api.functional.shoppingMall.auth.super_admin.join(
    adminConnection,
    {
      body: typia.random<IShoppingMallSuperAdmin.IJoin>(),
    },
  );
  typia.assert(loginResult);
  const componentName = "core";
  // 2. Test valid version format
  const validUpdate = {
    version_number: "2.0.0",
    description: "Updated version for core component",
    is_active: true,
  } satisfies IShoppingMallSystematicVersion.IUpdate;
  const validResult =
    await api.functional.shoppingMall.superAdmin.versions.patchByComponentname(
      adminConnection,
      {
        componentName,
        body: validUpdate,
      },
    );
  typia.assert(validResult);
  // 3. Test edge case - zero version (should be valid)
  const zeroVersionUpdate = {
    version_number: "0.0.0",
    description: "Zero version edge case",
    is_active: true,
  } satisfies IShoppingMallSystematicVersion.IUpdate;
  const zeroResult =
    await api.functional.shoppingMall.superAdmin.versions.patchByComponentname(
      adminConnection,
      {
        componentName,
        body: zeroVersionUpdate,
      },
    );
  typia.assert(zeroResult);
  // 4. Test valid version with minor update
  const minorUpdate = {
    version_number: "1.5.3",
    description: "Minor version update",
    is_active: true,
  } satisfies IShoppingMallSystematicVersion.IUpdate;
  const minorResult =
    await api.functional.shoppingMall.superAdmin.versions.patchByComponentname(
      adminConnection,
      {
        componentName,
        body: minorUpdate,
      },
    );
  typia.assert(minorResult);
}
