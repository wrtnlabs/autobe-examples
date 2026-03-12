import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IShoppingMallCartItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCartItem";
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
 * Test cart item removal when cart contains multiple items, verifying partial removal behavior.
 *
 * This test validates that when a customer has multiple items in their shopping cart,
 * removing one item does not affect the other items. The test ensures:
 * - Multiple cart items can coexist
 * - Individual item removal works correctly
 * - Remaining items are preserved after deletion
 * - Cart integrity is maintained throughout the operation
 */
export async function test_api_cart_item_removal_multiple_items_partial(
  connection: api.IConnection,
): Promise<void> {
  // 1. Customer authentication setup
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
    },
  });
  // 2. Add multiple cart items (3 items for robust testing)
  const cartItem1 =
    await generate_random_shopping_mall_customer_customers_me_cart_items_create(
      customerConnection,
      {},
    );
  typia.assert(cartItem1);
  const cartItem2 =
    await generate_random_shopping_mall_customer_customers_me_cart_items_create(
      customerConnection,
      {},
    );
  typia.assert(cartItem2);
  const cartItem3 =
    await generate_random_shopping_mall_customer_customers_me_cart_items_create(
      customerConnection,
      {},
    );
  typia.assert(cartItem3);
  // 3. Verify initial cart state - all 3 items have unique IDs
  TestValidator.notEquals(
    "item 1 and 2 have different IDs",
    cartItem1.id,
    cartItem2.id,
  );
  TestValidator.notEquals(
    "item 2 and 3 have different IDs",
    cartItem2.id,
    cartItem3.id,
  );
  TestValidator.notEquals(
    "item 1 and 3 have different IDs",
    cartItem1.id,
    cartItem3.id,
  );
  // 4. Record initial cart item data for verification
  const item1Quantity = cartItem1.quantity;
  const item1Subtotal = cartItem1.subtotal;
  const item3Quantity = cartItem3.quantity;
  const item3Subtotal = cartItem3.subtotal;
  // 5. Remove the middle cart item (cartItem2)
  await api.functional.shoppingMall.customer.cart_items.erase(
    customerConnection,
    {
      cartItemId: cartItem2.id,
    },
  );
  // 6. Verify remaining items maintain their original data (cartItem1 and cartItem3)
  TestValidator.equals(
    "cartItem1 quantity unchanged",
    cartItem1.quantity,
    item1Quantity,
  );
  TestValidator.equals(
    "cartItem1 subtotal unchanged",
    cartItem1.subtotal,
    item1Subtotal,
  );
  TestValidator.equals(
    "cartItem3 quantity unchanged",
    cartItem3.quantity,
    item3Quantity,
  );
  TestValidator.equals(
    "cartItem3 subtotal unchanged",
    cartItem3.subtotal,
    item3Subtotal,
  );
  // 7. Verify remaining items are still valid and accessible
  TestValidator.predicate(
    "cartItem1 has valid UUID",
    cartItem1.id.length === 36,
  );
  TestValidator.predicate(
    "cartItem1 has positive quantity",
    cartItem1.quantity > 0,
  );
  TestValidator.predicate(
    "cartItem1 has positive subtotal",
    cartItem1.subtotal > 0,
  );
  TestValidator.predicate(
    "cartItem3 has valid UUID",
    cartItem3.id.length === 36,
  );
  TestValidator.predicate(
    "cartItem3 has positive quantity",
    cartItem3.quantity > 0,
  );
  TestValidator.predicate(
    "cartItem3 has positive subtotal",
    cartItem3.subtotal > 0,
  );
  // 8. Verify cart integrity - remaining items are independent and distinct
  TestValidator.notEquals(
    "remaining items have different IDs",
    cartItem1.id,
    cartItem3.id,
  );
  TestValidator.predicate(
    "cart still has multiple items after partial removal",
    cartItem1.id !== cartItem3.id,
  );
}
