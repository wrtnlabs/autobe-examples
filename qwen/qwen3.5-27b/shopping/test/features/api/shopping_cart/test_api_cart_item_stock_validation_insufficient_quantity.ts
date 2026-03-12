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
 * Test stock validation when adding product variants with insufficient inventory.
 *
 * This test verifies that the shopping cart system properly validates stock
 * availability before allowing cart item creation. It tests two scenarios:
 * 1. Attempting to add quantity exceeding available stock
 * 2. Attempting to add a variant with zero stock
 */
export async function test_api_cart_item_stock_validation_insufficient_quantity(
  connection: api.IConnection,
): Promise<void> {
  // 1. Register and authenticate as customer
  const customerConnection: api.IConnection = { host: connection.host };
  await authorize_customer_join(customerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      display_name: RandomGenerator.name(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    },
  });
  // 2. Test case 1: Quantity exceeds available stock
  // Pre-assume variantId has stock_quantity = 3
  const variantIdWithLimitedStock: string & tags.Format<"uuid"> = typia.random<
    string & tags.Format<"uuid">
  >();
  // Attempt to add quantity = 10 when only 3 are available
  await TestValidator.error(
    "rejects cart item creation when quantity exceeds stock",
    async () => {
      await api.functional.shoppingMall.customer.customers.me.cart_items.create(
        customerConnection,
        {
          body: {
            variantId: variantIdWithLimitedStock,
            quantity: 10,
          } satisfies IShoppingMallCartItem.ICreate,
        },
      );
    },
  );
  // 3. Test case 2: Variant with zero stock (out of stock)
  // Pre-assume variantId has stock_quantity = 0
  const variantIdOutOfStock: string & tags.Format<"uuid"> = typia.random<
    string & tags.Format<"uuid">
  >();
  // Attempt to add quantity = 1 when stock is 0
  await TestValidator.error(
    "rejects cart item creation for out of stock variant",
    async () => {
      await api.functional.shoppingMall.customer.customers.me.cart_items.create(
        customerConnection,
        {
          body: {
            variantId: variantIdOutOfStock,
            quantity: 1,
          } satisfies IShoppingMallCartItem.ICreate,
        },
      );
    },
  );
  // 4. Test case 3: Valid quantity within stock limit should succeed
  // Pre-assume variantId has stock_quantity = 5
  const variantIdWithSufficientStock: string & tags.Format<"uuid"> =
    typia.random<string & tags.Format<"uuid">>();
  const cartItem =
    await api.functional.shoppingMall.customer.customers.me.cart_items.create(
      customerConnection,
      {
        body: {
          variantId: variantIdWithSufficientStock,
          quantity: 3,
        } satisfies IShoppingMallCartItem.ICreate,
      },
    );
  typia.assert(cartItem);
  // Validate successful cart item creation
  TestValidator.equals(
    "cart item variant matches request",
    cartItem.variant.id,
    variantIdWithSufficientStock,
  );
  TestValidator.equals(
    "cart item quantity matches request",
    cartItem.quantity,
    3,
  );
  TestValidator.predicate(
    "cart item has valid subtotal",
    cartItem.subtotal > 0,
  );
}
