import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIShoppingMallOrderItemSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallOrderItemSnapshot";
import type { IShoppingMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomer";
import type { IShoppingMallOrderItemSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrderItemSnapshot";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_customer_join } from "../../../authorize/authorize_customer_join";
import { authorize_customer_login } from "../../../authorize/authorize_customer_login";
import { authorize_customer_refresh } from "../../../authorize/authorize_customer_refresh";

export async function test_api_customer_order_item_snapshots_filter_by_product_and_date(
  connection: api.IConnection,
): Promise<void> {
  // 1. Register a new customer to obtain authentication
  const customerConnection: api.IConnection = { host: connection.host };
  const registeredCustomer = await authorize_customer_join(customerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
    } satisfies IShoppingMallCustomer.IJoin,
  });
  typia.assert(registeredCustomer);
  // Generate a random product ID for filtering (scenario requirement)
  const product_id = typia.random<string & tags.Format<"uuid">>();
  // Define time range based on current time
  const now = new Date().toISOString();
  const oneWeekAgo = new Date(
    Date.now() - 7 * 24 * 60 * 60 * 1000,
  ).toISOString();
  // Call the endpoint to fetch order item snapshots filtered by product_id and date range
  const snapshotRequest: IShoppingMallOrderItemSnapshot.IRequest = {
    product_id,
    created_at_from: oneWeekAgo,
    created_at_to: now,
    page: 1,
    limit: 20,
  } satisfies IShoppingMallOrderItemSnapshot.IRequest;
  const response =
    await api.functional.shoppingMall.customer.order_item_snapshots.index(
      customerConnection,
      { body: snapshotRequest },
    );
  typia.assert(response);
  // 5. Validate pagination structure
  TestValidator.equals("page is 1", response.pagination.current, 1);
  TestValidator.equals("limit is 20", response.pagination.limit, 20);
  TestValidator.predicate(
    "pagination records is non-negative",
    response.pagination.records >= 0,
  );
  TestValidator.predicate(
    "pages is non-negative",
    response.pagination.pages >= 0,
  );
  // 6. Validate date range filtering: all snapshots should be within the specified date range
  // Since product_id field cannot be validated (not in ISummary), we validate only date range
  if (response.data.length > 0) {
    const allInRange = response.data.every((snapshot) => {
      const snapshotDate = new Date(snapshot.created_at);
      const fromDate = new Date(oneWeekAgo);
      const toDate = new Date(now);
      return snapshotDate >= fromDate && snapshotDate <= toDate;
    });
    TestValidator.predicate("all snapshots within date range", allInRange);
  }
  // 7. Validate pagination cursor stability - try second page if possible
  if (response.pagination.records > response.pagination.limit) {
    // Request second page
    const secondPageRequest: IShoppingMallOrderItemSnapshot.IRequest = {
      product_id,
      created_at_from: oneWeekAgo,
      created_at_to: now,
      page: 2,
      limit: response.pagination.limit,
    } satisfies IShoppingMallOrderItemSnapshot.IRequest;
    const secondResponse =
      await api.functional.shoppingMall.customer.order_item_snapshots.index(
        customerConnection,
        { body: secondPageRequest },
      );
    typia.assert(secondResponse);
    // Assert that first page's last item is different from second page's first item
    TestValidator.notEquals(
      "pagination cursor stability",
      response.data[response.data.length - 1].created_at,
      secondResponse.data[0].created_at,
    );
    TestValidator.predicate(
      "second page has data",
      secondResponse.data.length > 0,
    );
  }
}
