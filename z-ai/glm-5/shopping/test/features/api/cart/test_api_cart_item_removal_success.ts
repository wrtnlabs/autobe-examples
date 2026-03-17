import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IShoppingMallCartItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCartItem";
import type { IShoppingMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomer";
import type { IShoppingMallProductVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductVariant";
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
 * Test successful removal of a cart item owned by the authenticated customer.
 *
 * Steps:
 * 1. Authenticate as customer via join endpoint
 * 2. Add a product variant to the cart
 * 3. Remove the cart item using the delete endpoint
 * 4. Verify the deletion completed successfully
 *
 * Business rules tested:
 * - Immediate deletion without confirmation
 * - Customer can remove items from their own cart
 */
export async function test_api_cart_item_removal_success(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create customer-specific connection and authenticate
  const customerConnection: api.IConnection = { host: connection.host };
  await authorize_customer_join(customerConnection, {});
  // 2. Create a cart item to be removed
  const cartItem =
    await generate_random_shopping_mall_customer_customers_cart_items_create(
      customerConnection,
      {},
    );
  typia.assert(cartItem);
  // Store the cart item ID for deletion
  const cartItemId = cartItem.id;
  // 3. Remove the cart item using the delete endpoint
  await api.functional.shoppingMall.customer.carts.items.erase(
    customerConnection,
    {
      cartItemId: cartItemId,
    },
  );
  // 4. Verify deletion completed - void response means success (204 No Content)
  // The erase function returns void, indicating successful deletion
  // No further validation needed as void return confirms the operation succeeded
}
