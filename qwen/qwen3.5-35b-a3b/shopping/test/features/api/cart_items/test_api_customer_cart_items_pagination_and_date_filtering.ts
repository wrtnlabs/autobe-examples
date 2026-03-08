import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEcommerceMallCartItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCartItem";
import type { IEcommerceMallCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCategory";
import type { IEcommerceMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCustomer";
import type { IEcommerceMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProduct";
import type { IEcommerceMallProductVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProductVariant";
import type { IEcommerceMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSeller";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIEcommerceMallCartItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIEcommerceMallCartItem";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_customer_join } from "../../../authorize/authorize_customer_join";
import { authorize_customer_login } from "../../../authorize/authorize_customer_login";
import { authorize_customer_refresh } from "../../../authorize/authorize_customer_refresh";

/**
 * Test cart item retrieval with pagination and filtering.
 *
 * Prerequisites:
 * 1. Customer registers via /auth/customer/join
 * 2. Customer logs in via /auth/customer/login (cart auto-created on login)
 * 3. Cart items are retrieved with pagination and filter options
 *
 * Note: Since no cart items creation API is available, we test pagination
 * and filtering with an empty cart to validate the API response structure.
 */
export async function test_api_customer_cart_items_pagination_and_date_filtering(
  connection: api.IConnection,
): Promise<void> {
  // 1. Customer registration
  const joinConnection: api.IConnection = { host: connection.host };
  const joinResult = await authorize_customer_join(joinConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "Test123!",
      href: "http://localhost/cart-test",
      referrer: "http://localhost/cart-test",
    } satisfies IEcommerceMallCustomer.IJoin,
  });
  typia.assert(joinResult);
  // 2. Customer login (auto-cart creation)
  const loginConnection: api.IConnection = { host: connection.host };
  const loginResult = await authorize_customer_login(loginConnection, {
    body: {
      email: joinResult.email,
      password: "Test123!",
    } satisfies IEcommerceMallCustomer.ILogin,
  });
  typia.assert(loginResult);
  // Create customer connection with auth token
  const customerConnection: api.IConnection = { host: connection.host };
  customerConnection.headers = { Authorization: loginResult.token.access };
  // Generate a valid cartId (simulating the auto-created cart)
  const cartId = typia.random<string & tags.Format<"uuid">>();
  // 3. Test pagination - page 1, limit 2 (empty cart scenario)
  const cartItemsPage1 =
    await api.functional.ecommerceMall.customer.carts.cartItems.index(
      customerConnection,
      {
        cartId,
        body: {
          page: 1,
          limit: 2,
        } satisfies IEcommerceMallCartItem.IRequest,
      },
    );
  typia.assert(cartItemsPage1);
  TestValidator.equals(
    "page 1: current page",
    cartItemsPage1.pagination.current,
    1,
  );
  TestValidator.equals("page 1: limit", cartItemsPage1.pagination.limit, 2);
  TestValidator.equals(
    "page 1: total records (empty cart)",
    cartItemsPage1.pagination.records,
    0,
  );
  TestValidator.equals(
    "page 1: total pages (empty cart)",
    cartItemsPage1.pagination.pages,
    0,
  );
  TestValidator.equals(
    "page 1: data is empty array",
    cartItemsPage1.data.length,
    0,
  );
  // 4. Test pagination - page 2 (should also return empty)
  const cartItemsPage2 =
    await api.functional.ecommerceMall.customer.carts.cartItems.index(
      customerConnection,
      {
        cartId,
        body: {
          page: 2,
          limit: 2,
        } satisfies IEcommerceMallCartItem.IRequest,
      },
    );
  typia.assert(cartItemsPage2);
  TestValidator.equals(
    "page 2: current page",
    cartItemsPage2.pagination.current,
    2,
  );
  TestValidator.equals(
    "page 2: total records (empty cart)",
    cartItemsPage2.pagination.records,
    0,
  );
  // 5. Test sorting - createdAt_asc (oldest first)
  const sortedAscItems =
    await api.functional.ecommerceMall.customer.carts.cartItems.index(
      customerConnection,
      {
        cartId,
        body: {
          sortOrder: "createdAt_asc",
        } satisfies IEcommerceMallCartItem.IRequest,
      },
    );
  typia.assert(sortedAscItems);
  TestValidator.equals(
    "sort asc: current page",
    sortedAscItems.pagination.current,
    1,
  );
  TestValidator.equals("sort asc: limit", sortedAscItems.pagination.limit, 100);
  TestValidator.equals(
    "sort asc: data is empty",
    sortedAscItems.data.length,
    0,
  );
  // 6. Test sorting - createdAt_desc (newest first, default)
  const sortedDescItems =
    await api.functional.ecommerceMall.customer.carts.cartItems.index(
      customerConnection,
      {
        cartId,
        body: {
          sortOrder: "createdAt_desc",
        } satisfies IEcommerceMallCartItem.IRequest,
      },
    );
  typia.assert(sortedDescItems);
  TestValidator.equals(
    "sort desc: current page",
    sortedDescItems.pagination.current,
    1,
  );
  TestValidator.equals(
    "sort desc: data is empty",
    sortedDescItems.data.length,
    0,
  );
  // 7. Test availability filter
  const availableFilteredItems =
    await api.functional.ecommerceMall.customer.carts.cartItems.index(
      customerConnection,
      {
        cartId,
        body: {
          availability: "available",
        } satisfies IEcommerceMallCartItem.IRequest,
      },
    );
  typia.assert(availableFilteredItems);
  TestValidator.equals(
    "filter available: current page",
    availableFilteredItems.pagination.current,
    1,
  );
  TestValidator.equals(
    "filter available: data is empty",
    availableFilteredItems.data.length,
    0,
  );
  // 8. Test default pagination parameters (no page/limit specified)
  const defaultItems =
    await api.functional.ecommerceMall.customer.carts.cartItems.index(
      customerConnection,
      {
        cartId,
        body: typia.random<IEcommerceMallCartItem.IRequest>(),
      },
    );
  typia.assert(defaultItems);
  TestValidator.equals(
    "default pagination: current page",
    defaultItems.pagination.current,
    1,
  );
  // 9. Test date range filtering
  const itemAddedSince = new Date(
    Date.now() - 1000 * 60 * 60 * 24,
  ).toISOString(); // 1 day ago
  const itemAddedBefore = new Date(
    Date.now() + 1000 * 60 * 60 * 24,
  ).toISOString(); // 1 day in future
  const dateFilteredItems =
    await api.functional.ecommerceMall.customer.carts.cartItems.index(
      customerConnection,
      {
        cartId,
        body: {
          variantAddedSince: itemAddedSince,
          variantAddedBefore: itemAddedBefore,
        } satisfies IEcommerceMallCartItem.IRequest,
      },
    );
  typia.assert(dateFilteredItems);
  TestValidator.equals(
    "date filter: current page",
    dateFilteredItems.pagination.current,
    1,
  );
  TestValidator.equals(
    "date filter: data is empty",
    dateFilteredItems.data.length,
    0,
  );
}
