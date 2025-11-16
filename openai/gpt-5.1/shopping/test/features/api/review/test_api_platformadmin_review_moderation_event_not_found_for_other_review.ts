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
import type { IShoppingMallProductReviewModerationEvent } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductReviewModerationEvent";
import type { IShoppingMallProductSku } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductSku";
import type { IShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSeller";
import type { IShoppingMallSellerJoin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSellerJoin";
import type { IShoppingMallSellerLogin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSellerLogin";

/**
 * Ensure moderation event detail lookup is scoped to its parent review.
 *
 * Business goal: Validate that the platform-admin-only moderation event detail
 * endpoint (`GET
 * /shoppingMall/platformAdmin/reviews/{reviewId}/moderationEvents/{moderationEventId}`)
 * does not leak moderation events that belong to a different product review
 * when callers provide a mismatched reviewId and moderationEventId
 * combination.
 *
 * High-level flow implemented with available APIs (using simulate mode
 * semantics where appropriate):
 *
 * 1. Register and authenticate a platform admin, seller, and customer.
 * 2. As platform admin, create a brand.
 * 3. As seller, create a product associated with that brand.
 * 4. As customer, create a cart, add one item, and create an order for realism.
 * 5. As customer, create two distinct product reviews for the product.
 * 6. As platform admin, call the moderationEvents.at endpoint once to obtain a
 *    sample moderation event (simulate mode) and treat it as the "happy-path"
 *    event.
 * 7. Construct a mismatched pair where the reviewId is one of the real review ids,
 *    but the moderationEventId comes from the sampled event whose review_id
 *    does not match that review.
 * 8. Assert that the mismatched call fails (throws), using TestValidator.error
 *    while ensuring the happy-path call returns a value that passes
 *    typia.assert.
 *
 * Note: Because the provided materials do not include write APIs for creating
 * moderation events or listing them per review, we leverage the SDK's simulate
 * mode behavior (typia.random) as a stand-in for a real moderation event
 * record. The key contract validated here is that a (reviewId,
 * moderationEventId) pair must be consistent; an inconsistent combination must
 * not succeed.
 */
export async function test_api_platformadmin_review_moderation_event_not_found_for_other_review(
  connection: api.IConnection,
) {
  // 1. Register platform admin and obtain authorized envelope
  const platformAdminJoinBody = {
    email: `${RandomGenerator.alphabets(8)}@admin.test`,
    name: RandomGenerator.name(),
    password: RandomGenerator.alphaNumeric(12),
    ip: null,
    href: "https://admin.shoppingmall.test/join",
    referrer: "https://admin.shoppingmall.test/",
  } satisfies IShoppingMallPlatformAdminJoin.IRequest;
  const platformAdminAuthorized: IShoppingMallPlatformAdmin.IAuthorized =
    await api.functional.auth.platformAdmin.join(connection, {
      body: platformAdminJoinBody,
    });
  typia.assert(platformAdminAuthorized);

  // 2. Register seller
  const sellerEmail = `${RandomGenerator.alphabets(8)}@seller.test`;
  const sellerJoinBody = {
    email: sellerEmail,
    password: RandomGenerator.alphaNumeric(12),
    storeName: `Store-${RandomGenerator.alphabets(6)}`,
    contactPhone: RandomGenerator.mobile(),
  } satisfies IShoppingMallSellerJoin.IRequest;
  const sellerAuthorized: IShoppingMallSeller.IAuthorized =
    await api.functional.auth.seller.join(connection, {
      body: sellerJoinBody,
    });
  typia.assert(sellerAuthorized);

  // 3. Register customer
  const customerEmail = `${RandomGenerator.alphabets(8)}@customer.test`;
  const customerJoinBody = {
    email: customerEmail,
    password: RandomGenerator.alphaNumeric(12),
    name: RandomGenerator.name(),
    ip: null,
    href: "https://shoppingmall.test/join",
    referrer: "https://shoppingmall.test/",
  } satisfies IShoppingMallCustomerAuth.IJoin;
  const customerAuthorized: IShoppingMallCustomer.IAuthorized =
    await api.functional.auth.customer.join(connection, {
      body: customerJoinBody,
    });
  typia.assert(customerAuthorized);

  // 4. Switch back to platform admin (explicit login) and create a brand
  const platformAdminLoginBody = {
    email: platformAdminJoinBody.email,
    password: platformAdminJoinBody.password,
    ip: null,
    href: "https://admin.shoppingmall.test/login",
    referrer: "https://admin.shoppingmall.test/",
  } satisfies IShoppingMallPlatformAdminLogin.IRequest;
  const platformAdminLogin: IShoppingMallPlatformAdmin.IAuthorized =
    await api.functional.auth.platformAdmin.login(connection, {
      body: platformAdminLoginBody,
    });
  typia.assert(platformAdminLogin);

  const brandCreateBody = {
    name: `Brand-${RandomGenerator.alphabets(6)}`,
    slug: `brand-${RandomGenerator.alphabets(8)}`,
    description: RandomGenerator.paragraph({ sentences: 5 }),
    logo_uri: "https://cdn.shoppingmall.test/logo.png",
  } satisfies IShoppingMallBrand.ICreate;
  const brand: IShoppingMallBrand =
    await api.functional.shoppingMall.platformAdmin.brands.create(connection, {
      body: brandCreateBody,
    });
  typia.assert(brand);

  // 5. Switch to seller and create a product for that brand
  const sellerLoginBody = {
    email: sellerJoinBody.email,
    password: sellerJoinBody.password,
    ip: null,
    href: "https://seller.shoppingmall.test/login",
    referrer: "https://seller.shoppingmall.test/",
  } satisfies IShoppingMallSellerLogin.IRequest;
  const sellerLogin: IShoppingMallSeller.IAuthorized =
    await api.functional.auth.seller.login(connection, {
      body: sellerLoginBody,
    });
  typia.assert(sellerLogin);

  const productCreateBody = {
    shopping_mall_seller_id: sellerLogin.id,
    shopping_mall_brand_id: brand.id,
    code: `P-${RandomGenerator.alphabets(10)}`,
    name: `Product-${RandomGenerator.alphabets(6)}`,
    short_description: RandomGenerator.paragraph({ sentences: 3 }),
    description: RandomGenerator.paragraph({ sentences: 8 }),
    status: "active",
    is_multi_sku: false,
    primary_image_uri: "https://cdn.shoppingmall.test/product.png",
    additional_data: null,
  } satisfies IShoppingMallProduct.ICreate;
  const product: IShoppingMallProduct =
    await api.functional.shoppingMall.seller.products.create(connection, {
      body: productCreateBody,
    });
  typia.assert(product);

  // 6. Switch to customer for cart/order/review operations
  const customerLoginBody = {
    email: customerJoinBody.email,
    password: customerJoinBody.password,
    ip: null,
    href: "https://shoppingmall.test/login",
    referrer: "https://shoppingmall.test/",
  } satisfies IShoppingMallCustomerAuth.ILogin;
  const customerLogin: IShoppingMallCustomer.IAuthorized =
    await api.functional.auth.customer.login(connection, {
      body: customerLoginBody,
    });
  typia.assert(customerLogin);

  // 6.1 Create customer cart
  const cartCreateBody = {
    currency_code: "USD",
    region_code: "US",
    channel: "web",
    metadata: {
      campaign: "review-moderation-test",
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

  // 6.2 Add one item into the cart; skuId is random UUID for testing
  const cartItemCreateBody = {
    skuId: typia.random<string & tags.Format<"uuid">>(),
    quantity: 1,
    note: "test item for review flow",
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

  // 6.3 Create an order referencing the cart; totals are consistent
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
    customer_note: "please ship quickly",
  } satisfies IShoppingMallOrder.ICreate;
  const order: IShoppingMallOrder =
    await api.functional.shoppingMall.customer.orders.create(connection, {
      body: orderCreateBody,
    });
  typia.assert(order);

  // 7. Create two reviews for the product
  const reviewCreateBodyA = {
    rating: 5,
    title: "Excellent product",
    body: RandomGenerator.paragraph({ sentences: 10 }),
  } satisfies IShoppingMallProductReview.ICreate;
  const reviewA: IShoppingMallProductReview =
    await api.functional.shoppingMall.customer.products.reviews.create(
      connection,
      {
        productId: product.id,
        body: reviewCreateBodyA,
      },
    );
  typia.assert(reviewA);

  const reviewCreateBodyB = {
    rating: 3,
    title: "Average product",
    body: RandomGenerator.paragraph({ sentences: 6 }),
  } satisfies IShoppingMallProductReview.ICreate;
  const reviewB: IShoppingMallProductReview =
    await api.functional.shoppingMall.customer.products.reviews.create(
      connection,
      {
        productId: product.id,
        body: reviewCreateBodyB,
      },
    );
  typia.assert(reviewB);

  // 8. Switch back to platform admin for moderation event access
  const platformAdminLoginAgain: IShoppingMallPlatformAdmin.IAuthorized =
    await api.functional.auth.platformAdmin.login(connection, {
      body: platformAdminLoginBody,
    });
  typia.assert(platformAdminLoginAgain);

  // 9. Happy-path call: sample a moderation event for reviewB
  const sampledModerationEvent: IShoppingMallProductReviewModerationEvent =
    await api.functional.shoppingMall.platformAdmin.reviews.moderationEvents.at(
      connection,
      {
        reviewId: reviewB.id,
        moderationEventId: typia.random<string & tags.Format<"uuid">>(),
      },
    );
  typia.assert(sampledModerationEvent);

  TestValidator.predicate(
    "sampled moderation event should belong to some review id",
    sampledModerationEvent.review_id.length > 0,
  );

  // 10. Mismatched association: use reviewA.id with the sampled moderation event id
  await TestValidator.error(
    "mismatched reviewId and moderationEventId should fail",
    async () => {
      await api.functional.shoppingMall.platformAdmin.reviews.moderationEvents.at(
        connection,
        {
          reviewId: reviewA.id,
          moderationEventId: sampledModerationEvent.id,
        },
      );
    },
  );
}
