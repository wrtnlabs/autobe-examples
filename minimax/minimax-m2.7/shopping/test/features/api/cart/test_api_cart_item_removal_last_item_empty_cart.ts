import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEcommerceMallCart } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCart";
import type { IEcommerceMallCartItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCartItem";
import type { IEcommerceMallCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCategory";
import type { IEcommerceMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCustomer";
import type { IEcommerceMallCustomerProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCustomerProfile";
import type { IEcommerceMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProduct";
import type { IEcommerceMallProductVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProductVariant";
import type { IEcommerceMallProductVariantOptionValue } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProductVariantOptionValue";
import type { IEcommerceMallShippingAddress } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallShippingAddress";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_customer_join } from "../../../authorize/authorize_customer_join";
import { authorize_customer_login } from "../../../authorize/authorize_customer_login";
import { authorize_customer_refresh } from "../../../authorize/authorize_customer_refresh";
import { generate_random_ecommerce_mall_customer_customers_cart_items_create } from "../../../generate/generate_random_ecommerce_mall_customer_customers_cart_items_create";
import { prepare_random_ecommerce_mall_cart_item } from "../../../prepare/prepare_random_ecommerce_mall_cart_item";

export async function test_api_cart_item_removal_last_item_empty_cart(
  connection: api.IConnection,
): Promise<void> {
  // Setup: Register new customer and add single item to cart
  const customerConnection: api.IConnection = { host: connection.host };
  await authorize_customer_join(customerConnection, {});
  // Add a single item to cart
  const cartWithItem =
    await generate_random_ecommerce_mall_customer_customers_cart_items_create(
      customerConnection,
      {},
    );
  typia.assert(cartWithItem);
  // Verify cart has one item before removal
  const singleItem = cartWithItem.items[0];
  TestValidator.equals(
    "cart has exactly one item before removal",
    cartWithItem.items.length,
    1,
  );
  TestValidator.equals(
    "itemsCount is 1 before removal",
    cartWithItem.itemsCount,
    1,
  );
  // Test Execution: Remove the last (only) item from cart
  await api.functional.ecommerceMall.customer.cart.items.erase(
    customerConnection,
    {
      itemId: singleItem.id,
    },
  );
  // Verify empty cart state by adding a new item - the cart returned will show current state
  // Use a dummy variant ID to verify cart state (the cart itself will be empty)
  const emptyCart =
    await generate_random_ecommerce_mall_customer_customers_cart_items_create(
      customerConnection,
      {},
    );
  typia.assert(emptyCart);
  // Verify cart is now empty
  TestValidator.equals(
    "cart itemsCount is 0 after removing last item",
    emptyCart.itemsCount,
    0,
  );
  TestValidator.equals("cart items array is empty", emptyCart.items.length, 0);
}
