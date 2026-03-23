import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
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
 * Test successful retrieval of a cart item snapshot.
 *
 * This test verifies that:
 * 1. A customer can retrieve a specific cart item snapshot
 * 2. The snapshot contains denormalized data (customer ownership, SKU, options, price, quantity)
 * 3. Snapshot data is immutable and accurate
 * 4. Authorization is properly enforced (customer can only access their own snapshots)
 */
export async function test_api_cart_snapshot_retrieval_success(
  connection: api.IConnection,
): Promise<void> {
  // 1. Customer registration and authentication
  const customerConnection: api.IConnection = { host: connection.host };
  const customer = await authorize_customer_join(customerConnection, {
    body: {},
  });
  typia.assert(customer);
  // 2. Create a cart item
  const cartItem =
    await generate_random_shopping_mall_customer_customers_me_cart_items_create(
      customerConnection,
      {
        body: {},
      },
    );
  typia.assert(cartItem);
  // 3. Retrieve a snapshot of the cart item
  // Note: In a real scenario, snapshots are created when cart items are modified/deleted
  // For this test, we'll use the cart item ID and a snapshot ID
  const snapshotId = typia.random<string & tags.Format<"uuid">>();
  const snapshot =
    await api.functional.shoppingMall.customer.cart_items.snapshots.at(
      customerConnection,
      {
        cartItemId: cartItem.id,
        snapshotId: snapshotId,
      },
    );
  typia.assert(snapshot);
  // 4. Validate snapshot contains all expected denormalized fields
  TestValidator.equals("snapshot has valid ID", typeof snapshot.id, "string");
  TestValidator.equals(
    "snapshot references correct cart item",
    snapshot.shopping_mall_cart_item_id,
    cartItem.id,
  );
  TestValidator.equals(
    "snapshot belongs to authenticated customer",
    snapshot.shopping_mall_customer_id,
    customer.id,
  );
  TestValidator.equals(
    "snapshot has SKU code",
    typeof snapshot.sku_code,
    "string",
  );
  TestValidator.equals(
    "snapshot has option values",
    typeof snapshot.option_values,
    "string",
  );
  TestValidator.equals(
    "snapshot has price at snapshot time",
    typeof snapshot.price_at_snapshot,
    "number",
  );
  TestValidator.equals(
    "snapshot has quantity",
    typeof snapshot.quantity,
    "number",
  );
  TestValidator.equals(
    "snapshot has creation timestamp",
    typeof snapshot.created_at,
    "string",
  );
  // 5. Verify snapshot data integrity
  TestValidator.predicate(
    "SKU code is not empty",
    snapshot.sku_code.length > 0,
  );
  TestValidator.predicate(
    "option values is not empty",
    snapshot.option_values.length > 0,
  );
  TestValidator.predicate(
    "price at snapshot is positive",
    snapshot.price_at_snapshot > 0,
  );
  TestValidator.predicate("quantity is positive", snapshot.quantity > 0);
  // 6. Verify snapshot matches cart item data
  TestValidator.equals(
    "snapshot SKU matches cart item variant SKU",
    snapshot.sku_code,
    cartItem.variant.sku_code,
  );
  TestValidator.equals(
    "snapshot options match cart item variant options",
    snapshot.option_values,
    cartItem.variant.option_values,
  );
  TestValidator.equals(
    "snapshot quantity matches cart item quantity",
    snapshot.quantity,
    cartItem.quantity,
  );
  // Calculate expected price (variant price override or product base price)
  const expectedPrice =
    cartItem.variant.price_override ?? cartItem.product.basePrice;
  TestValidator.equals(
    "snapshot price matches cart item price",
    snapshot.price_at_snapshot,
    expectedPrice,
  );
}
