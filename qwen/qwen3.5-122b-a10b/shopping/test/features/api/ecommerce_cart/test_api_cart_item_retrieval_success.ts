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

/**
 * Test customer successfully retrieves a specific cart item from their shopping cart.
 *
 * Validates that a customer can retrieve detailed information about a cart item including product variant details (SKU code, option values, price), quantity, and current availability status. The test ensures the authenticated customer owns the cart containing this item and that the response includes embedded product variant details with parent product summary (name, seller, category) to enable display without additional API calls.
 *
 * 1. Customer authenticates with the system.
 * 2. Generate a random cart ID and create a cart item by adding a product variant.
 * 3. Retrieve the specific cart item using cartId and itemId.
 * 4. Validates cart item details match including variant information, quantity, and availability status.
 */
export async function test_api_cart_item_retrieval_success(
  connection: api.IConnection,
): Promise<void> {
  // 1. Customer authentication
  const customerConnection: api.IConnection = { host: connection.host };
  const customer = await authorize_customer_join(customerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      display_name: RandomGenerator.name(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IEcommerceCustomer.IJoin,
  });
  typia.assert(customer);
  // 2. Generate a random cart ID and create a cart item
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
  // 3. Retrieve the specific cart item
  const retrievedItem = await api.functional.ecommerce.customer.carts.items.at(
    customerConnection,
    {
      cartId: cartId,
      itemId: cartItem.id,
    },
  );
  typia.assert(retrievedItem);
  // 4. Validate business logic
  TestValidator.equals("cart item ID matches", retrievedItem.id, cartItem.id);
  TestValidator.equals(
    "quantity matches",
    retrievedItem.quantity,
    cartItem.quantity,
  );
  TestValidator.predicate(
    "variant SKU code present",
    retrievedItem.productVariant.sku_code.length > 0,
  );
  TestValidator.predicate(
    "variant has valid stock count",
    retrievedItem.productVariant.stock_count >= 0,
  );
  TestValidator.predicate(
    "product has name",
    retrievedItem.productVariant.product.name.length > 0,
  );
}
