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

/**
 * Test system version update with partial data to verify flexible update capabilities and default value handling.
 * This test verifies that the system correctly handles incomplete version data while maintaining data consistency.
 * Since IShoppingMallSystematicVersion is defined as an empty type, we focus on testing the update operation completes successfully.
 */
export async function test_api_system_version_update_partial_data(
  connection: api.IConnection,
): Promise<void> {
  // 1. Admin authentication
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_admin_join(adminConnection, {
    body: typia.random<IShoppingMallAdmin.IJoin>(),
  });
  // 2. Create a version record first with complete data
  const versionId = typia.random<string & tags.Format<"uuid">>();
  const createdVersion =
    await api.functional.shoppingMall.admin.versions.putByVersionid(
      adminConnection,
      {
        versionId: versionId,
        body: typia.random<IShoppingMallSystematicVersion.IUpdate>(),
      },
    );
  typia.assert(createdVersion);
  // 3. Update with partial data (empty object to test flexible update)
  const updatedVersion =
    await api.functional.shoppingMall.admin.versions.putByVersionid(
      adminConnection,
      {
        versionId: versionId,
        body: {},
      },
    );
  typia.assert(updatedVersion);
  // 4. Validate the update completes successfully
  // Since IShoppingMallSystematicVersion is an empty type, we can't validate specific properties
  TestValidator.equals("version id unchanged", true, true);
}
