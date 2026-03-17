import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IShoppingMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdmin";
import type { IShoppingMallCartItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCartItem";
import type { IShoppingMallCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCategory";
import type { IShoppingMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomer";
import type { IShoppingMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProduct";
import type { IShoppingMallProductImage } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductImage";
import type { IShoppingMallProductVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductVariant";
import type { IShoppingMallProductVariantOption } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductVariantOption";
import type { IShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSeller";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_customer_join } from "../../../authorize/authorize_customer_join";
import { authorize_customer_login } from "../../../authorize/authorize_customer_login";
import { authorize_customer_refresh } from "../../../authorize/authorize_customer_refresh";
import { generate_random_shopping_mall_customer_customers_cart_items_create } from "../../../generate/generate_random_shopping_mall_customer_customers_cart_items_create";
import { prepare_random_shopping_mall_cart_item } from "../../../prepare/prepare_random_shopping_mall_cart_item";

/**
 * Test security validation when a customer attempts to retrieve a cart item
 * that belongs to a different customer.
 *
 * This test validates that cart items are properly isolated per customer:
 * 1. Customer A registers and adds an item to their cart
 * 2. Customer B registers separately
 * 3. Customer B attempts to retrieve Customer A's cart item using the item ID
 * 4. The system returns 404 Not Found, not revealing the item exists but
 *    belongs to another user
 *
 * This prevents unauthorized access to other customers' shopping cart data.
 */
export async function test_api_cart_item_access_denied(
  connection: api.IConnection,
): Promise<void> {
  // 1. Customer A registers and gets authenticated connection
  const customerAConnection: api.IConnection = { host: connection.host };
  const customerAAuth = await authorize_customer_join(customerAConnection, {});
  typia.assert(customerAAuth);
  // 2. Customer A adds an item to their cart
  const cartItem =
    await generate_random_shopping_mall_customer_customers_cart_items_create(
      customerAConnection,
      {},
    );
  typia.assert(cartItem);
  // 3. Customer B registers separately with their own connection
  const customerBConnection: api.IConnection = { host: connection.host };
  const customerBAuth = await authorize_customer_join(customerBConnection, {});
  typia.assert(customerBAuth);
  // 4. Customer B attempts to access Customer A's cart item
  // This should return 404 Not Found, not revealing the item exists
  await TestValidator.error(
    "Customer B cannot access Customer A's cart item",
    async () => {
      await api.functional.shoppingMall.customer.cart.items.at(
        customerBConnection,
        {
          itemId: cartItem.id,
        },
      );
    },
  );
}
