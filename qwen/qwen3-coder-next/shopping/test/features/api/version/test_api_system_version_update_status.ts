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

export async function test_api_system_version_update_status(
  connection: api.IConnection,
): Promise<void> {
  // 1. Admin registration
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_admin_join(adminConnection, {
    body: typia.random<IShoppingMallAdmin.IJoin>(),
  });
  // 2. Prepare version update data with only is_active flag
  const componentName: string = typia.random<string & tags.Format<"uuid">>();
  const isActiveValue: boolean = Math.random() < 0.5;
  // 3. Call update endpoint with only is_active field
  const updatedVersion =
    await api.functional.shoppingMall.admin.versions.patchByComponentname(
      adminConnection,
      {
        componentName: componentName,
        body: {
          is_active: isActiveValue,
        } satisfies IShoppingMallSystematicVersion.IUpdate,
      },
    );
  typia.assert(updatedVersion);
  // 4. Verify the response
  TestValidator.predicate("version updated", () => updatedVersion !== null);
}
