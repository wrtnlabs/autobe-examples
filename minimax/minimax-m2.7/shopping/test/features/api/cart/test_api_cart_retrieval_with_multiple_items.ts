import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEcommerceMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallAdmin";
import type { IEcommerceMallCancellationRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCancellationRequest";
import type { IEcommerceMallCart } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCart";
import type { IEcommerceMallCartItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCartItem";
import type { IEcommerceMallCheckout } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCheckout";
import type { IEcommerceMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCustomer";
import type { IEcommerceMallCustomerProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCustomerProfile";
import type { IEcommerceMallOrder } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallOrder";
import type { IEcommerceMallOrderItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallOrderItem";
import type { IEcommerceMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProduct";
import type { IEcommerceMallProductSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProductSnapshot";
import type { IEcommerceMallProductVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProductVariant";
import type { IEcommerceMallProductVariantOptionValue } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProductVariantOptionValue";
import type { IEcommerceMallRefundRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallRefundRequest";
import type { IEcommerceMallRefundRequestSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallRefundRequestSnapshot";
import type { IEcommerceMallReview } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallReview";
import type { IEcommerceMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSeller";
import type { IEcommerceMallSellerApproval } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSellerApproval";
import type { IEcommerceMallSellerProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSellerProfile";
import type { IEcommerceMallSellerProfileSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSellerProfileSnapshot";
import type { IEcommerceMallSellerSuspension } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSellerSuspension";
import type { IEcommerceMallShipment } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallShipment";
import type { IEcommerceMallShippingAddress } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallShippingAddress";
import type { IEcommerceMallWishlist } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallWishlist";
import type { IEcommerceMallWishlistItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallWishlistItem";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIEcommerceMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIEcommerceMallProduct";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_customer_join } from "../../../authorize/authorize_customer_join";
import { authorize_customer_login } from "../../../authorize/authorize_customer_login";
import { authorize_customer_refresh } from "../../../authorize/authorize_customer_refresh";
import { generate_random_ecommerce_mall_customer_customers_me_cart_create } from "../../../generate/generate_random_ecommerce_mall_customer_customers_me_cart_create";
import { prepare_random_ecommerce_mall_cart } from "../../../prepare/prepare_random_ecommerce_mall_cart";

export async function test_api_cart_retrieval_with_multiple_items(
  connection: api.IConnection,
): Promise<void> {
  // 1. Register a new customer
  const customerConnection: api.IConnection = { host: connection.host };
  const authorized = await authorize_customer_join(customerConnection, {});
  typia.assert(authorized);
  // 2. Add first product variant to cart
  const firstCartItem =
    await generate_random_ecommerce_mall_customer_customers_me_cart_create(
      customerConnection,
      {},
    );
  typia.assert(firstCartItem);
  // 3. Add second (different) product variant to cart
  const secondCartItem =
    await generate_random_ecommerce_mall_customer_customers_me_cart_create(
      customerConnection,
      {},
    );
  typia.assert(secondCartItem);
  // Validate that the two items are different (different cart item IDs)
  TestValidator.notEquals(
    "second item different from first",
    firstCartItem.id,
    secondCartItem.id,
  );
  // 4. Retrieve the cart
  const cart =
    await api.functional.ecommerceMall.customer.customers.me.cart.at(
      customerConnection,
    );
  typia.assert(cart);
  // Validate cart structure and contents
  TestValidator.equals("cart has 2 items", cart.items.length, 2);
  // Find our two items in the cart
  const cartItem1 = cart.items.find((item) => item.id === firstCartItem.id);
  const cartItem2 = cart.items.find((item) => item.id === secondCartItem.id);
  TestValidator.predicate("first item found in cart", cartItem1 !== undefined);
  TestValidator.predicate("second item found in cart", cartItem2 !== undefined);
  // Validate cart item fields
  if (cartItem1 && cartItem2) {
    // Validate each item has required fields
    TestValidator.predicate(
      "first item has variant",
      cartItem1.variant !== undefined,
    );
    TestValidator.predicate(
      "first item has product",
      cartItem1.product !== undefined,
    );
    TestValidator.predicate(
      "first item has valid subtotal",
      cartItem1.subtotal > 0,
    );
    TestValidator.predicate(
      "second item has valid subtotal",
      cartItem2.subtotal > 0,
    );
    // Validate quantities (default should be 1)
    TestValidator.equals("first item quantity is 1", cartItem1.quantity, 1);
    TestValidator.equals("second item quantity is 1", cartItem2.quantity, 1);
    // Validate subtotals (quantity × unit price)
    const unitPrice1 = cartItem1.variant.price ?? cartItem1.product.basePrice;
    const unitPrice2 = cartItem2.variant.price ?? cartItem2.product.basePrice;
    TestValidator.equals(
      "first item subtotal equals quantity × unit price",
      cartItem1.subtotal,
      cartItem1.quantity * unitPrice1,
    );
    TestValidator.equals(
      "second item subtotal equals quantity × unit price",
      cartItem2.subtotal,
      cartItem2.quantity * unitPrice2,
    );
    // Validate cart total equals sum of item subtotals
    const expectedTotal = cartItem1.subtotal + cartItem2.subtotal;
    TestValidator.equals(
      "cart total equals sum of item subtotals",
      cart.total,
      expectedTotal,
    );
  }
  // Validate cart has all required fields
  TestValidator.predicate("cart has id", cart.id !== undefined);
  TestValidator.predicate("cart has customer", cart.customer !== undefined);
  TestValidator.predicate("cart has items array", Array.isArray(cart.items));
  TestValidator.predicate("cart has total", cart.total !== undefined);
  TestValidator.predicate("cart has createdAt", cart.createdAt !== undefined);
  TestValidator.predicate("cart has updatedAt", cart.updatedAt !== undefined);
}
