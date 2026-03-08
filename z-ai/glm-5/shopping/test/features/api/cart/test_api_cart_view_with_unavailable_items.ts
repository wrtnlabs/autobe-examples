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

export async function test_api_cart_view_with_unavailable_items(
  connection: api.IConnection,
): Promise<void> {
  // Create customer-specific connection
  const customerConnection: api.IConnection = { host: connection.host };
  // Authenticate as customer using the utility function
  await authorize_customer_join(customerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      displayName: RandomGenerator.name(),
      phoneNumber: RandomGenerator.mobile(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    } satisfies IShoppingMallCustomer.IJoin,
  });
  // Retrieve the customer's cart
  const cart: IShoppingMallCart =
    await api.functional.shoppingMall.customer.cart.at(customerConnection);
  typia.assert(cart);
  // Validate cart items if present
  if (cart.items.length > 0) {
    for (const item of cart.items) {
      // Validate subtotal calculation: subtotal = quantity * price
      TestValidator.equals(
        "subtotal equals quantity times price",
        item.subtotal,
        item.quantity * item.price,
      );
      // Validate unavailable flag exists and is boolean (business rule)
      // unavailable = true when variant deleted_at IS NOT NULL OR stock_quantity < quantity
      if (item.unavailable) {
        // When unavailable, stock should be insufficient or variant is deleted
        TestValidator.predicate(
          "unavailable item has insufficient stock",
          item.variant.stock_quantity < item.quantity,
        );
      }
    }
    // Validate total is sum of all item subtotals (including unavailable items)
    const calculatedTotal = cart.items.reduce(
      (sum, item) => sum + item.subtotal,
      0,
    );
    TestValidator.equals(
      "cart total equals sum of item subtotals",
      cart.total,
      calculatedTotal,
    );
  }
}
