import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIShoppingMallCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallCategory";
import type { IShoppingMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdmin";
import type { IShoppingMallCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCategory";
import type { IShoppingMallUser } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallUser";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";

export async function test_api_admin_user_list_unauthorized_access(
  connection: api.IConnection,
): Promise<void> {
  // Scenario: Non-admin user attempts to access the admin/user listing endpoint. Verifies that 401 Unauthorized is returned. Then validates that when admin authenticates via /auth/admin/join, the same request succeeds. Ensures that no authentication bypass is possible, even with valid session tokens from other roles (customer/seller).
  // Step 1: Attempt access as non-admin (default connection has no auth)
  // This should fail with 401 Unauthorized
  await TestValidator.httpError(
    "Non-admin user should get 401 when accessing admin/user endpoint",
    401,
    async () => {
      await api.functional.shoppingMall.admin.users.index(connection, {
        body: {},
      });
    },
  );
  // Step 2: Create admin connection and register a new admin
  const adminConnection: api.IConnection = { host: connection.host };
  const adminAuth: IShoppingMallAdmin.IAuthorized = await authorize_admin_join(
    adminConnection,
    {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        password: RandomGenerator.alphaNumeric(16),
      } satisfies IShoppingMallAdmin.IJoin,
    },
  );
  typia.assert(adminAuth);
  // Step 3: Now use the admin-authenticated connection to access the endpoint
  // This should succeed with 200 OK
  const adminUsers = await api.functional.shoppingMall.admin.users.index(
    adminConnection,
    {
      body: {},
    },
  );
  typia.assert(adminUsers);
  // Step 4: Verify that session tokens from other roles (customer/seller) cannot bypass
  // First, create a customer and get a valid session
  const customerConnection: api.IConnection = { host: connection.host };
  const customerEmail = typia.random<string & tags.Format<"email">>();
  await api.functional.shoppingMall.auth.admin.join(customerConnection, {
    body: {
      email: customerEmail,
      password: RandomGenerator.alphaNumeric(16),
    } satisfies IShoppingMallAdmin.IJoin,
  });
  // Attempt to use customer connection to access admin endpoint (should fail)
  await TestValidator.httpError(
    "Customer session should be rejected when accessing admin/user endpoint",
    401,
    async () => {
      await api.functional.shoppingMall.admin.users.index(customerConnection, {
        body: {},
      });
    },
  );
  // Create a seller and get a valid session
  const sellerConnection: api.IConnection = { host: connection.host };
  const sellerEmail = typia.random<string & tags.Format<"email">>();
  await api.functional.shoppingMall.auth.admin.join(sellerConnection, {
    body: {
      email: sellerEmail,
      password: RandomGenerator.alphaNumeric(16),
    } satisfies IShoppingMallAdmin.IJoin,
  });
  // Attempt to use seller connection to access admin endpoint (should fail)
  await TestValidator.httpError(
    "Seller session should be rejected when accessing admin/user endpoint",
    401,
    async () => {
      await api.functional.shoppingMall.admin.users.index(sellerConnection, {
        body: {},
      });
    },
  );
  // Step 5: Confirm admin connection is still valid
  const finalAdminUsers = await api.functional.shoppingMall.admin.users.index(
    adminConnection,
    {
      body: {},
    },
  );
  typia.assert(finalAdminUsers);
}
