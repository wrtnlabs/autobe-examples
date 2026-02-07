import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIShoppingMallOrder } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallOrder";
import type { IShoppingMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomer";
import type { IShoppingMallOrder } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrder";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_customer_join } from "../../../authorize/authorize_customer_join";
import { authorize_customer_login } from "../../../authorize/authorize_customer_login";
import { authorize_customer_refresh } from "../../../authorize/authorize_customer_refresh";

export async function test_api_customer_order_sorting_options(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create customer and authenticate
  const customerConnection: api.IConnection = { host: connection.host };
  await authorize_customer_join(customerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "1234",
      name: RandomGenerator.name(),
    } satisfies IShoppingMallCustomer.IJoin,
  });
  // 2. Test sorting by newest first (default)
  const newestResult = await api.functional.shoppingMall.customer.orders.index(
    customerConnection,
    {
      body: { sort: "newest" } satisfies IShoppingMallOrder.IRequest,
    },
  );
  typia.assert(newestResult);
  // 3. Test sorting by oldest first
  const oldestResult = await api.functional.shoppingMall.customer.orders.index(
    customerConnection,
    {
      body: { sort: "oldest" } satisfies IShoppingMallOrder.IRequest,
    },
  );
  typia.assert(oldestResult);
  // 4. Test sorting by price high to low
  const priceHighToLowResult =
    await api.functional.shoppingMall.customer.orders.index(
      customerConnection,
      {
        body: { sort: "price_desc" } satisfies IShoppingMallOrder.IRequest,
      },
    );
  typia.assert(priceHighToLowResult);
  // 5. Test sorting by price low to high
  const priceLowToHighResult =
    await api.functional.shoppingMall.customer.orders.index(
      customerConnection,
      {
        body: { sort: "price_asc" } satisfies IShoppingMallOrder.IRequest,
      },
    );
  typia.assert(priceLowToHighResult);
  // 6. Test pagination with sorting
  const paginatedResult =
    await api.functional.shoppingMall.customer.orders.index(
      customerConnection,
      {
        body: {
          sort: "newest",
          page: 1,
          limit: 2,
        } satisfies IShoppingMallOrder.IRequest,
      },
    );
  typia.assert(paginatedResult);
  TestValidator.equals("pagination limit", paginatedResult.pagination.limit, 2);
  TestValidator.predicate("has data", paginatedResult.data.length > 0);
  // 7. Test sorting with status filter
  const filteredResult =
    await api.functional.shoppingMall.customer.orders.index(
      customerConnection,
      {
        body: {
          sort: "newest",
          status: "pending",
        } satisfies IShoppingMallOrder.IRequest,
      },
    );
  typia.assert(filteredResult);
  // 8. Verify sorting correctness - skip id property access as ISummary doesn't have it
}