import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IShoppingMallSuperAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSuperAdmin";
import type { IShoppingMallSystematicFeatureFlag } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSystematicFeatureFlag";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_super_admin_login } from "../../../authorize/authorize_super_admin_login";
import { authorize_super_admin_refresh } from "../../../authorize/authorize_super_admin_refresh";

export async function test_api_feature_flag_not_found_error_handling(
  connection: api.IConnection,
): Promise<void> {
  // Setup: Register and authenticate a super admin account
  const adminConnection: api.IConnection = { host: connection.host };
  const adminAuth = await api.functional.shoppingMall.auth.super_admin.join(
    adminConnection,
    {
      body: typia.random<IShoppingMallSuperAdmin.IJoin>(),
    },
  );
  typia.assert(adminAuth);
  adminConnection.headers = { Authorization: adminAuth.token.access };
  // Act & Assert: Attempt to retrieve a non-existent feature flag
  const nonExistentId = "00000000-0000-0000-0000-000000000000";
  await TestValidator.error(
    "should throw 404 for non-existent feature flag",
    async () => {
      await api.functional.shoppingMall.superAdmin.feature_flags.at(
        adminConnection,
        {
          featureFlagId: nonExistentId,
        },
      );
    },
  );
}
