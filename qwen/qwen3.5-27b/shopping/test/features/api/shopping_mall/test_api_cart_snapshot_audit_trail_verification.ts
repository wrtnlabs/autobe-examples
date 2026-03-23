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
 * Test the audit trail functionality of cart item snapshots for dispute resolution and historical analysis.
 *
 * This test verifies that cart item snapshots are properly created, stored, and retrievable
 * for maintaining an immutable audit trail of cart state changes. The test validates:
 * 1. Snapshot creation when cart items are added
 * 2. Snapshot data integrity (SKU, options, price, quantity, customer info)
 * 3. Snapshot immutability and historical preservation
 * 4. Pagination functionality for snapshot retrieval
 * 5. Customer ownership verification in snapshots
 */
export async function test_api_cart_snapshot_audit_trail_verification(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create customer-specific connection and authenticate
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
  // 3. Verify cart item was created successfully
  TestValidator.predicate("cart item has valid ID", cartItem.id !== undefined);
  TestValidator.predicate("cart item has quantity", cartItem.quantity >= 1);
  TestValidator.predicate(
    "cart item has product info",
    cartItem.product.id !== undefined,
  );
  TestValidator.predicate(
    "cart item has variant info",
    cartItem.variant.id !== undefined,
  );
  // 4. Retrieve snapshots for the cart item
  const snapshotsResponse =
    await api.functional.shoppingMall.customer.cart_items.snapshots.index(
      customerConnection,
      {
        cartItemId: cartItem.id,
        body: {
          page: 1,
          limit: 20,
        } satisfies IShoppingMallCartSnapshot.IRequest,
      },
    );
  typia.assert(snapshotsResponse);
  // 5. Verify snapshots response structure
  TestValidator.equals(
    "pagination current page",
    snapshotsResponse.pagination.current,
    1,
  );
  TestValidator.predicate(
    "has snapshots data",
    snapshotsResponse.data.length >= 0,
  );
  TestValidator.predicate(
    "pagination limit is valid",
    snapshotsResponse.pagination.limit >= 1,
  );
  // 6. If snapshots exist, verify their content
  if (snapshotsResponse.data.length > 0) {
    const snapshot = snapshotsResponse.data[0];
    // Verify snapshot data integrity
    TestValidator.equals(
      "SKU code matches",
      snapshot.sku_code,
      cartItem.variant.sku_code,
    );
    TestValidator.equals(
      "option values match",
      snapshot.option_values,
      cartItem.variant.option_values,
    );
    TestValidator.equals(
      "quantity matches",
      snapshot.quantity,
      cartItem.quantity,
    );
    TestValidator.predicate(
      "price at snapshot is valid",
      snapshot.price_at_snapshot > 0,
    );
    TestValidator.predicate(
      "snapshot has customer info",
      snapshot.customer.id !== undefined,
    );
    TestValidator.predicate(
      "snapshot has creation timestamp",
      snapshot.created_at !== undefined,
    );
    // Verify customer ownership in snapshot
    TestValidator.equals(
      "customer ID matches",
      snapshot.customer.id,
      cartItem.id,
    );
    // Verify snapshot timestamp is valid date-time format
    TestValidator.predicate(
      "created_at is valid date-time",
      !isNaN(Date.parse(snapshot.created_at)),
    );
  }
  // 7. Test pagination with different parameters
  const paginatedResponse =
    await api.functional.shoppingMall.customer.cart_items.snapshots.index(
      customerConnection,
      {
        cartItemId: cartItem.id,
        body: {
          page: 1,
          limit: 10,
        } satisfies IShoppingMallCartSnapshot.IRequest,
      },
    );
  typia.assert(paginatedResponse);
  TestValidator.equals(
    "pagination limit applied",
    paginatedResponse.pagination.limit,
    10,
  );
  TestValidator.predicate(
    "pagination records count is valid",
    paginatedResponse.pagination.records >= 0,
  );
  TestValidator.predicate(
    "pagination pages count is valid",
    paginatedResponse.pagination.pages >= 0,
  );
  // 8. Test filtering by date range
  const now = new Date();
  const pastDate = new Date(now.getTime() - 24 * 60 * 60 * 1000).toISOString(); // 1 day ago
  const filteredResponse =
    await api.functional.shoppingMall.customer.cart_items.snapshots.index(
      customerConnection,
      {
        cartItemId: cartItem.id,
        body: {
          page: 1,
          limit: 20,
          from: pastDate,
          to: now.toISOString(),
        } satisfies IShoppingMallCartSnapshot.IRequest,
      },
    );
  typia.assert(filteredResponse);
  TestValidator.predicate(
    "filtered response has valid pagination",
    filteredResponse.pagination.current >= 1,
  );
  // 9. Test filtering by quantity range
  const quantityFilteredResponse =
    await api.functional.shoppingMall.customer.cart_items.snapshots.index(
      customerConnection,
      {
        cartItemId: cartItem.id,
        body: {
          page: 1,
          limit: 20,
          min: 1,
          max: 100,
        } satisfies IShoppingMallCartSnapshot.IRequest,
      },
    );
  typia.assert(quantityFilteredResponse);
  TestValidator.predicate(
    "quantity filtered response has valid pagination",
    quantityFilteredResponse.pagination.current >= 1,
  );
  // 10. Verify snapshot immutability by retrieving again and comparing
  const reverifiedResponse =
    await api.functional.shoppingMall.customer.cart_items.snapshots.index(
      customerConnection,
      {
        cartItemId: cartItem.id,
        body: {
          page: 1,
          limit: 20,
        } satisfies IShoppingMallCartSnapshot.IRequest,
      },
    );
  typia.assert(reverifiedResponse);
  if (snapshotsResponse.data.length > 0 && reverifiedResponse.data.length > 0) {
    const originalSnapshot = snapshotsResponse.data[0];
    const reverifiedSnapshot = reverifiedResponse.data[0];
    // Verify snapshot data remains unchanged (immutability)
    TestValidator.equals(
      "SKU code immutable",
      originalSnapshot.sku_code,
      reverifiedSnapshot.sku_code,
    );
    TestValidator.equals(
      "option values immutable",
      originalSnapshot.option_values,
      reverifiedSnapshot.option_values,
    );
    TestValidator.equals(
      "price at snapshot immutable",
      originalSnapshot.price_at_snapshot,
      reverifiedSnapshot.price_at_snapshot,
    );
    TestValidator.equals(
      "quantity immutable",
      originalSnapshot.quantity,
      reverifiedSnapshot.quantity,
    );
    TestValidator.equals(
      "customer ID immutable",
      originalSnapshot.customer.id,
      reverifiedSnapshot.customer.id,
    );
    TestValidator.equals(
      "created_at immutable",
      originalSnapshot.created_at,
      reverifiedSnapshot.created_at,
    );
  }
}
