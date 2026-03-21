import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEcommerceMallCancellationRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCancellationRequest";
import type { IEcommerceMallCart } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCart";
import type { IEcommerceMallCartItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCartItem";
import type { IEcommerceMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCustomer";
import type { IEcommerceMallCustomerProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCustomerProfile";
import type { IEcommerceMallOrder } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallOrder";
import type { IEcommerceMallOrderItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallOrderItem";
import type { IEcommerceMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProduct";
import type { IEcommerceMallProductSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProductSnapshot";
import type { IEcommerceMallProductVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProductVariant";
import type { IEcommerceMallProductVariantOptionValue } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProductVariantOptionValue";
import type { IEcommerceMallRefundRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallRefundRequest";
import type { IEcommerceMallReview } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallReview";
import type { IEcommerceMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSeller";
import type { IEcommerceMallSellerProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSellerProfile";
import type { IEcommerceMallSellerProfileSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSellerProfileSnapshot";
import type { IEcommerceMallShippingAddress } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallShippingAddress";
import type { IEcommerceMallWishlistItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallWishlistItem";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_customer_join } from "../../../authorize/authorize_customer_join";
import { authorize_customer_login } from "../../../authorize/authorize_customer_login";
import { authorize_customer_refresh } from "../../../authorize/authorize_customer_refresh";
import { generate_random_ecommerce_mall_customer_cart_items_create } from "../../../generate/generate_random_ecommerce_mall_customer_cart_items_create";
import { prepare_random_ecommerce_mall_cart_item } from "../../../prepare/prepare_random_ecommerce_mall_cart_item";

export async function test_api_cart_view_with_items(
  connection: api.IConnection,
): Promise<void> {
  // 1. Register a new customer
  const customerConnection: api.IConnection = { host: connection.host };
  await authorize_customer_join(customerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "TestPassword123!",
      href: "https://example.com/register",
      referrer: "https://example.com",
    },
  });
  // 2. Add a product variant to cart
  const cartItem =
    await generate_random_ecommerce_mall_customer_cart_items_create(
      customerConnection,
      {
        body: {
          variant_id: typia.random<string & tags.Format<"uuid">>(),
          quantity: typia.random<
            number & tags.Type<"int32"> & tags.Minimum<1>
          >(),
        },
      },
    );
  typia.assert(cartItem);
  // 3. Retrieve the cart with items
  const cart =
    await api.functional.ecommerceMall.customer.customers.cart.at(
      customerConnection,
    );
  typia.assert(cart);
  // 4. Verify cart structure matches IEcommerceMallCart.IInvert schema
  TestValidator.equals("cart has id", cart.id !== undefined, true);
  TestValidator.equals("cart has customer", cart.customer !== undefined, true);
  TestValidator.equals("cart has items array", cart.items !== undefined, true);
  TestValidator.equals("cart has total", cart.total !== undefined, true);
  // 5. Verify items array has at least one item
  TestValidator.predicate("cart has at least one item", cart.items.length > 0);
  // 6. Verify each cart item has required fields
  const item = cart.items[0];
  TestValidator.equals(
    "item has product variant",
    item.product_variant !== undefined,
    true,
  );
  TestValidator.equals("item has quantity", item.quantity !== undefined, true);
  TestValidator.equals("item has subtotal", item.subtotal !== undefined, true);
  // 7. Verify variant options (key-value pairs)
  const variant = item.product_variant;
  TestValidator.equals(
    "variant has optionValues",
    variant.optionValues !== undefined,
    true,
  );
  for (const optionValue of variant.optionValues) {
    TestValidator.equals("option has key", optionValue.key !== undefined, true);
    TestValidator.equals(
      "option has value",
      optionValue.value !== undefined,
      true,
    );
  }
  // 8. Verify subtotal calculation (quantity × price)
  const unitPrice = variant.price ?? 0;
  TestValidator.equals(
    "subtotal equals quantity × price",
    item.subtotal,
    item.quantity * unitPrice,
  );
  // 9. Verify total equals sum of all item subtotals
  const calculatedTotal = cart.items.reduce((sum, i) => sum + i.subtotal, 0);
  TestValidator.equals(
    "total equals sum of subtotals",
    cart.total,
    calculatedTotal,
  );
}
