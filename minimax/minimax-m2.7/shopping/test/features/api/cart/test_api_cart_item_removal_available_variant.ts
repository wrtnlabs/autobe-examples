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

export async function test_api_cart_item_removal_available_variant(
  connection: api.IConnection,
): Promise<void> {
  // 1. Register a new customer
  const customerConnection: api.IConnection = { host: connection.host };
  const customer = await authorize_customer_join(customerConnection, {
    body: {},
  });
  typia.assert(customer);
  // 2. Add a product variant to cart
  const cartResult =
    await generate_random_ecommerce_mall_customer_customers_cart_items_create(
      customerConnection,
      { body: {} },
    );
  typia.assert(cartResult);
  // Get the first cart item ID
  const firstItemId = cartResult.items[0]!.id;
  // 3. Remove the cart item
  await api.functional.ecommerceMall.customer.cart.items.erase(
    customerConnection,
    {
      itemId: firstItemId,
    },
  );
  // 4. Verify item was removed by adding same variant again
  // If original was deleted, adding same variant should create a NEW line item
  // If original still existed, same variant would increase quantity (not create new line)
  const cartAfterDelete =
    await generate_random_ecommerce_mall_customer_customers_cart_items_create(
      customerConnection,
      { body: { productVariantId: cartResult.items[0]!.variant.id } },
    );
  typia.assert(cartAfterDelete);
  // Verify the new item was added as a separate line item (not quantity increase)
  TestValidator.equals(
    "cart has the new line item",
    cartAfterDelete.items.some((item) => item.id !== firstItemId),
    true,
  );
}
