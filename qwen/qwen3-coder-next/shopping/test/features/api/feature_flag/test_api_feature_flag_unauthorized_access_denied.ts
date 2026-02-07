import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IShoppingMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomer";
import type { IShoppingMallSuperAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSuperAdmin";
import type { IShoppingMallSystematicFeatureFlag } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSystematicFeatureFlag";
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

export async function test_api_feature_flag_unauthorized_access_denied(
  connection: api.IConnection,
): Promise<void> {
  // 1. Setup: Create necessary actors
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
  // 2. Login to get valid tokens for unauthorized actors
  const customerToken = await api.functional.shoppingMall.auth.customer.login(
    customerConnection,
    {
      body: typia.random<IShoppingMallCustomer.ILogin>(),
    },
  );
  customerConnection.headers = {
    ...customerConnection.headers,
    Authorization: customerToken.token.access,
  };
  // 3. Test unauthorized access scenarios
  const featureFlagId = typia.random<string>();
  // 3.1. Test customer access (should be forbidden)
  const customerError = await TestValidator.error(
    "customer should not access feature flag",
    async () => {
      return api.functional.shoppingMall.superAdmin.feature_flags.at(
        customerConnection,
        {
          featureFlagId,
        },
      );
    },
  );
  void await TestValidator.httpError("403 forbidden for customer", 403, async () => {
    await customerError;
  });
  // 3.2. Test regular admin access (should be forbidden)
  const adminConnection: api.IConnection = { host: connection.host };
  await api.functional.shoppingMall.auth.super_admin.join(adminConnection, {
    body: typia.random<IShoppingMallSuperAdmin.IJoin>(),
  });
  const adminToken = await api.functional.shoppingMall.auth.super_admin.login(
    adminConnection,
    {
      body: typia.random<IShoppingMallSuperAdmin.ILogin>(),
    },
  );
  adminConnection.headers = {
    ...adminConnection.headers,
    Authorization: adminToken.token.access,
  };
  const adminError = await TestValidator.error(
    "regular admin should not access feature flag",
    async () => {
      return api.functional.shoppingMall.superAdmin.feature_flags.at(
        adminConnection,
        {
          featureFlagId,
        },
      );
    },
  );
  void await TestValidator.httpError("403 forbidden for regular admin", 403, async () => {
    await adminError;
  });
  // 3.3. Test authenticated but unauthorized access
  const unauthorizedConnection: api.IConnection = { host: connection.host };
  unauthorizedConnection.headers = {
    Authorization: "Bearer invalid-token" + typia.random<string>(),
  };
  const unauthorizedError = await TestValidator.error(
    "unauthorized access should be forbidden",
    async () => {
      return api.functional.shoppingMall.superAdmin.feature_flags.at(
        unauthorizedConnection,
        {
          featureFlagId,
        },
      );
    },
  );
  void await TestValidator.httpError("403 forbidden for unauthorized", 403, async () => {
    await unauthorizedError;
  });
  // 4. Verify super admin can still access (positive control)
  const superAdminToken =
    await api.functional.shoppingMall.auth.super_admin.login(
      superAdminConnection,
      {
        body: typia.random<IShoppingMallSuperAdmin.ILogin>(),
      },
    );
  superAdminConnection.headers = {
    ...superAdminConnection.headers,
    Authorization: superAdminToken.token.access,
  };
  const featureFlag =
    await api.functional.shoppingMall.superAdmin.feature_flags.at(
      superAdminConnection,
      {
        featureFlagId,
      },
    );
  typia.assert(featureFlag);
}