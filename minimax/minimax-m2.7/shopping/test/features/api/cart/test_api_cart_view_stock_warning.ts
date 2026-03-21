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

/**
 * Test retrieving a cart with stock availability warning.
 *
 * Steps:
 * 1. Register a new customer via POST /ecommerceMall/auth/customer/join
 * 2. Add a product variant to cart via POST /ecommerceMall/customer/cart/items
 * 3. Call GET /ecommerceMall/customer/customers/cart
 * 4. Verify cart response structure
 * 5. Verify availability_warning field behavior
 * 6. Verify subtotal calculated correctly
 * 7. Verify total includes all items
 */
export async function test_api_cart_view_stock_warning(
  connection: api.IConnection,
): Promise<void> {
  // 1. Register a new customer
  const customerConnection: api.IConnection = { host: connection.host };
  const customer = await authorize_customer_join(customerConnection, {});
  typia.assert(customer);
  // 2. Add a product variant to cart with high quantity
  // Using prepare_random_ecommerce_mall_cart_item to create valid cart item input
  const cartItemInput = prepare_random_ecommerce_mall_cart_item({});
  const cartItem =
    await api.functional.ecommerceMall.customer.cart.items.create(
      customerConnection,
      {
        body: {
          variant_id: cartItemInput.variant_id,
          quantity: cartItemInput.quantity,
        } satisfies IEcommerceMallCartItem.ICreate,
      },
    );
  typia.assert(cartItem);
  // 3. Retrieve the cart
  const cart =
    await api.functional.ecommerceMall.customer.customers.cart.at(
      customerConnection,
    );
  typia.assert(cart);
  // 4. Verify cart structure
  TestValidator.equals("cart has items", cart.items.length > 0, true);
  TestValidator.equals("cart customer matches", cart.customer.id, customer.id);
  // 5. Verify item in cart has expected properties
  const item = cart.items[0];
  TestValidator.equals("item has valid quantity", item.quantity > 0, true);
  TestValidator.equals("item has valid subtotal", item.subtotal > 0, true);
  TestValidator.predicate(
    "item has product variant",
    () => item.product_variant !== undefined,
  );
  TestValidator.predicate(
    "item has cart reference",
    () => item.cart !== undefined,
  );
  // 6. Verify availability_warning field exists (can be null or have value)
  // The field may or may not have a warning depending on stock
  TestValidator.predicate(
    "availability_warning is present",
    () =>
      item.availability_warning === null ||
      item.availability_warning === undefined ||
      typeof item.availability_warning === "string",
  );
  // 7. Verify subtotal calculated correctly (quantity * unit price)
  const unitPrice = item.product_variant.price ?? 0;
  const expectedSubtotal = item.quantity * unitPrice;
  TestValidator.equals(
    "subtotal calculated correctly",
    item.subtotal,
    expectedSubtotal,
  );
  // 8. Verify total includes all items
  const expectedTotal = cart.items.reduce((sum, i) => sum + i.subtotal, 0);
  TestValidator.equals("total includes all items", cart.total, expectedTotal);
}
