import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIShoppingMallCartItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallCartItem";
import type { IShoppingMallCartItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCartItem";
import type { IShoppingMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomer";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_customer_join } from "../../../authorize/authorize_customer_join";
import { authorize_customer_login } from "../../../authorize/authorize_customer_login";
import { authorize_customer_refresh } from "../../../authorize/authorize_customer_refresh";

export async function test_api_customer_cart_items_pagination_cursor_based(
  connection: api.IConnection,
): Promise<void> {
  // 1. Authenticate customer
  const customerConnection: api.IConnection = { host: connection.host };
  await authorize_customer_join(customerConnection, {
    body: typia.random<IShoppingMallCustomer.IJoin>(),
  });
  // 2. Fetch first page of cart items
  const firstPage: IPageIShoppingMallCartItem.ISummary =
    await api.functional.shoppingMall.customer.carts.index(customerConnection, {
      body: {} satisfies IShoppingMallCartItem.IRequest,
    });
  typia.assert(firstPage);
  // 3. Validate pagination metadata against actual data
  const itemCount = firstPage.data.length;
  TestValidator.equals(
    "pagination records match actual item count",
    firstPage.pagination.records,
    itemCount,
  );
  TestValidator.equals(
    "pagination limit equals default",
    firstPage.pagination.limit,
    10,
  );
  TestValidator.equals(
    "pagination pages calculated correctly",
    firstPage.pagination.pages,
    Math.ceil(itemCount / 10),
  );
  TestValidator.equals(
    "first page current page is 1",
    firstPage.pagination.current,
    1,
  );
  // 4. Validate pagination behavior: fetch second page if enough items
  if (itemCount > 10) {
    // Fetch second page (increment page by 1)
    const secondPage: IPageIShoppingMallCartItem.ISummary =
      await api.functional.shoppingMall.customer.carts.index(
        customerConnection,
        {
          body: {
            current: 2,
            limit: 10,
          } satisfies IShoppingMallCartItem.IRequest,
        },
      );
    typia.assert(secondPage);
    // Validate second page
    TestValidator.equals(
      "second page items",
      secondPage.data.length,
      Math.min(itemCount - 10, 10),
    );
    TestValidator.equals(
      "second page records",
      secondPage.pagination.records,
      itemCount,
    );
    TestValidator.equals(
      "second page pages",
      secondPage.pagination.pages,
      Math.ceil(itemCount / 10),
    );
    TestValidator.equals(
      "second page current page",
      secondPage.pagination.current,
      2,
    );
    // Validate no overlap between pages
    // Since ISummary only contains id and no other properties,
    // we compare the entire objects as unique identifiers
    const firstPageItems = firstPage.data;
    const secondPageItems = secondPage.data;
    const overlap = firstPageItems.some((item1) =>
      secondPageItems.some((item2) => item1 === item2),
    );
    TestValidator.predicate("no overlap between pages", !overlap);
    // Ensure the number of pages is greater than 1
    TestValidator.predicate(
      "more than one page when items > limit",
      firstPage.pagination.pages > 1,
    );
  } else {
    // Only one page expected
    TestValidator.equals(
      "single page current page",
      firstPage.pagination.current,
      1,
    );
    TestValidator.equals("single page pages", firstPage.pagination.pages, 1);
  }
}
