import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIShoppingMallOrderItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallOrderItem";
import type { IShoppingMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomer";
import type { IShoppingMallOrderItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrderItem";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_customer_join } from "../../../authorize/authorize_customer_join";
import { authorize_customer_login } from "../../../authorize/authorize_customer_login";
import { authorize_customer_refresh } from "../../../authorize/authorize_customer_refresh";

/**
 * Test filtered and paginated retrieval of order items within an existing order by an authenticated customer.
 *
 * Steps:
 * - Authenticate as a new customer via join operation.
 * - Query order items with pagination parameters.
 * - Verify pagination data structure is correct.
 * - Ensure authorization prevents access to other customers' order items.
 * - Validate robustness of the API against pagination.
 */
export async function test_api_customer_order_items_list_filtered_pagination(
  connection: api.IConnection,
): Promise<void> {
  // 1. Customer registration and authorization
  const customerConnection: api.IConnection = { host: connection.host };
  const authorized = await authorize_customer_join(customerConnection, {
    body: typia.random<IShoppingMallCustomer.IJoin>(),
  });
  typia.assert(authorized);
  customerConnection.headers ??= {};
  customerConnection.headers.Authorization = authorized.token.access;
  // 2. Since filters like status and variant ID are not defined in IRequest schema, we proceed with empty body
  // Generate a random UUID for orderId simulation
  const orderId = typia.random<string & tags.Format<"uuid">>();
  // 3. Compose empty filter body
  const filterRequest = {} satisfies IShoppingMallOrderItem.IRequest;
  // 4. Call the index API endpoint
  const response =
    await api.functional.shoppingMall.customer.orders.items.index(
      customerConnection,
      {
        orderId,
        body: filterRequest,
      },
    );
  typia.assert(response);
  // 5. Check pagination data
  const { pagination, data } = response;
  TestValidator.predicate(
    "pagination current page >= 0",
    pagination.current >= 0,
  );
  TestValidator.predicate("pagination limit >= 0", pagination.limit >= 0);
  TestValidator.predicate("pagination pages >= 0", pagination.pages >= 0);
  TestValidator.predicate("pagination records >= 0", pagination.records >= 0);
  // 6. Authorization test: Try to access other customer's order items
  const anotherCustomerConnection: api.IConnection = { host: connection.host };
  const anotherAuthorized = await authorize_customer_join(
    anotherCustomerConnection,
    {
      body: typia.random<IShoppingMallCustomer.IJoin>(),
    },
  );
  typia.assert(anotherAuthorized);
  anotherCustomerConnection.headers ??= {};
  anotherCustomerConnection.headers.Authorization =
    anotherAuthorized.token.access;
  // 7. Attempt to fetch order items with another customer's token
  await TestValidator.error(
    "should prevent access to other customers' order items",
    async () => {
      await api.functional.shoppingMall.customer.orders.items.index(
        anotherCustomerConnection,
        {
          orderId,
          body: filterRequest,
        },
      );
    },
  );
}
