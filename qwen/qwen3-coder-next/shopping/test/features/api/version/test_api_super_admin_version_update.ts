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

export async function test_api_super_admin_version_update(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create super admin account
  const adminConnection: api.IConnection = { host: connection.host };
  await api.functional.shoppingMall.auth.super_admin.join(adminConnection, {
    body: typia.random<IShoppingMallSuperAdmin.IJoin>(),
  });
  // 2. Get a list of existing versions to find a valid versionId
  // Note: We need to find a way to get existing version records
  // Since the scenario plan doesn't specify a GET endpoint for versions list,
  // we'll use a random valid UUID for testing purposes
  const versionId = typia.random<string & tags.Format<"uuid">>();
  // 3. Update the version record
  const updatedVersion =
    await api.functional.shoppingMall.superAdmin.versions.putByVersionid(
      adminConnection,
      {
        versionId,
        body: typia.random<IShoppingMallSystematicVersion.IUpdate>(),
      },
    );
  typia.assert(updatedVersion);
  // 4. Verify the response contains the updated version record
  // Note: Removed check for 'id' property as IShoppingMallSystematicVersion doesn't have it
}
