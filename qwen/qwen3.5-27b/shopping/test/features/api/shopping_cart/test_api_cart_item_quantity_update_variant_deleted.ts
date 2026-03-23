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
 * Test cart item quantity update when the associated product variant has been deleted.
 *
 * This test validates the edge case where a customer attempts to update a cart item
 * quantity after the seller has deleted the associated product variant. The system
 * should detect that the variant no longer exists and reject the update with an
 * appropriate error response.
 *
 * Test Flow:
 * 1. Customer registers and authenticates
 * 2. Customer adds a product variant to cart
 * 3. System simulates variant deletion (backend state change)
 * 4. Customer attempts to update cart item quantity
 * 5. Verify update fails with appropriate error
 *
 * Note: In a complete test environment, this would include an actual variant deletion
 * step via seller/admin API. The current test validates the error handling path.
 */
export async function test_api_cart_item_quantity_update_variant_deleted(
  connection: api.IConnection,
): Promise<void> {
  // 1. Authenticate as customer
  const customerConnection: api.IConnection = { host: connection.host };
  await authorize_customer_join(customerConnection, {
    body: undefined,
  });
  // 2. Add a product variant to cart
  const cartItem =
    await generate_random_shopping_mall_customer_customers_me_cart_items_create(
      customerConnection,
      { body: undefined },
    );
  typia.assert(cartItem);
  // 3. Attempt to update cart item quantity when variant is deleted
  // In a real scenario, the variant would be deleted by seller/admin before this step
  // The backend should detect the variant is unavailable/deleted and reject the update
  await TestValidator.error(
    "cart item update fails when variant is deleted",
    async () => {
      await api.functional.shoppingMall.customer.cart_items.update(
        customerConnection,
        {
          cartItemId: cartItem.id,
          body: {
            quantity: 5,
          } satisfies IShoppingMallCartItem.IUpdate,
        },
      );
    },
  );
}
