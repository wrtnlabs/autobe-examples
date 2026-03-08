import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IShoppingMallCart } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCart";
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

/**
 * Test authenticated customer viewing their shopping cart.
 *
 * This test verifies that:
 * 1. Customer can authenticate and retrieve their cart
 * 2. Customer reference in cart matches authenticated user
 * 3. Total price calculation is correct (sum of item subtotals)
 * 4. Subtotal calculation is correct (quantity × price)
 * 5. Items are sorted by creation timestamp (oldest first)
 */
export async function test_api_cart_view_with_items(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create customer-specific connection and authenticate
  const customerConnection: api.IConnection = { host: connection.host };
  const customer = await authorize_customer_join(customerConnection, {});
  typia.assert(customer);
  // 2. Retrieve the customer's cart
  const cart =
    await api.functional.shoppingMall.customer.cart.at(customerConnection);
  typia.assert(cart);
  // 3. Validate customer reference matches authenticated user
  TestValidator.equals("customer id matches", cart.customer.id, customer.id);
  // 4. Validate each cart item's subtotal calculation if items exist
  if (cart.items.length > 0) {
    for (const item of cart.items) {
      // Validate subtotal calculation: quantity × price
      TestValidator.equals(
        "subtotal equals quantity times price",
        item.subtotal,
        item.quantity * item.price,
      );
    }
    // 5. Validate total equals sum of subtotals
    const calculatedTotal = cart.items.reduce(
      (sum, item) => sum + item.subtotal,
      0,
    );
    TestValidator.equals(
      "total equals sum of subtotals",
      cart.total,
      calculatedTotal,
    );
    // 6. Validate items are sorted by created_at ascending (oldest first)
    const timestamps = cart.items.map((item) =>
      new Date(item.created_at).getTime(),
    );
    const sortedTimestamps = [...timestamps].sort((a, b) => a - b);
    TestValidator.equals(
      "items sorted oldest first",
      timestamps,
      sortedTimestamps,
    );
  } else {
    // Empty cart should have zero total
    TestValidator.equals("empty cart total is zero", cart.total, 0);
  }
}
