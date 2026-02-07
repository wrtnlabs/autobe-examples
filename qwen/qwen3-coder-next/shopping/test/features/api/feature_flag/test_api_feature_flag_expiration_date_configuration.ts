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

export async function test_api_feature_flag_expiration_date_configuration(
  connection: api.IConnection,
): Promise<void> {
  // 1. Super admin login
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_super_admin_login(adminConnection, {
    body: typia.random<IShoppingMallSuperAdmin.ILogin>(),
  });
  // 2. Update feature flag with expiration date
  const featureName = typia.random<string & tags.Format<"email">>();
  const futureDate = new Date();
  futureDate.setDate(futureDate.getDate() + 30);
  const expiresAt = futureDate.toISOString();
  const updatedFlag =
    await api.functional.shoppingMall.superAdmin.feature_flags.patch(
      adminConnection,
      {
        body: {
          feature_name: featureName,
          expires_at: expiresAt,
        } satisfies IShoppingMallSystematicFeatureFlag.IUpdate,
      },
    );
  typia.assert(updatedFlag);
}
