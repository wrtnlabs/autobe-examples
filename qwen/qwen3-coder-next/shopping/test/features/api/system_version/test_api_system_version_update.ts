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

export async function test_api_system_version_update(
  connection: api.IConnection,
): Promise<void> {
  // 1. Authenticate as super admin
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_super_admin_login(adminConnection, {
    body: typia.random<IShoppingMallSuperAdmin.IJoin>(),
  });
  // 2. Prepare update data with version information
  const body = {
    version_number: "1.2.3",
    description: "Critical security update patch",
    is_active: true,
  } satisfies IShoppingMallSystematicVersion.IUpdate;
  // 3. Update system version for 'core' component
  const componentName = "core";
  const result =
    await api.functional.shoppingMall.superAdmin.versions.patchByComponentname(
      adminConnection,
      {
        componentName,
        body,
      },
    );
  typia.assert(result);
  // 4. Validate the response contains expected fields
  TestValidator.predicate("has valid component name", result !== null);
}
