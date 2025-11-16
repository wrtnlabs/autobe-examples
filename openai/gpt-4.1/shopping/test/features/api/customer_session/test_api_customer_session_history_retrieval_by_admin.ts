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

/**
 * Validate that an administrator can retrieve and search all session history
 * records for a specific customer.
 *
 * 1. Register a new platform admin to obtain admin JWT tokens by calling
 *    api.functional.auth.admin.join.
 * 2. Attempt session history retrieval for a random customerId that does not exist
 *    (should yield 404 Not Found).
 * 3. Use the admin authentication to perform an advanced session history search
 *    for a random customerId, including pagination, ordering, date filtering,
 *    and search query.
 * 4. Validate the response is a paginated object
 *    (IPageIShoppingMallCustomerSession), with proper types.
 * 5. Edge case: When querying a truly new customerId, ensure the data array is
 *    empty, and paging values are correct (pages, records, etc.).
 * 6. Access control: Attempt session history retrieval as an unauthenticated
 *    (non-admin) user and confirm access is denied.
 */
export async function test_api_customer_session_history_retrieval_by_admin(
  connection: api.IConnection,
) {
  // 1. Register and authenticate as admin
  const adminEmail = `${RandomGenerator.alphabets(8)}@example.com`;
  const adminPassword = RandomGenerator.alphaNumeric(12);
  const adminName = RandomGenerator.name();
  const adminAuth = await api.functional.auth.admin.join(connection, {
    body: {
      email: adminEmail as string & tags.Format<"email">,
      password: adminPassword as string &
        tags.MinLength<8> &
        tags.Format<"password">,
      name: adminName as string & tags.MinLength<1>,
    },
  });
  typia.assert(adminAuth);

  // 2. Attempt session retrieval for non-existent customerId
  await TestValidator.error(
    "404 Not Found when searching session history for random customerId",
    async () => {
      await api.functional.shoppingMall.admin.customers.sessions.index(
        connection,
        {
          customerId: typia.random<string & tags.Format<"uuid">>(),
          body: {},
        },
      );
    },
  );

  // 3. Query for a random customerId (expect empty/edge-case result)
  //    - Filling in advanced search parameters with arbitrary (random) values
  const customerId = typia.random<string & tags.Format<"uuid">>();
  const body = {
    page: 1 as number & tags.Type<"int32">,
    limit: 10 as number & tags.Type<"int32">,
    search: RandomGenerator.alphabets(6),
    order_by: RandomGenerator.pick(["created_at", "expired_at", "ip"] as const),
    order: RandomGenerator.pick(["asc", "desc"] as const),
    filter_from: new Date(Date.now() - 1000 * 60 * 60 * 24 * 365).toISOString(),
    filter_to: new Date().toISOString(),
    filter_ip: "192.168.1.1",
  };
  const sessionPage =
    await api.functional.shoppingMall.admin.customers.sessions.index(
      connection,
      {
        customerId,
        body,
      },
    );

  typia.assert(sessionPage);

  TestValidator.equals(
    "sessionPage is well-typed (IPageIShoppingMallCustomerSession)",
    sessionPage,
    sessionPage,
  );
  TestValidator.predicate(
    "empty session data for unknown customerId results in data.length === 0",
    sessionPage.data.length === 0,
  );

  // 4. Attempt access as unauthenticated user (should fail)
  const unauthConn: api.IConnection = { ...connection, headers: {} };
  await TestValidator.error(
    "non-admin access to session history should fail",
    async () => {
      await api.functional.shoppingMall.admin.customers.sessions.index(
        unauthConn,
        {
          customerId,
          body: {},
        },
      );
    },
  );
}
