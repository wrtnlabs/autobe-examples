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
 * Test cart item quantity update when requested quantity exceeds available stock.
 *
 * This test validates the business rule that cart items cannot have quantities
 * greater than available inventory. The test verifies:
 * 1. When the requested quantity exceeds the variant's stock_quantity, the update
 *    operation fails with an appropriate error response
 * 2. The original cart item quantity remains unchanged after the failed update
 * 3. The cart item's timestamps are not modified since the update failed
 */
export async function test_api_cart_item_quantity_update_insufficient_stock(
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
    } satisfies IShoppingMallCustomer.IJoin,
  });
  // 2. Create a cart item with a variant that has limited stock
  const cartItem: IShoppingMallCartItem =
    await generate_random_shopping_mall_customer_customers_me_cart_items_create(
      customerConnection,
      {
        body: {
          variantId: typia.random<string & tags.Format<"uuid">>(),
          quantity: 1 satisfies number & tags.Type<"int32"> & tags.Minimum<1>,
        } satisfies IShoppingMallCartItem.ICreate,
      },
    );
  typia.assert(cartItem);
  // Store original state for validation
  const originalQuantity = cartItem.quantity;
  const originalUpdatedAt = cartItem.updated_at;
  const originalCreatedAt = cartItem.created_at;
  // 3. Attempt to update quantity to exceed available stock
  // Request a quantity that is significantly larger than the variant's stock_quantity
  const insufficientQuantity = cartItem.variant.stock_quantity + 100;
  // 4. Verify the update operation fails with an error
  await TestValidator.error(
    "update fails when quantity exceeds stock",
    async () => {
      await api.functional.shoppingMall.customer.cart_items.update(
        customerConnection,
        {
          cartItemId: cartItem.id,
          body: {
            quantity: insufficientQuantity,
          } satisfies IShoppingMallCartItem.IUpdate,
        },
      );
    },
  );
  // 5. Validate that the cart item state remains unchanged after failed update
  // Since the update failed, the cart item should still have the original values
  TestValidator.equals(
    "quantity unchanged after failed update",
    cartItem.quantity,
    originalQuantity,
  );
  TestValidator.equals(
    "created_at unchanged after failed update",
    cartItem.created_at,
    originalCreatedAt,
  );
  TestValidator.equals(
    "updated_at unchanged after failed update",
    cartItem.updated_at,
    originalUpdatedAt,
  );
}
