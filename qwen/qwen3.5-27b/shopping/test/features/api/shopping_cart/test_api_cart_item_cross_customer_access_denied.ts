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
 * Test that a customer cannot access another customer's cart item.
 *
 * This test verifies the security isolation between customer accounts by:
 * 1. Creating two separate customer accounts (customer A and customer B)
 * 2. Adding a cart item to customer A's cart
 * 3. Attempting to retrieve customer A's cart item while authenticated as customer B
 * 4. Verifying the system returns 403 Forbidden error due to ownership mismatch
 *
 * The security mechanism validates that the shopping_mall_customer_id in the cart
 * item matches the authenticated customer's ID from the JWT token.
 */
export async function test_api_cart_item_cross_customer_access_denied(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create customer A account and authenticate
  const customerAConnection: api.IConnection = { host: connection.host };
  const customerA = await authorize_customer_join(customerAConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      display_name: RandomGenerator.name(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    },
  });
  typia.assert(customerA);
  // 2. Add a cart item to customer A's cart
  const cartItem =
    await generate_random_shopping_mall_customer_customers_me_cart_items_create(
      customerAConnection,
      {},
    );
  typia.assert(cartItem);
  // 3. Create customer B account and authenticate
  const customerBConnection: api.IConnection = { host: connection.host };
  const customerB = await authorize_customer_join(customerBConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      display_name: RandomGenerator.name(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    },
  });
  typia.assert(customerB);
  // 4. Verify customer A and customer B have different IDs
  TestValidator.notEquals("customer IDs differ", customerA.id, customerB.id);
  // 5. Attempt to access customer A's cart item as customer B (should fail with 403)
  await TestValidator.httpError(
    "cross-customer cart access denied",
    403,
    async () =>
      await api.functional.shoppingMall.customer.cart_items.at(
        customerBConnection,
        {
          cartItemId: cartItem.id,
        },
      ),
  );
}
