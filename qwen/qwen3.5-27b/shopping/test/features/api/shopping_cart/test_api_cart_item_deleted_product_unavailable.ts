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
 * Test that a cart item referencing a deleted product or variant is marked as unavailable.
 *
 * Validates the cart item retrieval functionality when a product variant may be unavailable or deleted. The test verifies that cart items remain in the system even when the referenced product is no longer available, and that the cart item correctly displays availability status.
 *
 * This test ensures that the shopping cart properly handles scenarios where sellers delete products after customers have added them to their carts. The cart item should not be automatically deleted but should show the product as unavailable.
 *
 * 1. Register and authenticate a customer account.
 * 2. Add a product variant to the customer's shopping cart.
 * 3. Retrieve the cart item by its unique identifier.
 * 4. Validate that the cart item contains complete product variant information.
 * 5. Verify that availability fields (stock_quantity) are present in the response.
 * 6. Confirm that the cart item itself is not deleted (deleted_at is null).
 * 7. Verify that the subtotal is calculated based on the captured price.
 *
 * Note: The actual product deletion scenario requires seller authentication and product management APIs which are not available in this test context. This test validates the cart item structure and availability field presence.
 */
export async function test_api_cart_item_deleted_product_unavailable(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create customer connection and authenticate
  const customerConnection: api.IConnection = { host: connection.host };
  await authorize_customer_join(customerConnection, {
    body: {},
  });
  // 2. Add a product variant to the customer's shopping cart
  const cartItem: IShoppingMallCustomerCartItem =
    await generate_random_shopping_mall_customer_cart_items_create(
      customerConnection,
      {
        body: {},
      },
    );
  typia.assert(cartItem);
  // 3. Retrieve the cart item by its unique identifier
  const retrievedCartItem: IShoppingMallCustomerCartItem =
    await api.functional.shoppingMall.customer.cart.items.at(
      customerConnection,
      {
        itemId: cartItem.id,
      },
    );
  typia.assert(retrievedCartItem);
  // 4. Validate that the cart item contains complete product variant information
  TestValidator.equals(
    "cart item ID matches",
    retrievedCartItem.id,
    cartItem.id,
  );
  TestValidator.predicate(
    "product variant exists",
    retrievedCartItem.productVariant.id !== undefined,
  );
  TestValidator.predicate(
    "product variant has SKU code",
    retrievedCartItem.productVariant.sku_code.length > 0,
  );
  // 5. Verify that availability fields are present in the response
  TestValidator.predicate(
    "stock quantity is present",
    retrievedCartItem.productVariant.stock_quantity >= 0,
  );
  // 6. Confirm that the cart item itself is not deleted (deleted_at is null)
  TestValidator.equals(
    "cart item not deleted",
    retrievedCartItem.deleted_at,
    null,
  );
  // 7. Verify that the subtotal is calculated based on the captured price
  const expectedSubtotal =
    (retrievedCartItem.productVariant.price ??
      retrievedCartItem.productVariant.product.base_price) *
    retrievedCartItem.quantity;
  TestValidator.equals(
    "subtotal calculated correctly",
    retrievedCartItem.subtotal,
    expectedSubtotal,
  );
  // 8. Validate cart ownership
  TestValidator.equals(
    "cart belongs to authenticated customer",
    retrievedCartItem.cart.customer.id,
    cartItem.cart.customer.id,
  );
}
