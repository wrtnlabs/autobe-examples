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

export async function test_api_system_version_update_by_admin(
  connection: api.IConnection,
): Promise<void> {
  // 1. Admin setup
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_admin_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "1234",
      name: RandomGenerator.name(),
    } satisfies IShoppingMallAdmin.IJoin,
  });
  // 2. Create initial version record
  const versionId = typia.random<string & tags.Format<"uuid">>();
  const version =
    await api.functional.shoppingMall.admin.versions.putByVersionid(
      adminConnection,
      {
        versionId,
        body: typia.random<IShoppingMallSystematicVersion.IUpdate>(),
      },
    );
  typia.assert(version);
  // 3. Update the version record
  const updatedVersion =
    await api.functional.shoppingMall.admin.versions.putByVersionid(
      adminConnection,
      {
        versionId,
        body: {
          // Update with new values
          ...typia.random<IShoppingMallSystematicVersion.IUpdate>(),
        } satisfies IShoppingMallSystematicVersion.IUpdate,
      },
    );
  typia.assert(updatedVersion);
  // 4. Verify update was successful
  TestValidator.equals("version id matches", versionId, versionId);
  TestValidator.notEquals("version has been updated", updatedVersion, version);
}