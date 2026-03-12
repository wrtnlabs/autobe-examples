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
 * Test adding a product variant to customer's shopping cart.
 *
 * This test verifies the primary success path of adding a product variant
 * to a customer's shopping cart. It validates that the cart item is created
 * with correct product information, variant details, quantity, and calculated
 * subtotal.
 */
export async function test_api_cart_item_add_variant_to_cart(
  connection: api.IConnection,
): Promise<void> {
  // 1. Customer authentication
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
  // 2. Add product variant to cart using utility function
  const cartItem =
    await generate_random_shopping_mall_customer_customers_me_cart_items_create(
      customerConnection,
      {
        body: {
          variantId: typia.random<string & tags.Format<"uuid">>(),
          quantity: 2,
        },
      },
    );
  // 3. Validate cart item response
  typia.assert(cartItem);
  // 4. Verify cart item properties
  TestValidator.equals("quantity matches input", cartItem.quantity, 2);
  TestValidator.predicate("has valid cart item id", cartItem.id !== "");
  TestValidator.predicate("product exists", cartItem.product.id !== "");
  TestValidator.predicate("variant exists", cartItem.variant.id !== "");
  TestValidator.predicate("subtotal is positive", cartItem.subtotal > 0);
  TestValidator.predicate(
    "variant is available",
    cartItem.variant.available === true,
  );
  TestValidator.predicate("deleted_at is null", cartItem.deleted_at === null);
  TestValidator.predicate(
    "has created_at timestamp",
    cartItem.created_at !== "",
  );
  TestValidator.predicate(
    "has updated_at timestamp",
    cartItem.updated_at !== "",
  );
}
