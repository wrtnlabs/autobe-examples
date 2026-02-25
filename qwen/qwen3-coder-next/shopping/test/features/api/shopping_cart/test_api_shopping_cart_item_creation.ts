import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IShoppingMallAdminSessions } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdminSessions";
import type { IShoppingMallCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCategory";
import type { IShoppingMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomer";
import type { IShoppingMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProduct";
import type { IShoppingMallProductVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductVariant";
import type { IShoppingMallProductVariantOptionValue } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductVariantOptionValue";
import type { IShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSeller";
import type { IShoppingMallShoppingCart } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallShoppingCart";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_customer_join } from "../../../authorize/authorize_customer_join";
import { authorize_customer_login } from "../../../authorize/authorize_customer_login";
import { authorize_customer_refresh } from "../../../authorize/authorize_customer_refresh";
import { generate_random_shopping_mall_customer_cart_items_create } from "../../../generate/generate_random_shopping_mall_customer_cart_items_create";
import { prepare_random_shopping_mall_shopping_cart } from "../../../prepare/prepare_random_shopping_mall_shopping_cart";

/**
 * Test customer shopping cart item creation functionality.
 * 1. Register as customer and authenticate
 * 2. Create a cart item with a random product variant that has available stock
 * 3. Validate that the cart item is correctly created with matching data
 */
export async function test_api_shopping_cart_item_creation(
  connection: api.IConnection,
): Promise<void> {
  // 1. Register and login as customer using utility function
  const customerConnection: api.IConnection = { host: connection.host };
  const joinOutput = await authorize_customer_join(customerConnection, {
    body: {
      email: typia.random<
        string & tags.Format<"email"> & tags.MinLength<1> & tags.MaxLength<255>
      >(),
      password: "12345678",
      display_name: RandomGenerator.name(),
      phone_number: RandomGenerator.mobile(),
      href: "https://example.com/join",
      referrer: "https://example.com",
    } satisfies IShoppingMallCustomer.IJoin,
  });
  typia.assert(joinOutput);
  // 2. Create a cart item with random product variant that has available stock
  // Generate a random product variant with positive stock quantity
  const variant = typia.random<IShoppingMallProductVariant.ISummary>();
  // Ensure stock quantity is at least 1
  variant.stock_quantity = Math.max(1, variant.stock_quantity);
  const cartQuantity = typia.random<
    number & tags.Type<"int32"> & tags.Minimum<1>
  >() satisfies number as number;
  // Use utility function for cart creation
  const cartItem =
    await generate_random_shopping_mall_customer_cart_items_create(
      customerConnection,
      {
        body: {
          shopping_mall_product_variant_id: variant.id,
          quantity: cartQuantity,
        } satisfies IShoppingMallShoppingCart.ICreate,
      },
    );
  typia.assert(cartItem);
  // 3. Validate cart item creation
  TestValidator.equals(
    "cart item customer matches",
    cartItem.customer.id,
    joinOutput.id,
  );
  TestValidator.equals(
    "cart item variant matches",
    cartItem.variant.id,
    variant.id,
  );
  TestValidator.equals(
    "cart item quantity matches",
    cartItem.quantity,
    cartQuantity,
  );
  TestValidator.predicate("cart item quantity positive", cartItem.quantity > 0);
}
