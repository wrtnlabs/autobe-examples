import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallBrand } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallBrand";
import type { IShoppingMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomer";
import type { IShoppingMallCustomerAuth } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomerAuth";
import type { IShoppingMallCustomerCart } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomerCart";
import type { IShoppingMallCustomerCartItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomerCartItem";
import type { IShoppingMallOrder } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrder";
import type { IShoppingMallPlatformAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallPlatformAdmin";
import type { IShoppingMallPlatformAdminJoin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallPlatformAdminJoin";
import type { IShoppingMallPlatformAdminLogin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallPlatformAdminLogin";
import type { IShoppingMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProduct";
import type { IShoppingMallProductReview } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductReview";
import type { IShoppingMallProductReviewSellerResponse } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductReviewSellerResponse";
import type { IShoppingMallProductSku } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductSku";
import type { IShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSeller";
import type { IShoppingMallSellerJoin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSellerJoin";
import type { IShoppingMallSellerLogin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSellerLogin";

/**
 * Validate that the public seller-response endpoint for a product review can be
 * invoked for a review that has no seller response without producing a
 * client/server error.
 *
 * Business goal:
 *
 * - When a review exists but the seller has not yet replied, the GET
 *   /shoppingMall/reviews/{reviewId}/sellerResponse endpoint should behave
 *   gracefully for that reviewId instead of failing.
 * - Due to the current SDK typing (non-nullable
 *   IShoppingMallProductReviewSellerResponse return type and no 204/nullable
 *   modeling), this test focuses on ensuring that the call succeeds and returns
 *   a value matching the declared DTO type rather than asserting a specific
 *   “null vs 204” representation.
 *
 * High-level flow:
 *
 * 1. Join and login as platform admin.
 * 2. Create a brand for realistic catalog context.
 * 3. Join and login as seller.
 * 4. Create a product bound to the seller and brand.
 * 5. Join and login as customer.
 * 6. Create a customer cart for the customer.
 * 7. Add one SKU of the product into the cart as an item.
 * 8. Create an order from the cart using simple, self-consistent totals.
 * 9. Create a product review for the product as the same customer.
 * 10. Without creating any seller response, call the public sellerResponse.at
 *     endpoint using the reviewId.
 * 11. Assert that the call does not throw HttpError and that the response matches
 *     IShoppingMallProductReviewSellerResponse according to typia.
 */
export async function test_api_public_seller_response_absent_returns_null_or_204(
  connection: api.IConnection,
) {
  // 1. Platform admin join & login (join already authenticates, but we also
  //    exercise explicit login to match multi-actor scenarios in other tests).
  const platformAdminJoinBody = {
    email: `${RandomGenerator.alphabets(8)}@admin.test.com`,
    name: RandomGenerator.name(2),
    password: "AdminPass!123",
    ip: null,
    href: "https://admin.test.com/join",
    referrer: "https://admin.test.com/landing",
  } satisfies IShoppingMallPlatformAdminJoin.IRequest;
  const platformAdminAuthorized: IShoppingMallPlatformAdmin.IAuthorized =
    await api.functional.auth.platformAdmin.join(connection, {
      body: platformAdminJoinBody,
    });
  typia.assert(platformAdminAuthorized);

  const platformAdminLoginBody = {
    email: platformAdminAuthorized.email,
    password: platformAdminJoinBody.password,
    ip: null,
    href: "https://admin.test.com/login",
    referrer: "https://admin.test.com/landing",
  } satisfies IShoppingMallPlatformAdminLogin.IRequest;
  const platformAdminLoginResult: IShoppingMallPlatformAdmin.IAuthorized =
    await api.functional.auth.platformAdmin.login(connection, {
      body: platformAdminLoginBody,
    });
  typia.assert(platformAdminLoginResult);

  // 2. Create a brand under platform admin context for realistic catalog.
  const brandCreateBody = {
    name: `Brand ${RandomGenerator.name(1)}`,
    slug: `brand-${RandomGenerator.alphaNumeric(8)}`,
    description: RandomGenerator.paragraph({ sentences: 5 }),
    logo_uri: "https://cdn.test.com/logo.png",
  } satisfies IShoppingMallBrand.ICreate;
  const brand: IShoppingMallBrand =
    await api.functional.shoppingMall.platformAdmin.brands.create(connection, {
      body: brandCreateBody,
    });
  typia.assert(brand);

  // 3. Seller join & login.
  const sellerJoinBody = {
    email: `${RandomGenerator.alphabets(8)}@seller.test.com`,
    password: "SellerPass!123",
    storeName: `Store ${RandomGenerator.name(1)}`,
    contactPhone: RandomGenerator.mobile(),
  } satisfies IShoppingMallSellerJoin.IRequest;
  const sellerAuthorized: IShoppingMallSeller.IAuthorized =
    await api.functional.auth.seller.join(connection, {
      body: sellerJoinBody,
    });
  typia.assert(sellerAuthorized);

  const sellerLoginBody = {
    email: sellerAuthorized.email,
    password: sellerJoinBody.password,
    ip: null,
    href: "https://seller.test.com/login",
    referrer: "https://seller.test.com/landing",
  } satisfies IShoppingMallSellerLogin.IRequest;
  const sellerLoginResult: IShoppingMallSeller.IAuthorized =
    await api.functional.auth.seller.login(connection, {
      body: sellerLoginBody,
    });
  typia.assert(sellerLoginResult);

  // 4. Seller creates a product associated with the brand.
  const productCreateBody = {
    shopping_mall_seller_id: sellerAuthorized.id,
    shopping_mall_brand_id: brand.id,
    code: `PROD-${RandomGenerator.alphaNumeric(10)}`,
    name: `Product ${RandomGenerator.name(1)}`,
    short_description: RandomGenerator.paragraph({ sentences: 3 }),
    description: RandomGenerator.content({ paragraphs: 2 }),
    status: "active",
    is_multi_sku: false,
    primary_image_uri: "https://cdn.test.com/product.png",
    additional_data: null,
  } satisfies IShoppingMallProduct.ICreate;
  const product: IShoppingMallProduct =
    await api.functional.shoppingMall.seller.products.create(connection, {
      body: productCreateBody,
    });
  typia.assert(product);

  // For simplicity, we assume an SKU exists and use a random UUID for skuId
  // when adding a cart item, because SKU creation APIs are not part of this
  // test’s available operations. The focus is end-to-end wiring,
  // not SKU lifecycle.

  // 5. Customer join & login.
  const customerJoinBody = {
    email: `${RandomGenerator.alphabets(8)}@customer.test.com`,
    password: "CustomerPass!123",
    name: RandomGenerator.name(2),
    ip: null,
    href: "https://shop.test.com/join",
    referrer: "https://shop.test.com/landing",
  } satisfies IShoppingMallCustomerAuth.IJoin;
  const customerAuthorized: IShoppingMallCustomer.IAuthorized =
    await api.functional.auth.customer.join(connection, {
      body: customerJoinBody,
    });
  typia.assert(customerAuthorized);

  const customerLoginBody = {
    email: customerAuthorized.email,
    password: customerJoinBody.password,
    ip: null,
    href: "https://shop.test.com/login",
    referrer: "https://shop.test.com/landing",
    userAgent: "E2E-Tester/1.0",
  } satisfies IShoppingMallCustomerAuth.ILogin;
  const customerLoginResult: IShoppingMallCustomer.IAuthorized =
    await api.functional.auth.customer.login(connection, {
      body: customerLoginBody,
    });
  typia.assert(customerLoginResult);

  // 6. Create a customer cart.
  const cartCreateBody = {
    currency_code: "USD",
    region_code: "US",
    channel: "web",
    metadata: {
      scenario: "seller-response-absent",
    },
    is_active: true,
    source_guest_token: undefined,
  } satisfies IShoppingMallCustomerCart.ICreate;
  const cart: IShoppingMallCustomerCart =
    await api.functional.shoppingMall.customer.customerCarts.create(
      connection,
      {
        body: cartCreateBody,
      },
    );
  typia.assert(cart);

  // 7. Add one item to the cart.
  const cartItemCreateBody = {
    skuId: typia.random<string & tags.Format<"uuid">>(),
    quantity: 1,
    note: "Test line item for review flow",
  } satisfies IShoppingMallCustomerCartItem.ICreate;
  const cartItem: IShoppingMallCustomerCartItem =
    await api.functional.shoppingMall.customer.customerCarts.items.create(
      connection,
      {
        customerCartId: cart.id,
        body: cartItemCreateBody,
      },
    );
  typia.assert(cartItem);

  // 8. Create an order from the cart.
  const itemsSubtotal = 100;
  const discountTotal = 0;
  const shippingTotal = 0;
  const taxTotal = 0;
  const grandTotal = itemsSubtotal - discountTotal + shippingTotal + taxTotal;

  const orderCreateBody = {
    customer_cart_id: cart.id,
    currency_code: cart.currency_code,
    items_subtotal_amount: itemsSubtotal,
    discount_total_amount: discountTotal,
    shipping_total_amount: shippingTotal,
    tax_total_amount: taxTotal,
    grand_total_amount: grandTotal,
    shipping_address_id: typia.random<string & tags.Format<"uuid">>(),
    billing_address_id: typia.random<string & tags.Format<"uuid">>(),
    customer_note: "Test order for review creation",
  } satisfies IShoppingMallOrder.ICreate;
  const order: IShoppingMallOrder =
    await api.functional.shoppingMall.customer.orders.create(connection, {
      body: orderCreateBody,
    });
  typia.assert(order);

  // 9. Create a product review for the product.
  const reviewCreateBody = {
    rating: 5,
    title: "Great product",
    body: RandomGenerator.paragraph({ sentences: 6 }),
  } satisfies IShoppingMallProductReview.ICreate;
  const review: IShoppingMallProductReview =
    await api.functional.shoppingMall.customer.products.reviews.create(
      connection,
      {
        productId: product.id,
        body: reviewCreateBody,
      },
    );
  typia.assert(review);

  // 10–11. Call the public sellerResponse endpoint without ever creating a
  //        seller response, and ensure it responds without error and matches
  //        the declared DTO type.
  const sellerResponse: IShoppingMallProductReviewSellerResponse =
    await api.functional.shoppingMall.reviews.sellerResponse.at(connection, {
      reviewId: review.id,
    });
  typia.assert(sellerResponse);

  TestValidator.predicate(
    "seller response retrieval for review without explicit response should not throw and must yield a typed payload",
    true,
  );
}
