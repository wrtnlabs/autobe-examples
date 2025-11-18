import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIShoppingMallCustomerSession } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallCustomerSession";
import type { IShoppingMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdmin";
import type { IShoppingMallAdminJoin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdminJoin";
import type { IShoppingMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomer";
import type { IShoppingMallCustomerJoin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomerJoin";
import type { IShoppingMallCustomerSession } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomerSession";

export async function test_api_admin_customer_sessions_requires_admin_role(
  connection: api.IConnection,
) {
  // 1. Register a new customer and obtain their authorized context
  const customerJoinBody = typia.random<IShoppingMallCustomerJoin.IRequest>();

  const customerAuthorized: IShoppingMallCustomer.IAuthorized =
    await api.functional.auth.customer.join(connection, {
      body: customerJoinBody,
    });
  typia.assert<IShoppingMallCustomer.IAuthorized>(customerAuthorized);

  const customerId = customerAuthorized.id;

  // 2. Attempt to call the admin sessions index as the customer (non-admin)
  //    This must fail because the endpoint is restricted to admin actors.
  await TestValidator.error(
    "customer actor cannot access admin customer sessions index",
    async () => {
      await api.functional.shoppingMall.admin.customers.sessions.index(
        connection,
        {
          customerId,
          body: typia.random<IShoppingMallCustomerSession.IRequest>(),
        },
      );
    },
  );

  // 3. Register a new admin, which also authenticates the connection as admin
  const adminJoinBody = typia.random<IShoppingMallAdminJoin.ICreate>();

  const adminAuthorized: IShoppingMallAdmin.IAuthorized =
    await api.functional.auth.admin.join(connection, {
      body: adminJoinBody,
    });
  typia.assert<IShoppingMallAdmin.IAuthorized>(adminAuthorized);

  // 4. As an admin, call the sessions index for the same customerId
  const page: IPageIShoppingMallCustomerSession.ISummary =
    await api.functional.shoppingMall.admin.customers.sessions.index(
      connection,
      {
        customerId,
        body: typia.random<IShoppingMallCustomerSession.IRequest>(),
      },
    );
  typia.assert<IPageIShoppingMallCustomerSession.ISummary>(page);

  // 5. Basic business validation: the page structure is consistent
  TestValidator.predicate(
    "pagination records non-negative",
    page.pagination.records >= 0,
  );
  TestValidator.predicate(
    "pagination limit positive",
    page.pagination.limit >= 0,
  );
  TestValidator.predicate(
    "pagination pages non-negative",
    page.pagination.pages >= 0,
  );
  TestValidator.predicate(
    "pagination current non-negative",
    page.pagination.current >= 0,
  );
}
