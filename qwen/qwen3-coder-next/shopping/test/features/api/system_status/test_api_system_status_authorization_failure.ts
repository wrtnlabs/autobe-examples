import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIShoppingMallSystematicStatus } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallSystematicStatus";
import type { IShoppingMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomer";
import type { IShoppingMallSuperAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSuperAdmin";
import type { IShoppingMallSystematicStatus } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSystematicStatus";
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

export async function test_api_system_status_authorization_failure(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create customer account using utility function
  const customerConnection: api.IConnection = { host: connection.host };
  await authorize_customer_join(customerConnection, {
    body: {
      email: "testcustomer@example.com",
      password: "Password123!",
    },
  });
  // 2. Login as customer to get tokens using utility function
  const customerLoginConnection: api.IConnection = { host: connection.host };
  await authorize_customer_login(customerLoginConnection, {
    body: {
      email: "testcustomer@example.com",
      password: "Password123!",
    },
  });
  // 3. Test with valid customer token (should fail with 403/401)
  const testWithValidToken = async () => {
    const customerWithToken: api.IConnection = {
      host: connection.host,
      headers: customerLoginConnection.headers,
    };
    await TestValidator.httpError(
      "customer should not access super admin status endpoint",
      [401, 403],
      async () =>
        await api.functional.shoppingMall.superAdmin.statuses.index(
          customerWithToken,
          {
            body: {},
          },
        ),
    );
  };
  await testWithValidToken();
  // 4. Test with invalid/malformed JWT token
  const testWithInvalidToken = async () => {
    const invalidTokenConnection: api.IConnection = {
      host: connection.host,
      headers: {
        authorization: "invalid-token-format",
      },
    };
    await TestValidator.httpError(
      "invalid token should be rejected",
      401,
      async () =>
        await api.functional.shoppingMall.superAdmin.statuses.index(
          invalidTokenConnection,
          {
            body: {},
          },
        ),
    );
  };
  await testWithInvalidToken();
  // 5. Test with empty token
  const testWithEmptyToken = async () => {
    const emptyTokenConnection: api.IConnection = {
      host: connection.host,
      headers: {
        authorization: "",
      },
    };
    await TestValidator.httpError(
      "empty token should be rejected",
      401,
      async () =>
        await api.functional.shoppingMall.superAdmin.statuses.index(
          emptyTokenConnection,
          {
            body: {},
          },
        ),
    );
  };
  await testWithEmptyToken();
  // 6. Test with missing token header
  const testWithMissingToken = async () => {
    const missingTokenConnection: api.IConnection = {
      host: connection.host,
      headers: {},
    };
    await TestValidator.httpError(
      "missing token should be rejected",
      401,
      async () =>
        await api.functional.shoppingMall.superAdmin.statuses.index(
          missingTokenConnection,
          {
            body: {},
          },
        ),
    );
  };
  await testWithMissingToken();
}
