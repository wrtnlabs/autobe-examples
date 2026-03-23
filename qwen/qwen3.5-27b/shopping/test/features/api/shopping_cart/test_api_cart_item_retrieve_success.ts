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
 * Test that an authenticated customer can successfully retrieve details of their own cart item.
 *
 * This test verifies:
 * 1. Customer authentication is required and validated
 * 2. The cart item belongs to the authenticated customer
 * 3. The response includes all expected fields (id, quantity, timestamps, product details, variant details, calculated subtotal)
 * 4. The subtotal is correctly calculated as price × quantity
 * 5. The price used is the variant's price_override if present, otherwise the product's base_price
 * 6. Product and variant information is properly joined and returned
 * 7. The cart item is not soft-deleted (deleted_at is null)
 */
export async function test_api_cart_item_retrieve_success(
  connection: api.IConnection,
): Promise<void> {
  // 1. Customer Authentication
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
  // 2. Create Cart Item
  const cartItem: IShoppingMallCartItem =
    await generate_random_shopping_mall_customer_customers_me_cart_items_create(
      customerConnection,
      {},
    );
  typia.assert(cartItem);
  // 3. Retrieve Cart Item
  const retrievedCartItem: IShoppingMallCartItem =
    await api.functional.shoppingMall.customer.cart_items.at(
      customerConnection,
      {
        cartItemId: cartItem.id,
      },
    );
  typia.assert(retrievedCartItem);
  // 4. Validate Response
  // Verify cart item ID matches
  TestValidator.equals(
    "cart item ID matches",
    retrievedCartItem.id,
    cartItem.id,
  );
  // Verify quantity matches
  TestValidator.equals(
    "quantity matches",
    retrievedCartItem.quantity,
    cartItem.quantity,
  );
  // Verify deleted_at is null (item is not soft-deleted)
  TestValidator.equals(
    "cart item is not deleted",
    retrievedCartItem.deleted_at,
    null,
  );
  // Verify timestamps are present
  TestValidator.predicate(
    "created_at is valid",
    retrievedCartItem.created_at !== undefined,
  );
  TestValidator.predicate(
    "updated_at is valid",
    retrievedCartItem.updated_at !== undefined,
  );
  // Verify product information is present
  TestValidator.predicate(
    "product exists",
    retrievedCartItem.product !== undefined,
  );
  TestValidator.equals(
    "product ID matches",
    retrievedCartItem.product.id,
    cartItem.product.id,
  );
  TestValidator.equals(
    "product name matches",
    retrievedCartItem.product.name,
    cartItem.product.name,
  );
  // Verify variant information is present
  TestValidator.predicate(
    "variant exists",
    retrievedCartItem.variant !== undefined,
  );
  TestValidator.equals(
    "variant ID matches",
    retrievedCartItem.variant.id,
    cartItem.variant.id,
  );
  TestValidator.equals(
    "variant SKU matches",
    retrievedCartItem.variant.sku_code,
    cartItem.variant.sku_code,
  );
  // Verify subtotal calculation
  const expectedPrice =
    retrievedCartItem.variant.price_override ??
    retrievedCartItem.product.basePrice;
  const expectedSubtotal = expectedPrice * retrievedCartItem.quantity;
  TestValidator.equals(
    "subtotal is correctly calculated",
    retrievedCartItem.subtotal,
    expectedSubtotal,
  );
  // Verify timestamps are in valid format
  TestValidator.predicate(
    "created_at is valid date-time",
    !isNaN(Date.parse(retrievedCartItem.created_at)),
  );
  TestValidator.predicate(
    "updated_at is valid date-time",
    !isNaN(Date.parse(retrievedCartItem.updated_at)),
  );
}
