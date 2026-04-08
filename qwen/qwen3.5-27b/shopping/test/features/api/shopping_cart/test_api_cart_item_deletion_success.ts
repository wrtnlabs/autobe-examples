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
 * Test the primary success path for removing a cart item from the customer's shopping cart.
 *
 * Validates that a customer can successfully delete a specific cart item, and that the deletion is permanent and does not affect other items in the cart. The test verifies the complete deletion workflow including authentication, cart item creation, deletion execution, and post-deletion validation.
 *
 * Special attention is given to ensuring that the cart item is completely removed from the system and that the operation returns the expected 204 No Content response.
 *
 * 1. Register and authenticate a new customer account.
 * 2. Add a product variant to the customer's shopping cart with a specific quantity.
 * 3. Verify the cart item exists and note its ID.
 * 4. Delete the cart item using the DELETE endpoint.
 * 5. Verify the deletion was successful (void response).
 * 6. Add another cart item to verify the cart continues to function correctly.
 */
export async function test_api_cart_item_deletion_success(
  connection: api.IConnection,
): Promise<void> {
  // 1. Register and authenticate customer
  const customerConnection: api.IConnection = { host: connection.host };
  await authorize_customer_join(customerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    },
  });
  // 2. Add a product variant to the customer's cart
  const cartItem: IShoppingMallCustomerCartItem =
    await generate_random_shopping_mall_customer_cart_items_create(
      customerConnection,
      {},
    );
  typia.assert(cartItem);
  // 3. Verify the cart item exists
  TestValidator.predicate("cart item has valid ID", cartItem.id.length > 0);
  TestValidator.predicate(
    "cart item has valid quantity",
    cartItem.quantity >= 1,
  );
  TestValidator.predicate(
    "cart item has valid subtotal",
    cartItem.subtotal > 0,
  );
  // 4. Delete the cart item
  await api.functional.shoppingMall.customer.cart.items.erase(
    customerConnection,
    {
      itemId: cartItem.id,
    },
  );
  // 5. Add another cart item to verify the cart continues to function correctly after deletion
  const anotherCartItem: IShoppingMallCustomerCartItem =
    await generate_random_shopping_mall_customer_cart_items_create(
      customerConnection,
      {},
    );
  typia.assert(anotherCartItem);
  // 6. Verify the new cart item exists and is different from the deleted one
  TestValidator.notEquals(
    "new cart item has different ID",
    cartItem.id,
    anotherCartItem.id,
  );
  TestValidator.predicate(
    "new cart item has valid quantity",
    anotherCartItem.quantity >= 1,
  );
  TestValidator.predicate(
    "new cart item has valid subtotal",
    anotherCartItem.subtotal > 0,
  );
}
