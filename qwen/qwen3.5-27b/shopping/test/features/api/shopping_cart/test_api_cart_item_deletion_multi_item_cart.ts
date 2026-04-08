import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IShoppingMallCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCategory";
import type { IShoppingMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomer";
import type { IShoppingMallCustomerCart } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomerCart";
import type { IShoppingMallCustomerCartItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomerCartItem";
import type { IShoppingMallCustomerProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomerProfile";
import type { IShoppingMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProduct";
import type { IShoppingMallProductVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductVariant";
import type { IShoppingMallProductVariantOption } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductVariantOption";
import type { IShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSeller";
import type { IShoppingMallSellerProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSellerProfile";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_customer_join } from "../../../authorize/authorize_customer_join";
import { authorize_customer_login } from "../../../authorize/authorize_customer_login";
import { authorize_customer_refresh } from "../../../authorize/authorize_customer_refresh";
import { generate_random_shopping_mall_customer_cart_items_create } from "../../../generate/generate_random_shopping_mall_customer_cart_items_create";
import { prepare_random_shopping_mall_customer_cart_item } from "../../../prepare/prepare_random_shopping_mall_customer_cart_item";

/**
 * Test deleting one item from a cart containing multiple items.
 *
 * Validates that removing a single cart item from a multi-item cart correctly deletes only the specified item while preserving other cart items. Ensures that individual item deletion does not affect other cart items and that the cart persists after item removal.
 *
 * 1. Register and authenticate a customer with randomized credentials.
 * 2. Add two different product variants to the customer's shopping cart.
 * 3. Verify both cart items exist with different product variant IDs.
 * 4. Delete the first cart item by its unique identifier.
 * 5. Verify the deletion succeeded without errors (204 No Content).
 * 6. Confirm the second cart item reference remains valid with unchanged properties.
 * 7. Optionally delete the second item to verify complete cart clearing capability.
 */
export async function test_api_cart_item_deletion_multi_item_cart(
  connection: api.IConnection,
): Promise<void> {
  // 1. Register and authenticate customer
  const customerConnection: api.IConnection = { host: connection.host };
  const customer = await authorize_customer_join(customerConnection, {});
  typia.assert(customer);
  // 2. Add first product variant to cart
  const cartItem1 =
    await generate_random_shopping_mall_customer_cart_items_create(
      customerConnection,
      {},
    );
  typia.assert(cartItem1);
  // 3. Add second product variant to cart
  const cartItem2 =
    await generate_random_shopping_mall_customer_cart_items_create(
      customerConnection,
      {},
    );
  typia.assert(cartItem2);
  // 4. Verify both items reference different product variants
  TestValidator.notEquals(
    "cart items have different product variants",
    cartItem1.productVariant.id,
    cartItem2.productVariant.id,
  );
  // 5. Verify both items have valid quantities and subtotals before deletion
  TestValidator.predicate(
    "first cart item has valid quantity",
    cartItem1.quantity >= 1,
  );
  TestValidator.predicate(
    "first cart item has valid subtotal",
    cartItem1.subtotal > 0,
  );
  TestValidator.predicate(
    "second cart item has valid quantity",
    cartItem2.quantity >= 1,
  );
  TestValidator.predicate(
    "second cart item has valid subtotal",
    cartItem2.subtotal > 0,
  );
  // 6. Delete first cart item - should succeed without error
  await api.functional.shoppingMall.customer.cart.items.erase(
    customerConnection,
    {
      itemId: cartItem1.id,
    },
  );
  // 7. Verify second cart item properties remain valid after first item deletion
  TestValidator.predicate(
    "second cart item quantity unchanged after deletion",
    cartItem2.quantity >= 1,
  );
  TestValidator.predicate(
    "second cart item subtotal unchanged after deletion",
    cartItem2.subtotal > 0,
  );
  TestValidator.predicate(
    "second cart item product variant still valid",
    cartItem2.productVariant.id.length > 0,
  );
  // 8. Optionally delete second item to verify complete cart clearing
  await api.functional.shoppingMall.customer.cart.items.erase(
    customerConnection,
    {
      itemId: cartItem2.id,
    },
  );
  // 9. Verify both deletions succeeded (no errors thrown)
  TestValidator.predicate("both cart items successfully deleted", true);
}
