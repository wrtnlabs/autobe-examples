import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEcommerceCartItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceCartItem";
import type { IEcommerceCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceCategory";
import type { IEcommerceCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceCustomer";
import type { IEcommerceProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceProduct";
import type { IEcommerceProductVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceProductVariant";
import type { IEcommerceSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceSeller";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_customer_join } from "../../../authorize/authorize_customer_join";
import { authorize_customer_login } from "../../../authorize/authorize_customer_login";
import { authorize_customer_refresh } from "../../../authorize/authorize_customer_refresh";
import { generate_random_ecommerce_customer_carts_items_create } from "../../../generate/generate_random_ecommerce_customer_carts_items_create";
import { prepare_random_ecommerce_cart_item } from "../../../prepare/prepare_random_ecommerce_cart_item";

export async function test_api_cart_item_retrieval_success(
  connection: api.IConnection,
): Promise<void> {
  /**
   * Test successful retrieval of a specific cart item with complete product and variant information.
   * Creates a customer account, establishes a shopping cart, adds a product variant to the shopping cart,
   * then retrieves the specific cart item details and validates all required fields.
   */
  // Step 1: Create and authenticate customer
  const customerConnection: api.IConnection = { host: connection.host };
  const customer = await authorize_customer_join(customerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      display_name: RandomGenerator.name(),
      phone_number: RandomGenerator.mobile(),
    } satisfies IEcommerceCustomer.IJoin,
  });
  typia.assert(customer);
  // Step 2: Create cart item with properly generated UUID for cart
  const cartId = typia.random<string & tags.Format<"uuid">>();
  const cartItem = await generate_random_ecommerce_customer_carts_items_create(
    customerConnection,
    {
      params: {
        cartId: cartId,
      },
    },
  );
  typia.assert(cartItem);
  // Step 3: Retrieve specific cart item with correct parameters
  const retrievedItem = await api.functional.ecommerce.customer.carts.items.at(
    customerConnection,
    {
      cartId: cartId,
      itemId: cartItem.id,
    },
  );
  typia.assert(retrievedItem);
  // Step 4: Validate all required fields are present
  TestValidator.equals("cart item IDs match", retrievedItem.id, cartItem.id);
  TestValidator.equals(
    "quantities match",
    retrievedItem.quantity,
    cartItem.quantity,
  );
  // Validate product variant details
  TestValidator.equals(
    "SKU matches",
    retrievedItem.productVariant.sku,
    cartItem.productVariant.sku,
  );
  TestValidator.equals(
    "option values match",
    retrievedItem.productVariant.option_values,
    cartItem.productVariant.option_values,
  );
  TestValidator.equals(
    "price override matches",
    retrievedItem.productVariant.price_override,
    cartItem.productVariant.price_override,
  );
  TestValidator.equals(
    "quantity matches",
    retrievedItem.productVariant.quantity,
    cartItem.productVariant.quantity,
  );
  // Validate product summary details
  TestValidator.equals(
    "product ID matches",
    retrievedItem.productVariant.product.id,
    cartItem.productVariant.product.id,
  );
  TestValidator.equals(
    "product name matches",
    retrievedItem.productVariant.product.name,
    cartItem.productVariant.product.name,
  );
  TestValidator.equals(
    "base price matches",
    retrievedItem.productVariant.product.base_price,
    cartItem.productVariant.product.base_price,
  );
  // Validate seller information
  TestValidator.equals(
    "seller ID matches",
    retrievedItem.productVariant.product.seller.id,
    cartItem.productVariant.product.seller.id,
  );
  TestValidator.equals(
    "shop name matches",
    retrievedItem.productVariant.product.seller.shop_name,
    cartItem.productVariant.product.seller.shop_name,
  );
  // Validate category details
  TestValidator.equals(
    "category ID matches",
    retrievedItem.productVariant.product.category.id,
    cartItem.productVariant.product.category.id,
  );
  TestValidator.equals(
    "category name matches",
    retrievedItem.productVariant.product.category.name,
    cartItem.productVariant.product.category.name,
  );
  // Validate timestamps
  TestValidator.predicate(
    "created at is valid date-time",
    /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(\.\d+)?Z?$/.test(
      retrievedItem.created_at,
    ),
  );
  TestValidator.predicate(
    "updated at is valid date-time",
    /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(\.\d+)?Z?$/.test(
      retrievedItem.updated_at,
    ),
  );
}
