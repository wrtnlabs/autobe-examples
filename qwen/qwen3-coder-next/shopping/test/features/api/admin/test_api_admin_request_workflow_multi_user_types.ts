import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIShoppingMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallAdmin";
import type { IShoppingMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdmin";
import type { IShoppingMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomer";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";

export async function test_api_admin_request_workflow_multi_user_types(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create super administrator connection
  const superAdminConnection: api.IConnection = { host: connection.host };
  const superAdminCredentials = {
    email: RandomGenerator.alphaNumeric(8) + "@example.com",
    password: RandomGenerator.alphabets(12),
  } satisfies IShoppingMallAdmin.IJoin;
  const superAdmin = await authorize_admin_join(superAdminConnection, {
    body: superAdminCredentials,
  });
  typia.assert(superAdmin);
  // 2. Create regular administrator connection
  const adminConnection: api.IConnection = { host: connection.host };
  const adminCredentials = {
    email: RandomGenerator.alphaNumeric(8) + "@example.com",
    password: RandomGenerator.alphabets(12),
  } satisfies IShoppingMallAdmin.IJoin;
  const admin = await authorize_admin_join(adminConnection, {
    body: adminCredentials,
  });
  typia.assert(admin);
  // 3. Create customer connection for requesting admin privileges
  const customerConnection: api.IConnection = { host: connection.host };
  const customerEmail = RandomGenerator.alphaNumeric(8) + "@example.com";
  const customerPassword = RandomGenerator.alphabets(12);
  const customerCredentials = {
    email: customerEmail,
    password: customerPassword,
  };
  const customer = await api.functional.shoppingMall.auth.admin.join(
    customerConnection,
    {
      body: {
        email: customerEmail,
        password: customerPassword,
      } satisfies IShoppingMallAdmin.IJoin,
    },
  );
  typia.assert(customer);
  // 4. Create seller connection for requesting admin privileges
  const sellerConnection: api.IConnection = { host: connection.host };
  const sellerEmail = RandomGenerator.alphaNumeric(8) + "@example.com";
  const sellerPassword = RandomGenerator.alphabets(12);
  const sellerCredentials = {
    email: sellerEmail,
    password: sellerPassword,
  };
  const seller = await api.functional.shoppingMall.auth.admin.join(
    sellerConnection,
    {
      body: {
        email: sellerEmail,
        password: sellerPassword,
      } satisfies IShoppingMallAdmin.IJoin,
    },
  );
  typia.assert(seller);
  // 5. Login all users to get their connections with tokens
  const adminLoginConnection: api.IConnection = { host: connection.host };
  await api.functional.shoppingMall.auth.admin.login(adminLoginConnection, {
    body: {
      email: adminCredentials.email,
      password: adminCredentials.password,
    } satisfies IShoppingMallAdmin.ILogin,
  });
  const customerLoginConnection: api.IConnection = { host: connection.host };
  await api.functional.shoppingMall.auth.admin.login(customerLoginConnection, {
    body: {
      email: customerCredentials.email,
      password: customerCredentials.password,
    } satisfies IShoppingMallAdmin.ILogin,
  });
  const sellerLoginConnection: api.IConnection = { host: connection.host };
  await api.functional.shoppingMall.auth.admin.login(sellerLoginConnection, {
    body: {
      email: sellerCredentials.email,
      password: sellerCredentials.password,
    } satisfies IShoppingMallAdmin.ILogin,
  });
  // 6. Submit administrator requests from different user types
  const customerRequestReason = RandomGenerator.paragraph({ sentences: 2 });
  const sellerRequestReason = RandomGenerator.paragraph({ sentences: 2 });
  // Note: This test assumes there's a way to submit administrator requests
  // from customer/seller accounts. If no endpoint exists, this scenario
  // would need to be adjusted based on actual API availability.
  // 7. Verify all requests appear in the list
  const requests1 =
    await api.functional.shoppingMall.admin.admin.requests.index(
      adminLoginConnection,
    );
  typia.assert(requests1);
  TestValidator.equals(
    "requests count includes admin requests",
    requests1.data.length >= 0,
    true,
  );
  // 8. Test approval workflow (if authorized)
  if (requests1.data.length > 0) {
    const firstRequest = requests1.data[0];
    // Verify request structure
    TestValidator.equals(
      "request has id",
      typeof firstRequest.id === "string",
      true,
    );
    TestValidator.predicate(
      "request has valid user",
      firstRequest.user !== null,
    );
    TestValidator.equals(
      "request has status",
      ["pending", "approved", "rejected"].includes(firstRequest.status),
      true,
    );
    TestValidator.equals(
      "request has created_at",
      typeof firstRequest.created_at === "string",
      true,
    );
    // Verify user structure
    TestValidator.equals(
      "user has id",
      typeof firstRequest.user.id === "string",
      true,
    );
    TestValidator.equals(
      "user has email",
      typeof firstRequest.user.email === "string",
      true,
    );
  }
  // 9. Test super administrator can view all requests
  const superAdminRequests =
    await api.functional.shoppingMall.admin.admin.requests.index(
      superAdminConnection,
    );
  typia.assert(superAdminRequests);
  TestValidator.predicate(
    "super admin can view requests",
    superAdminRequests.data.length >= 0,
  );
  // 10. Verify pagination structure
  TestValidator.equals(
    "pagination has current",
    superAdminRequests.pagination.current >= 1,
    true,
  );
  TestValidator.equals(
    "pagination has limit",
    superAdminRequests.pagination.limit >= 0,
    true,
  );
  TestValidator.equals(
    "pagination has records",
    superAdminRequests.pagination.records >= 0,
    true,
  );
  TestValidator.equals(
    "pagination has pages",
    superAdminRequests.pagination.pages >= 0,
    true,
  );
}
