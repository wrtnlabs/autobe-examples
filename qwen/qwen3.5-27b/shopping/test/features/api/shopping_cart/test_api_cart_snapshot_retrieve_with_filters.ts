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
 * Test retrieving cart item snapshots with various filters for an authenticated customer.
 *
 * 1. Authenticate as customer using /shoppingMall/auth/customer/join
 * 2. Create a cart item by adding a product variant to cart
 * 3. Call the target endpoint with different filter combinations:
 *    - No filters (should return all snapshots, newest first)
 *    - Date range filter (from/to)
 *    - Quantity range filter (min/max)
 *    - Combined filters
 * 4. Verify pagination metadata is correct (current, limit, records, pages)
 * 5. Verify snapshots are sorted by created_at descending
 * 6. Verify each snapshot contains required fields
 * 7. Verify customer can only access their own cart item snapshots
 */
export async function test_api_cart_snapshot_retrieve_with_filters(
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
  // 2. Create a cart item to generate snapshots
  const cartItem =
    await generate_random_shopping_mall_customer_customers_me_cart_items_create(
      customerConnection,
      {},
    );
  typia.assert(cartItem);
  TestValidator.equals("cart item created", cartItem.quantity >= 1, true);
  // 3. Test retrieving snapshots with no filters
  const allSnapshots =
    await api.functional.shoppingMall.customer.cart_items.snapshots.index(
      customerConnection,
      {
        cartItemId: cartItem.id,
        body: {} satisfies IShoppingMallCartSnapshot.IRequest,
      },
    );
  typia.assert(allSnapshots);
  TestValidator.predicate(
    "pagination has valid current page",
    allSnapshots.pagination.current >= 1,
  );
  TestValidator.predicate(
    "pagination has valid limit",
    allSnapshots.pagination.limit >= 1,
  );
  TestValidator.predicate(
    "pagination has valid records count",
    allSnapshots.pagination.records >= 0,
  );
  TestValidator.predicate(
    "pagination has valid pages count",
    allSnapshots.pagination.pages >= 0,
  );
  // 4. Test with date range filter
  const now = new Date();
  const oneDayAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);
  const twoDaysAgo = new Date(now.getTime() - 2 * 24 * 60 * 60 * 1000);
  const dateFilteredSnapshots =
    await api.functional.shoppingMall.customer.cart_items.snapshots.index(
      customerConnection,
      {
        cartItemId: cartItem.id,
        body: {
          from: twoDaysAgo.toISOString(),
          to: now.toISOString(),
        } satisfies IShoppingMallCartSnapshot.IRequest,
      },
    );
  typia.assert(dateFilteredSnapshots);
  TestValidator.predicate(
    "date filtered snapshots has valid pagination",
    dateFilteredSnapshots.pagination.current >= 1,
  );
  // 5. Test with quantity range filter
  const quantityFilteredSnapshots =
    await api.functional.shoppingMall.customer.cart_items.snapshots.index(
      customerConnection,
      {
        cartItemId: cartItem.id,
        body: {
          min: 1,
          max: 100,
        } satisfies IShoppingMallCartSnapshot.IRequest,
      },
    );
  typia.assert(quantityFilteredSnapshots);
  TestValidator.predicate(
    "quantity filtered snapshots has valid pagination",
    quantityFilteredSnapshots.pagination.current >= 1,
  );
  // 6. Test with combined filters (date range + quantity range + pagination)
  const combinedFilteredSnapshots =
    await api.functional.shoppingMall.customer.cart_items.snapshots.index(
      customerConnection,
      {
        cartItemId: cartItem.id,
        body: {
          page: 1,
          limit: 10,
          from: oneDayAgo.toISOString(),
          to: now.toISOString(),
          min: 1,
          max: 50,
        } satisfies IShoppingMallCartSnapshot.IRequest,
      },
    );
  typia.assert(combinedFilteredSnapshots);
  TestValidator.equals(
    "pagination current matches request",
    combinedFilteredSnapshots.pagination.current,
    1,
  );
  TestValidator.equals(
    "pagination limit matches request",
    combinedFilteredSnapshots.pagination.limit,
    10,
  );
  // 7. Verify snapshots are sorted by created_at descending
  if (allSnapshots.data.length > 1) {
    for (let i = 1; i < allSnapshots.data.length; i++) {
      TestValidator.predicate(
        `snapshot ${i} created_at <= snapshot ${i - 1} created_at`,
        new Date(allSnapshots.data[i].created_at).getTime() <=
          new Date(allSnapshots.data[i - 1].created_at).getTime(),
      );
    }
  }
  // 8. Verify each snapshot contains required fields
  for (const snapshot of allSnapshots.data) {
    TestValidator.predicate(
      "snapshot has valid id",
      snapshot.id !== null && snapshot.id !== undefined,
    );
    TestValidator.predicate(
      "snapshot has sku_code",
      snapshot.sku_code !== null && snapshot.sku_code !== undefined,
    );
    TestValidator.predicate(
      "snapshot has option_values",
      snapshot.option_values !== null && snapshot.option_values !== undefined,
    );
    TestValidator.predicate(
      "snapshot has price_at_snapshot",
      snapshot.price_at_snapshot !== null &&
        snapshot.price_at_snapshot !== undefined,
    );
    TestValidator.predicate(
      "snapshot has quantity",
      snapshot.quantity !== null && snapshot.quantity !== undefined,
    );
    TestValidator.predicate(
      "snapshot has customer",
      snapshot.customer !== null && snapshot.customer !== undefined,
    );
    TestValidator.predicate(
      "snapshot has created_at",
      snapshot.created_at !== null && snapshot.created_at !== undefined,
    );
  }
  // 9. Verify customer ownership - snapshots belong to authenticated customer
  if (allSnapshots.data.length > 0) {
    TestValidator.equals(
      "snapshot customer matches authenticated customer",
      allSnapshots.data[0].customer.id,
      cartItem.product.seller.id,
    );
  }
}
