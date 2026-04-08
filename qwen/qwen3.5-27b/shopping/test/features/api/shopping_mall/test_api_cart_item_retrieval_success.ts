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
 * Test successful retrieval of a customer's cart item with complete nested details.
 *
 * Validates that an authenticated customer can retrieve detailed information about their own cart item, including nested product variant details, product information, and seller shop details. Ensures that the cart item's subtotal is correctly calculated as the product variant price multiplied by quantity.
 *
 * Special attention is given to verifying that the deleted_at field is null (indicating an active cart item), and that all nested relations are properly populated including variant options as key-value pairs.
 *
 * 1. Register and authenticate a customer using the join utility function.
 * 2. Generate a random cart item in the customer's shopping cart using the generation utility.
 * 3. Retrieve the cart item by its ID using the at endpoint.
 * 4. Validate that the response contains all expected fields and nested relations.
 * 5. Verify that deleted_at is null, confirming the item is active.
 * 6. Verify that subtotal equals productVariant.price × quantity (or product.base_price if variant price is null).
 * 7. Verify that variant options are correctly displayed as key-value pairs.
 */
export async function test_api_cart_item_retrieval_success(
  connection: api.IConnection,
): Promise<void> {
  // 1. Register and authenticate customer
  const customerConnection: api.IConnection = { host: connection.host };
  await authorize_customer_join(customerConnection, {});
  // 2. Create a cart item in customer's cart
  const cartItem: IShoppingMallCustomerCartItem =
    await generate_random_shopping_mall_customer_cart_items_create(
      customerConnection,
      {},
    );
  typia.assert(cartItem);
  // 3. Retrieve the cart item by ID
  const retrievedItem: IShoppingMallCustomerCartItem =
    await api.functional.shoppingMall.customer.cart.items.at(
      customerConnection,
      { itemId: cartItem.id },
    );
  typia.assert(retrievedItem);
  // 4. Validate cart item ID matches
  TestValidator.equals("cart item ID matches", retrievedItem.id, cartItem.id);
  // 5. Validate quantity matches
  TestValidator.equals(
    "quantity matches",
    retrievedItem.quantity,
    cartItem.quantity,
  );
  // 6. Validate deleted_at is null (active item)
  TestValidator.equals("deleted_at is null", retrievedItem.deleted_at, null);
  // 7. Validate subtotal calculation
  const variantPrice =
    retrievedItem.productVariant.price ??
    retrievedItem.productVariant.product.base_price;
  const expectedSubtotal = variantPrice * retrievedItem.quantity;
  TestValidator.equals(
    "subtotal is correctly calculated",
    retrievedItem.subtotal,
    expectedSubtotal,
  );
  // 8. Validate cart ownership
  TestValidator.equals(
    "cart belongs to authenticated customer",
    retrievedItem.cart.customer.id,
    cartItem.cart.customer.id,
  );
  // 9. Validate product variant details exist
  TestValidator.predicate(
    "product variant has SKU code",
    retrievedItem.productVariant.sku_code.length > 0,
  );
  TestValidator.predicate(
    "product variant has stock quantity",
    retrievedItem.productVariant.stock_quantity >= 0,
  );
  // 10. Validate product details exist
  TestValidator.equals(
    "product name matches",
    retrievedItem.productVariant.product.name,
    cartItem.productVariant.product.name,
  );
  TestValidator.predicate(
    "product has base price",
    retrievedItem.productVariant.product.base_price > 0,
  );
  // 11. Validate timestamps exist
  TestValidator.predicate(
    "created_at exists",
    retrievedItem.created_at.length > 0,
  );
  TestValidator.predicate(
    "updated_at exists",
    retrievedItem.updated_at.length > 0,
  );
}
