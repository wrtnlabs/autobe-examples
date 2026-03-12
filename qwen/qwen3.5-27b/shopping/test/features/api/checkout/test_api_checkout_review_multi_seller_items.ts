import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IShoppingMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdmin";
import type { IShoppingMallCartItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCartItem";
import type { IShoppingMallCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCategory";
import type { IShoppingMallCheckoutReview } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCheckoutReview";
import type { IShoppingMallCheckoutReviewItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCheckoutReviewItem";
import type { IShoppingMallCheckoutShippingAddress } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCheckoutShippingAddress";
import type { IShoppingMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomer";
import type { IShoppingMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProduct";
import type { IShoppingMallProductVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductVariant";
import type { IShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSeller";
import type { IShoppingMallSellerApprovalRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSellerApprovalRequest";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";
import { authorize_customer_join } from "../../../authorize/authorize_customer_join";
import { authorize_customer_login } from "../../../authorize/authorize_customer_login";
import { authorize_customer_refresh } from "../../../authorize/authorize_customer_refresh";
import { authorize_seller_join } from "../../../authorize/authorize_seller_join";
import { authorize_seller_login } from "../../../authorize/authorize_seller_login";
import { authorize_seller_refresh } from "../../../authorize/authorize_seller_refresh";
import { generate_random_shopping_mall_customer_customers_me_cart_items_create } from "../../../generate/generate_random_shopping_mall_customer_customers_me_cart_items_create";
import { prepare_random_shopping_mall_cart_item } from "../../../prepare/prepare_random_shopping_mall_cart_item";

/**
 * Test multi-seller checkout review scenario.
 * Validates that checkout review correctly handles items from multiple sellers,
 * displaying accurate seller information for each item and calculating correct totals.
 */
export async function test_api_checkout_review_multi_seller_items(
  connection: api.IConnection,
): Promise<void> {
  // 1. Setup admin account
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_admin_join(adminConnection, {
    body: {
      email: "admin@test.com",
      password: "1234",
      href: "https://test.com/admin",
      referrer: "https://test.com/admin",
    } satisfies IShoppingMallAdmin.IJoin,
  });
  // 2. Create first seller account
  const seller1Connection: api.IConnection = { host: connection.host };
  const seller1JoinResult = await authorize_seller_join(seller1Connection, {
    body: {
      email: "seller1@test.com",
      password: "1234",
      shop_name: "Seller One Shop",
      shop_description: "First seller shop description",
      href: "https://test.com/seller1",
      referrer: "https://test.com/seller1",
    } satisfies IShoppingMallSeller.IJoin,
  });
  typia.assert(seller1JoinResult);
  // 3. Create second seller account
  const seller2Connection: api.IConnection = { host: connection.host };
  const seller2JoinResult = await authorize_seller_join(seller2Connection, {
    body: {
      email: "seller2@test.com",
      password: "1234",
      shop_name: "Seller Two Shop",
      shop_description: "Second seller shop description",
      href: "https://test.com/seller2",
      referrer: "https://test.com/seller2",
    } satisfies IShoppingMallSeller.IJoin,
  });
  typia.assert(seller2JoinResult);
  // 4. Create customer account
  const customerConnection: api.IConnection = { host: connection.host };
  await authorize_customer_join(customerConnection, {
    body: {
      email: "customer@test.com",
      password: "1234",
      display_name: "Test Customer",
      phone_number: "01012345678",
      href: "https://test.com/customer",
      referrer: "https://test.com/customer",
    } satisfies IShoppingMallCustomer.IJoin,
  });
  // 5. Add multiple cart items using generate utility
  // The generate utility should handle product variant selection from different sellers
  const cartItem1 =
    await generate_random_shopping_mall_customer_customers_me_cart_items_create(
      customerConnection,
      {
        body: {
          quantity: 2,
        } satisfies DeepPartial<IShoppingMallCartItem.ICreate>,
      },
    );
  typia.assert(cartItem1);
  const cartItem2 =
    await generate_random_shopping_mall_customer_customers_me_cart_items_create(
      customerConnection,
      {
        body: {
          quantity: 1,
        } satisfies DeepPartial<IShoppingMallCartItem.ICreate>,
      },
    );
  typia.assert(cartItem2);
  const cartItem3 =
    await generate_random_shopping_mall_customer_customers_me_cart_items_create(
      customerConnection,
      {
        body: {
          quantity: 3,
        } satisfies DeepPartial<IShoppingMallCartItem.ICreate>,
      },
    );
  typia.assert(cartItem3);
  // 6. Call checkout review with a mock address ID
  // The backend should handle address validation
  const review = await api.functional.shoppingMall.customer.checkout.review(
    customerConnection,
    {
      body: {
        addressId: typia.random<string & tags.Format<"uuid">>(),
      } satisfies IShoppingMallCheckoutReview.IRequest,
    },
  );
  typia.assert(review);
  // 7. Validate response contains items
  TestValidator.predicate("has items", review.items.length > 0);
  TestValidator.equals("item count matches", review.items.length, 3);
  // 8. Verify seller information is present for each item
  const sellerIds = new Set<string>();
  for (const item of review.items) {
    TestValidator.predicate(
      "seller has shop name",
      item.seller.shop_name.length > 0,
    );
    TestValidator.predicate("seller has ID", item.seller.id.length > 0);
    TestValidator.predicate("item has variant ID", item.variantId.length > 0);
    TestValidator.predicate("item has SKU code", item.skuCode.length > 0);
    TestValidator.predicate("item has quantity", item.quantity > 0);
    TestValidator.predicate("item has unit price", item.unitPrice >= 0);
    TestValidator.predicate("item has line total", item.lineTotal >= 0);
    // Track unique seller IDs
    sellerIds.add(item.seller.id);
  }
  // 9. Verify multiple sellers are present (multi-seller scenario)
  TestValidator.predicate("has multiple sellers", sellerIds.size > 1);
  // 10. Verify total price calculation
  const calculatedTotal = review.items.reduce(
    (sum, item) => sum + item.lineTotal,
    0,
  );
  TestValidator.equals(
    "total price matches sum",
    review.totalPrice,
    calculatedTotal,
  );
  // 11. Verify shipping address is present
  TestValidator.predicate(
    "has shipping address",
    review.shippingAddress !== null,
  );
  TestValidator.predicate(
    "address has recipient name",
    review.shippingAddress.recipientName.length > 0,
  );
  TestValidator.predicate(
    "address has phone number",
    review.shippingAddress.phoneNumber.length > 0,
  );
  TestValidator.predicate(
    "address has street address",
    review.shippingAddress.streetAddress.length > 0,
  );
  TestValidator.predicate(
    "address has city",
    review.shippingAddress.city.length > 0,
  );
  TestValidator.predicate(
    "address has state/province",
    review.shippingAddress.stateProvince.length > 0,
  );
  TestValidator.predicate(
    "address has postal code",
    review.shippingAddress.postalCode.length > 0,
  );
  TestValidator.predicate(
    "address has country",
    review.shippingAddress.country.length > 0,
  );
  // 12. Verify item and product counts
  const expectedItemCount = review.items.reduce(
    (sum, item) => sum + item.quantity,
    0,
  );
  TestValidator.equals(
    "item count matches",
    review.itemCount,
    expectedItemCount,
  );
  TestValidator.predicate("has product count", review.productCount > 0);
}
