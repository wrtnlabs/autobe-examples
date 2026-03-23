import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IShoppingMallCartItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCartItem";
import type { IShoppingMallCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCategory";
import type { IShoppingMallCheckoutReview } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCheckoutReview";
import type { IShoppingMallCheckoutReviewItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCheckoutReviewItem";
import type { IShoppingMallCheckoutShippingAddress } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCheckoutShippingAddress";
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
 * Test the primary success path of the checkout review operation with multiple items.
 *
 * This test validates that when a customer with multiple items in their cart
 * requests a checkout review with a valid shipping address, the system returns
 * a complete order summary including all cart items with product details,
 * variant specifications, seller information, quantities, current pricing,
 * and calculated totals.
 */
export async function test_api_checkout_review_success_with_multiple_items(
  connection: api.IConnection,
): Promise<void> {
  // 1. Customer authentication using utility function
  const customerConnection: api.IConnection = { host: connection.host };
  await authorize_customer_join(customerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      display_name: RandomGenerator.name(),
      phone_number: RandomGenerator.mobile(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    } satisfies IShoppingMallCustomer.IJoin,
  });
  // 2. Add multiple product variants to cart (at least 2 items)
  const cartItem1 =
    await generate_random_shopping_mall_customer_customers_me_cart_items_create(
      customerConnection,
      {},
    );
  typia.assert(cartItem1);
  const cartItem2 =
    await generate_random_shopping_mall_customer_customers_me_cart_items_create(
      customerConnection,
      {},
    );
  typia.assert(cartItem2);
  // 3. Generate a random address ID for checkout review
  const addressId: string & tags.Format<"uuid"> = typia.random<
    string & tags.Format<"uuid">
  >();
  // 4. Request checkout review
  const review = await api.functional.shoppingMall.customer.checkout.review(
    customerConnection,
    {
      body: {
        addressId,
      } satisfies IShoppingMallCheckoutReview.IRequest,
    },
  );
  typia.assert(review);
  // 5. Validate response structure and business logic
  TestValidator.predicate("has items array", review.items.length >= 1);
  TestValidator.predicate(
    "has valid shipping address",
    review.shippingAddress.recipientName.length > 0,
  );
  TestValidator.predicate("total price is positive", review.totalPrice > 0);
  TestValidator.predicate("item count is positive", review.itemCount >= 1);
  TestValidator.predicate(
    "product count is positive",
    review.productCount >= 1,
  );
  // Validate item count matches sum of quantities
  const totalQuantity = review.items.reduce(
    (sum, item) => sum + item.quantity,
    0,
  );
  TestValidator.equals(
    "item count matches sum of quantities",
    review.itemCount,
    totalQuantity,
  );
  // Validate total price matches sum of line totals
  const calculatedTotalPrice = review.items.reduce(
    (sum, item) => sum + item.lineTotal,
    0,
  );
  TestValidator.equals(
    "total price matches sum of line totals",
    review.totalPrice,
    calculatedTotalPrice,
  );
  // Validate each item's line total calculation
  for (const item of review.items) {
    TestValidator.equals(
      `line total calculation for variant ${item.variantId}`,
      item.lineTotal,
      item.unitPrice * item.quantity,
    );
    TestValidator.predicate(
      `unit price is non-negative for ${item.variantId}`,
      item.unitPrice >= 0,
    );
    TestValidator.predicate(
      `quantity is positive for ${item.variantId}`,
      item.quantity >= 1,
    );
  }
}
