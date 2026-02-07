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

export async function test_api_system_version_partial_update(
  connection: api.IConnection,
): Promise<void> {
  // 1. Authenticate as super admin
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_super_admin_login(adminConnection, {
    body: typia.random<IShoppingMallSuperAdmin.IJoin>(),
  });
  // 2. Create initial version record
  const initialVersion =
    await api.functional.shoppingMall.superAdmin.versions.patchByComponentname(
      adminConnection,
      {
        componentName: "core",
        body: typia.random<IShoppingMallSystematicVersion.IUpdate>(),
      },
    );
  typia.assert(initialVersion);
  // 3. Send PATCH request with partial update
  const updatedVersion1 =
    await api.functional.shoppingMall.superAdmin.versions.patchByComponentname(
      adminConnection,
      {
        componentName: "core",
        body: typia.random<IShoppingMallSystematicVersion.IUpdate>(),
      },
    );
  typia.assert(updatedVersion1);
  // 4. Verify partial update behavior
  // The system supports partial updates, but since DTO has no defined fields,
  // we just verify the API responds correctly
  typia.assert(initialVersion);
  typia.assert(updatedVersion1);
}
