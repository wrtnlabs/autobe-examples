import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IShoppingMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomer";
import type { IShoppingMallSuperAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSuperAdmin";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_customer_join } from "../../../authorize/authorize_customer_join";
import { authorize_customer_login } from "../../../authorize/authorize_customer_login";
import { authorize_customer_refresh } from "../../../authorize/authorize_customer_refresh";
import { authorize_super_admin_login } from "../../../authorize/authorize_super_admin_login";
import { authorize_super_admin_refresh } from "../../../authorize/authorize_super_admin_refresh";

export async function test_api_feature_flag_delete_unauthorized(
  connection: api.IConnection,
): Promise<void> {
  // 1. Setup: Create super admin and customer actors
  const superAdminConnection: api.IConnection = { host: connection.host };
  await api.functional.shoppingMall.auth.super_admin.join(
    superAdminConnection,
    {
      body: typia.random<IShoppingMallSuperAdmin.IJoin>(),
    },
  );
  const customerConnection: api.IConnection = { host: connection.host };
  await api.functional.shoppingMall.auth.customer.join(customerConnection, {
    body: typia.random<IShoppingMallCustomer.IJoin>(),
  });
  // 2. Login: Authenticate as super admin and customer
  await api.functional.shoppingMall.auth.super_admin.login(
    superAdminConnection,
    {
      body: typia.random<IShoppingMallSuperAdmin.ILogin>(),
    },
  );
  await api.functional.shoppingMall.auth.customer.login(customerConnection, {
    body: typia.random<IShoppingMallCustomer.ILogin>(),
  });
  // 3. Create a feature flag as super admin for testing deletion
  const featureFlagId = typia.random<string & tags.Format<"uuid">>();
  // 4. Test unauthorized deletion attempt by customer
  // Customer attempts to delete the feature flag created by super admin
  await TestValidator.error(
    "customer should not be authorized to delete feature flags",
    async () => {
      await api.functional.shoppingMall.superAdmin.feature_flags.erase(
        customerConnection,
        {
          featureFlagId: featureFlagId,
        },
      );
    },
  );
}
