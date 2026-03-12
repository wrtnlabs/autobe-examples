import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIShoppingMallCartSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallCartSnapshot";
import type { IShoppingMallCartItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCartItem";
import type { IShoppingMallCartSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCartSnapshot";
import type { IShoppingMallCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCategory";
import type { IShoppingMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomer";
import type { IShoppingMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProduct";
import type { IShoppingMallProductVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductVariant";
import type { IShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSeller";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_customer_join } from "../../../authorize/authorize_customer_join";
import { authorize_customer_login } from "../../../authorize/authorize_customer_login";
import { authorize_customer_refresh } from "../../../authorize/authorize_customer_refresh";
import { generate_random_shopping_mall_customer_customers_me_cart_items_create } from "../../../generate/generate_random_shopping_mall_customer_customers_me_cart_items_create";
import { prepare_random_shopping_mall_cart_item } from "../../../prepare/prepare_random_shopping_mall_cart_item";

/**
 * Test pagination behavior and edge cases for cart item snapshot retrieval.
 * 1. Authenticate as customer
 * 2. Create multiple cart items to generate snapshots
 * 3. Test pagination scenarios (default, custom limits, multi-page navigation)
 * 4. Test edge cases (no snapshots, invalid cartItemId, unauthorized access, empty filters)
 * 5. Verify pagination metadata accuracy and sorting consistency
 */
export async function test_api_cart_snapshot_pagination_and_edge_cases(
  connection: api.IConnection,
): Promise<void> {
  // 1. Authenticate as customer
  const customerConnection: api.IConnection = { host: connection.host };
  await authorize_customer_join(customerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      display_name: RandomGenerator.name(),
      phone_number: RandomGenerator.mobile(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    } satisfies IShoppingMallCustomer.IJoin,
  });
  // 2. Create multiple cart items to generate snapshots
  const cartItems: IShoppingMallCartItem[] = [];
  for (let i = 0; i < 5; i++) {
    const cartItem =
      await generate_random_shopping_mall_customer_customers_me_cart_items_create(
        customerConnection,
        {},
      );
    typia.assert(cartItem);
    cartItems.push(cartItem);
  }
  // 3. Test pagination scenarios
  // 3.1 Default pagination (page=1, limit=20)
  const defaultPagination =
    await api.functional.shoppingMall.customer.cart_items.snapshots.index(
      customerConnection,
      {
        cartItemId: cartItems[0].id,
        body: {} satisfies IShoppingMallCartSnapshot.IRequest,
      },
    );
  typia.assert(defaultPagination);
  TestValidator.equals("default page", defaultPagination.pagination.current, 1);
  TestValidator.equals("default limit", defaultPagination.pagination.limit, 20);
  // 3.2 Custom page sizes
  const smallLimit =
    await api.functional.shoppingMall.customer.cart_items.snapshots.index(
      customerConnection,
      {
        cartItemId: cartItems[0].id,
        body: { limit: 1 } satisfies IShoppingMallCartSnapshot.IRequest,
      },
    );
  typia.assert(smallLimit);
  TestValidator.equals("small limit", smallLimit.pagination.limit, 1);
  const mediumLimit =
    await api.functional.shoppingMall.customer.cart_items.snapshots.index(
      customerConnection,
      {
        cartItemId: cartItems[0].id,
        body: { limit: 50 } satisfies IShoppingMallCartSnapshot.IRequest,
      },
    );
  typia.assert(mediumLimit);
  TestValidator.equals("medium limit", mediumLimit.pagination.limit, 50);
  const largeLimit =
    await api.functional.shoppingMall.customer.cart_items.snapshots.index(
      customerConnection,
      {
        cartItemId: cartItems[0].id,
        body: { limit: 100 } satisfies IShoppingMallCartSnapshot.IRequest,
      },
    );
  typia.assert(largeLimit);
  TestValidator.equals("large limit", largeLimit.pagination.limit, 100);
  // 3.3 Navigate through multiple pages
  const page1 =
    await api.functional.shoppingMall.customer.cart_items.snapshots.index(
      customerConnection,
      {
        cartItemId: cartItems[0].id,
        body: {
          page: 1,
          limit: 2,
        } satisfies IShoppingMallCartSnapshot.IRequest,
      },
    );
  typia.assert(page1);
  TestValidator.equals("page 1 current", page1.pagination.current, 1);
  const page2 =
    await api.functional.shoppingMall.customer.cart_items.snapshots.index(
      customerConnection,
      {
        cartItemId: cartItems[0].id,
        body: {
          page: 2,
          limit: 2,
        } satisfies IShoppingMallCartSnapshot.IRequest,
      },
    );
  typia.assert(page2);
  TestValidator.equals("page 2 current", page2.pagination.current, 2);
  // 3.4 Request page beyond available data
  const beyondPage =
    await api.functional.shoppingMall.customer.cart_items.snapshots.index(
      customerConnection,
      {
        cartItemId: cartItems[0].id,
        body: {
          page: 999,
          limit: 1,
        } satisfies IShoppingMallCartSnapshot.IRequest,
      },
    );
  typia.assert(beyondPage);
  TestValidator.equals(
    "beyond page current",
    beyondPage.pagination.current,
    999,
  );
  TestValidator.equals("beyond page data empty", beyondPage.data.length, 0);
  // 4. Test edge cases
  // 4.1 Cart item with no snapshots (just created)
  const newCartItem =
    await generate_random_shopping_mall_customer_customers_me_cart_items_create(
      customerConnection,
      {},
    );
  typia.assert(newCartItem);
  const noSnapshots =
    await api.functional.shoppingMall.customer.cart_items.snapshots.index(
      customerConnection,
      {
        cartItemId: newCartItem.id,
        body: {} satisfies IShoppingMallCartSnapshot.IRequest,
      },
    );
  typia.assert(noSnapshots);
  TestValidator.equals("no snapshots data empty", noSnapshots.data.length, 0);
  TestValidator.equals(
    "no snapshots records",
    noSnapshots.pagination.records,
    0,
  );
  // 4.2 Invalid cartItemId (should return 404)
  await TestValidator.httpError(
    "invalid cartItemId returns 404",
    404,
    async () => {
      await api.functional.shoppingMall.customer.cart_items.snapshots.index(
        customerConnection,
        {
          cartItemId: typia.random<string & tags.Format<"uuid">>(),
          body: {} satisfies IShoppingMallCartSnapshot.IRequest,
        },
      );
    },
  );
  // 4.3 Access another customer's cart item snapshots (should return 403)
  const otherCustomerConnection: api.IConnection = { host: connection.host };
  await authorize_customer_join(otherCustomerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      display_name: RandomGenerator.name(),
      phone_number: RandomGenerator.mobile(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    } satisfies IShoppingMallCustomer.IJoin,
  });
  await TestValidator.httpError(
    "accessing other customer cart returns 403",
    403,
    async () => {
      await api.functional.shoppingMall.customer.cart_items.snapshots.index(
        otherCustomerConnection,
        {
          cartItemId: cartItems[0].id,
          body: {} satisfies IShoppingMallCartSnapshot.IRequest,
        },
      );
    },
  );
  // 4.4 Empty filter results (date range with no matching snapshots)
  const futureDate = new Date(Date.now() + 86400000 * 365).toISOString();
  const emptyFilter =
    await api.functional.shoppingMall.customer.cart_items.snapshots.index(
      customerConnection,
      {
        cartItemId: cartItems[0].id,
        body: {
          from: futureDate,
          to: futureDate,
        } satisfies IShoppingMallCartSnapshot.IRequest,
      },
    );
  typia.assert(emptyFilter);
  TestValidator.equals("empty filter data", emptyFilter.data.length, 0);
  TestValidator.equals(
    "empty filter records",
    emptyFilter.pagination.records,
    0,
  );
  // 5. Verify pagination metadata accuracy
  const testPagination =
    await api.functional.shoppingMall.customer.cart_items.snapshots.index(
      customerConnection,
      {
        cartItemId: cartItems[0].id,
        body: {
          page: 3,
          limit: 5,
        } satisfies IShoppingMallCartSnapshot.IRequest,
      },
    );
  typia.assert(testPagination);
  TestValidator.equals(
    "pagination current matches request",
    testPagination.pagination.current,
    3,
  );
  TestValidator.equals(
    "pagination limit matches request",
    testPagination.pagination.limit,
    5,
  );
  TestValidator.predicate(
    "pages calculated correctly",
    testPagination.pagination.pages ===
      Math.ceil(
        testPagination.pagination.records / testPagination.pagination.limit,
      ),
  );
  // 6. Verify sorting is consistent (newest snapshots first)
  const sortedCheck =
    await api.functional.shoppingMall.customer.cart_items.snapshots.index(
      customerConnection,
      {
        cartItemId: cartItems[0].id,
        body: { limit: 10 } satisfies IShoppingMallCartSnapshot.IRequest,
      },
    );
  typia.assert(sortedCheck);
  if (sortedCheck.data.length > 1) {
    for (let i = 1; i < sortedCheck.data.length; i++) {
      TestValidator.predicate(
        `snapshot ${i} is not newer than snapshot ${i - 1}`,
        new Date(sortedCheck.data[i].created_at).getTime() <=
          new Date(sortedCheck.data[i - 1].created_at).getTime(),
      );
    }
  }
}
