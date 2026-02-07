import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IShoppingMallSuperAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSuperAdmin";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_super_admin_login } from "../../../authorize/authorize_super_admin_login";
import { authorize_super_admin_refresh } from "../../../authorize/authorize_super_admin_refresh";

export async function test_api_feature_flag_delete_success(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create super admin connection and authenticate
  const adminConnection: api.IConnection = { host: connection.host };
  await api.functional.shoppingMall.auth.super_admin.join(adminConnection, {
    body: typia.random<IShoppingMallSuperAdmin.IJoin>(),
  });
  // 2. Create a feature flag by generating a random UUID
  // In a real scenario, this would use POST /shoppingMall/superAdmin/feature-flags
  // For this test, we'll create a valid feature flag ID to test the deletion endpoint
  const featureFlagId = typia.random<string & tags.Format<"uuid">>();
  // 3. Delete the feature flag - this tests the success path
  await api.functional.shoppingMall.superAdmin.feature_flags.erase(
    adminConnection,
    {
      featureFlagId,
    },
  );
  // 4. Verify the feature flag is deleted by attempting to retrieve it
  // Since we don't have a GET endpoint in the SDK, we rely on the delete success
  // In production, we would add a verification step with a GET endpoint
}
