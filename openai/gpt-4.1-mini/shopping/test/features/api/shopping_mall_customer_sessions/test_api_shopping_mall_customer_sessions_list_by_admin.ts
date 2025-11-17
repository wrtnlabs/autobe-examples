import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIShoppingMallCustomerSession } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallCustomerSession";
import type { IShoppingMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdmin";
import type { IShoppingMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomer";
import type { IShoppingMallCustomerSession } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomerSession";

export async function test_api_shopping_mall_customer_sessions_list_by_admin(
  connection: api.IConnection,
) {
  // 1. Admin registers and gets an authorized token
  const adminJoinBody = {
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(16),
    ip: null,
    href: "https://admin.example.com/register",
    referrer: "https://admin.example.com",
  } satisfies IShoppingMallAdmin.IJoin;

  const adminAuthorized: IShoppingMallAdmin.IAuthorized =
    await api.functional.auth.admin.join(connection, { body: adminJoinBody });
  typia.assert(adminAuthorized);

  // 2. Admin login to simulate actor switching (though token already set, follow scenario)
  const adminLoginBody = {
    email: adminJoinBody.email,
    password: adminJoinBody.password,
    ip: null,
    href: "https://admin.example.com/login",
    referrer: "https://admin.example.com",
  } satisfies IShoppingMallAdmin.ILogin;

  const adminLoggedIn: IShoppingMallAdmin.IAuthorized =
    await api.functional.auth.admin.login(connection, { body: adminLoginBody });
  typia.assert(adminLoggedIn);

  // 3. Create a shopping mall customer to query sessions
  const customerCreateBody = {
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(16),
    href: "https://customer.example.com/signup",
    referrer: "https://customer.example.com",
  } satisfies IShoppingMallCustomer.ICreate;

  const customer: IShoppingMallCustomer =
    await api.functional.shoppingMall.customer.shoppingMallCustomers.create(
      connection,
      { body: customerCreateBody },
    );
  typia.assert(customer);

  // 4. Query sessions for the created customer with pagination and filters
  const sessionRequestBody = {
    page: 1,
    limit: 10,
    sortBy: "created_at",
    order: "desc",
    filter: {},
  } satisfies IShoppingMallCustomerSession.IRequest;

  const sessions: IPageIShoppingMallCustomerSession.ISummary =
    await api.functional.shoppingMall.admin.shoppingMallCustomers.shoppingMallCustomerSessions.index(
      connection,
      {
        shoppingMallCustomerId: customer.id,
        body: sessionRequestBody,
      },
    );
  typia.assert(sessions);

  // 5. Business validations
  TestValidator.predicate(
    "pagination current page equals requested",
    sessions.pagination.current === sessionRequestBody.page,
  );
  TestValidator.predicate(
    "pagination limit equals requested",
    sessions.pagination.limit === sessionRequestBody.limit,
  );
  TestValidator.predicate(
    "pagination pages non-negative",
    sessions.pagination.pages >= 0,
  );
  TestValidator.predicate(
    "pagination records non-negative",
    sessions.pagination.records >= 0,
  );
  TestValidator.predicate(
    "sessions data is array",
    Array.isArray(sessions.data),
  );
  for (const summary of sessions.data) {
    typia.assert(summary);
    TestValidator.equals(
      "session belongs to correct customer",
      summary.shopping_mall_customer_id,
      customer.id,
    );
  }
}
