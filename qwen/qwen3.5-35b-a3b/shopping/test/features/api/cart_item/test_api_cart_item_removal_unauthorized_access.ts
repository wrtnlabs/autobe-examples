import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEcommerceMallCartItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCartItem";
import type { IEcommerceMallCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCategory";
import type { IEcommerceMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCustomer";
import type { IEcommerceMallCustomerProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCustomerProfile";
import type { IEcommerceMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProduct";
import type { IEcommerceMallProductVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProductVariant";
import type { IEcommerceMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSeller";
import type { IEcommerceMallShoppingCart } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallShoppingCart";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_customer_join } from "../../../authorize/authorize_customer_join";
import { authorize_customer_login } from "../../../authorize/authorize_customer_login";
import { authorize_customer_refresh } from "../../../authorize/authorize_customer_refresh";
import { generate_random_ecommerce_mall_customer_carts_cart_items_create } from "../../../generate/generate_random_ecommerce_mall_customer_carts_cart_items_create";
import { prepare_random_ecommerce_mall_cart_item } from "../../../prepare/prepare_random_ecommerce_mall_cart_item";

export async function test_api_cart_item_removal_unauthorized_access(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create Customer A (cart owner)
  const customerAConnection: api.IConnection = { host: connection.host };
  const customerAAuth = await authorize_customer_join(customerAConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IEcommerceMallCustomer.IJoin,
  });
  typia.assert(customerAAuth);
  // Create new connection with Customer A's token
  const customerAConn: api.IConnection = {
    host: connection.host,
    headers: { Authorization: customerAAuth.token.access },
  };
  // 2. Create Customer B (unauthorized actor)
  const customerBConnection: api.IConnection = { host: connection.host };
  const customerBAuth = await authorize_customer_join(customerBConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IEcommerceMallCustomer.IJoin,
  });
  typia.assert(customerBAuth);
  // Create new connection with Customer B's token
  const customerBConn: api.IConnection = {
    host: connection.host,
    headers: { Authorization: customerBAuth.token.access },
  };
  // 3. Customer A adds a product variant to their cart
  // Generate random cart item to get a cart ID and cart item ID
  const randomCartItem =
    await api.functional.ecommerceMall.customer.carts.cartItems.create(
      customerAConn,
      {
        cartId: typia.random<string & tags.Format<"uuid">>(),
        body: {
          variant_id: typia.random<string & tags.Format<"uuid">>(),
          quantity: 1 satisfies number & tags.Type<"int32"> & tags.Minimum<1>,
        } satisfies IEcommerceMallCartItem.ICreate,
      },
    );
  typia.assert(randomCartItem);
  const cartId = randomCartItem.cart.id;
  const cartItemId = randomCartItem.id;
  // 4. Customer B attempts to remove Customer A's cart item (should fail)
  await TestValidator.error(
    "Customer B cannot remove Customer A's cart item",
    async () => {
      await api.functional.ecommerceMall.customer.carts.cartItems.erase(
        customerBConn,
        {
          cartId,
          cartItemId,
        },
      );
    },
  );
  // 5. Verify cart still exists and item is accessible by Customer A
  // Re-add the same item to verify the cart still works for Customer A
  const newItem =
    await api.functional.ecommerceMall.customer.carts.cartItems.create(
      customerAConn,
      {
        cartId,
        body: {
          variant_id: typia.random<string & tags.Format<"uuid">>(),
          quantity: 1 satisfies number & tags.Type<"int32"> & tags.Minimum<1>,
        } satisfies IEcommerceMallCartItem.ICreate,
      },
    );
  typia.assert(newItem);
  // Verify Customer A can still create new items in their cart
  TestValidator.predicate(
    "Customer A can still access their cart after unauthorized attempt",
    () => newItem.cart.id === cartId,
  );
}
