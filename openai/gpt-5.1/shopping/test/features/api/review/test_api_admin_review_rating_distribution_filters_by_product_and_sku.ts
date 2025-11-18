import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdmin";
import type { IShoppingMallAdminJoin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdminJoin";
import type { IShoppingMallAdminLogin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdminLogin";
import type { IShoppingMallCart } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCart";
import type { IShoppingMallCartItemSummary } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCartItemSummary";
import type { IShoppingMallCartOwnerCustomerSummary } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCartOwnerCustomerSummary";
import type { IShoppingMallCartOwnerGuestUserSummary } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCartOwnerGuestUserSummary";
import type { IShoppingMallCaseSlaConfig } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCaseSlaConfig";
import type { IShoppingMallCountry } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCountry";
import type { IShoppingMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomer";
import type { IShoppingMallCustomerAddress } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomerAddress";
import type { IShoppingMallCustomerAddressSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomerAddressSnapshot";
import type { IShoppingMallCustomerJoin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomerJoin";
import type { IShoppingMallCustomerLogin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomerLogin";
import type { IShoppingMallDispute } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallDispute";
import type { IShoppingMallGuestUser } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallGuestUser";
import type { IShoppingMallLegalHold } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallLegalHold";
import type { IShoppingMallOrder } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrder";
import type { IShoppingMallOrderItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrderItem";
import type { IShoppingMallOrderPayment } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrderPayment";
import type { IShoppingMallOrderPriceSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrderPriceSnapshot";
import type { IShoppingMallOrderShippingAddress } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrderShippingAddress";
import type { IShoppingMallOrderStatusHistory } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrderStatusHistory";
import type { IShoppingMallPaymentChargeback } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallPaymentChargeback";
import type { IShoppingMallPaymentMethod } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallPaymentMethod";
import type { IShoppingMallPaymentRefund } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallPaymentRefund";
import type { IShoppingMallPaymentStatusHistory } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallPaymentStatusHistory";
import type { IShoppingMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProduct";
import type { IShoppingMallRefundRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallRefundRequest";
import type { IShoppingMallRegion } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallRegion";
import type { IShoppingMallReview } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallReview";
import type { IShoppingMallReviewRatingDistribution } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallReviewRatingDistribution";
import type { IShoppingMallReviewRatingDistributionBucket } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallReviewRatingDistributionBucket";
import type { IShoppingMallRiskCase } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallRiskCase";
import type { IShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSeller";
import type { IShoppingMallSellerAuthJoin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSellerAuthJoin";
import type { IShoppingMallSellerAuthLogin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSellerAuthLogin";
import type { IShoppingMallSellerProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSellerProfile";
import type { IShoppingMallShipment } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallShipment";
import type { IShoppingMallShipmentItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallShipmentItem";
import type { IShoppingMallShippingAddressSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallShippingAddressSnapshot";
import type { IShoppingMallShippingMethod } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallShippingMethod";
import type { IShoppingMallSku } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSku";
import type { IShoppingMallSkuExternalId } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSkuExternalId";
import type { IShoppingMallSkuInventoryState } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSkuInventoryState";

/**
 * Validate that admin review rating distribution analytics correctly apply
 * product-level and SKU-level filters, and respect minimum review count
 * thresholds.
 *
 * Business flow:
 *
 * 1. Admin joins and logs in to seed configuration (country, region, inventory
 *    state, shipping and payment methods).
 * 2. Seller joins and logs in, then creates two products (A, B) and one SKU under
 *    each.
 * 3. Customer joins and logs in, creates a shipping address, cart, and an order
 *    that buys both SKUs.
 * 4. Customer creates reviews:
 *
 *    - Product A: two product-level reviews (ratings 5, 4) and one SKU-level review
 *         on skuA (rating 2).
 *    - Product B: one product-level review (rating 3) and one SKU-level review on
 *         skuB (rating 1).
 * 5. Admin calls PATCH /shoppingMall/admin/analytics/reviews/distribution:
 *
 *    - Filter by product_id = productA.id, sku_id = null and validate buckets,
 *         totalReviewCount, averageRating for ratings {5,4,2} only.
 *    - Filter by sku_id = skuA.id, product_id = null and validate statistics for
 *         rating {2} only.
 *    - Filter again by product_id = productA.id with min_review_count set to exclude
 *         low-volume segments and ensure totals do not increase and remain
 *         consistent.
 */
export async function test_api_admin_review_rating_distribution_filters_by_product_and_sku(
  connection: api.IConnection,
) {
  // 1. Admin join & login
  const adminEmail: string = typia.random<string & tags.Format<"email">>();
  const adminJoinBody = {
    email: adminEmail,
    password: RandomGenerator.alphaNumeric(12) as string &
      tags.Format<"password">,
    ip: null,
    href: "https://admin.example.com/join" as string & tags.Format<"uri">,
    referrer: "https://admin.example.com/landing" as string &
      tags.Format<"uri">,
  } satisfies IShoppingMallAdminJoin.ICreate;

  const adminJoined: IShoppingMallAdmin.IAuthorized =
    await api.functional.auth.admin.join(connection, {
      body: adminJoinBody,
    });
  typia.assert(adminJoined);

  const adminLoginBody = {
    email: adminEmail,
    password: adminJoinBody.password,
    ip: null,
    href: "https://admin.example.com/login" as string & tags.Format<"uri">,
    referrer: "https://admin.example.com/landing" as string &
      tags.Format<"uri">,
  } satisfies IShoppingMallAdminLogin.ICreate;

  const adminLoggedIn: IShoppingMallAdmin.IAuthorized =
    await api.functional.auth.admin.login(connection, {
      body: adminLoginBody,
    });
  typia.assert(adminLoggedIn);

  // 2. Seed country and region
  const countryCreateBody = {
    country_code: "US",
    name_en: "United States",
    phone_code: "+1",
    is_active: true,
    sort_order: 1 as number & tags.Type<"int32">,
  } satisfies IShoppingMallCountry.ICreate;
  const country: IShoppingMallCountry =
    await api.functional.shoppingMall.admin.countries.create(connection, {
      body: countryCreateBody,
    });
  typia.assert(country);

  const regionCreateBody = {
    code: "CA",
    name_en: "California",
    region_type: "state",
    is_active: true,
    sort_order: 1 as number & tags.Type<"int32">,
  } satisfies IShoppingMallRegion.ICreate;
  const region: IShoppingMallRegion =
    await api.functional.shoppingMall.admin.countries.regions.create(
      connection,
      {
        countryCode: country.country_code,
        body: regionCreateBody,
      },
    );
  typia.assert(region);

  // 3. Seed generic SKU inventory state
  const inventoryStateBody = {
    code: "in_stock",
    name: "In Stock",
    description: "In stock and purchasable",
    is_purchasable: true,
  } satisfies IShoppingMallSkuInventoryState.ICreate;
  const inventoryState: IShoppingMallSkuInventoryState =
    await api.functional.shoppingMall.admin.skuInventoryStates.create(
      connection,
      { body: inventoryStateBody },
    );
  typia.assert(inventoryState);

  // 4. Seed shipping method and payment method
  const shippingMethodBody = {
    method_code: "standard",
    display_name: "Standard Shipping",
    service_level_description: "3-5 business days",
  } satisfies IShoppingMallShippingMethod.ICreate;
  const shippingMethod: IShoppingMallShippingMethod =
    await api.functional.shoppingMall.admin.shippingMethods.create(connection, {
      body: shippingMethodBody,
    });
  typia.assert(shippingMethod);

  const paymentMethodBody = {
    code: "card",
    display_name: "Credit Card",
    description: "Generic card processor",
    provider_type: "card_processor",
    allowed_currencies: null,
    allowed_countries: null,
    min_amount: null,
    max_amount: null,
    status: "active",
  } satisfies IShoppingMallPaymentMethod.ICreate;
  const paymentMethod: IShoppingMallPaymentMethod =
    await api.functional.shoppingMall.admin.paymentMethods.create(connection, {
      body: paymentMethodBody,
    });
  typia.assert(paymentMethod);

  // 5. Seller join & login
  const sellerEmail: string = typia.random<string & tags.Format<"email">>();
  const sellerJoinBody = {
    email: sellerEmail,
    password: RandomGenerator.alphaNumeric(12) as string &
      tags.Format<"password">,
    ip: null,
    href: "https://seller.example.com/join" as string & tags.Format<"uri">,
    referrer: "https://seller.example.com/landing" as string &
      tags.Format<"uri">,
  } satisfies IShoppingMallSellerAuthJoin.IRequest;
  const sellerJoined: IShoppingMallSeller.IAuthorized =
    await api.functional.auth.seller.join(connection, {
      body: sellerJoinBody,
    });
  typia.assert(sellerJoined);

  const sellerLoginBody = {
    email: sellerEmail,
    password: sellerJoinBody.password,
    ip: null,
    href: "https://seller.example.com/login" as string & tags.Format<"uri">,
    referrer: "https://seller.example.com/landing" as string &
      tags.Format<"uri">,
  } satisfies IShoppingMallSellerAuthLogin.IRequest;
  const sellerLoggedIn: IShoppingMallSeller.IAuthorized =
    await api.functional.auth.seller.login(connection, {
      body: sellerLoginBody,
    });
  typia.assert(sellerLoggedIn);

  // 6. Seller creates two products (A and B)
  const baseProductBody = (
    code: string,
    title: string,
  ): IShoppingMallProduct.ICreate => ({
    code,
    title,
    summary: RandomGenerator.paragraph({ sentences: 3 }),
    description: RandomGenerator.content({ paragraphs: 2 }),
    brand: "Generic Brand",
    model_name: null,
    status: "active",
    primary_image_uri: "https://cdn.example.com/product.jpg" as string &
      tags.Format<"uri">,
    default_locale: "en-US",
  });

  const productABody = baseProductBody("PROD-A", "Product A");
  const productA: IShoppingMallProduct =
    await api.functional.shoppingMall.seller.products.create(connection, {
      body: productABody,
    });
  typia.assert(productA);

  const productBBody = baseProductBody("PROD-B", "Product B");
  const productB: IShoppingMallProduct =
    await api.functional.shoppingMall.seller.products.create(connection, {
      body: productBBody,
    });
  typia.assert(productB);

  // 7. Seller creates one SKU under each product
  const skuCreateBody = (code: string): IShoppingMallSku.ICreate => ({
    code,
    barcode: null,
    status: "active",
    price: 100,
    original_price: null,
    inventory_quantity: 100 as number & tags.Type<"int32"> & tags.Minimum<0>,
    low_stock_threshold: 5 as number & tags.Type<"int32"> & tags.Minimum<0>,
    shopping_mall_sku_inventory_state_id: inventoryState.id,
    attribute_value_ids: [],
    external_ids: [],
  });

  const skuA: IShoppingMallSku =
    await api.functional.shoppingMall.seller.products.skus.create(connection, {
      productId: productA.id as string & tags.Format<"uuid">,
      body: skuCreateBody("SKU-A-1"),
    });
  typia.assert(skuA);

  const skuB: IShoppingMallSku =
    await api.functional.shoppingMall.seller.products.skus.create(connection, {
      productId: productB.id as string & tags.Format<"uuid">,
      body: skuCreateBody("SKU-B-1"),
    });
  typia.assert(skuB);

  // 8. Customer join & login
  const customerEmail: string = typia.random<string & tags.Format<"email">>();
  const customerJoinBody = {
    email: customerEmail,
    password: RandomGenerator.alphaNumeric(12) as string &
      tags.Format<"password">,
    ip: null,
    href: "https://shop.example.com/join" as string & tags.Format<"uri">,
    referrer: "https://shop.example.com/home" as string & tags.Format<"uri">,
  } satisfies IShoppingMallCustomerJoin.IRequest;
  const customerJoined: IShoppingMallCustomer.IAuthorized =
    await api.functional.auth.customer.join(connection, {
      body: customerJoinBody,
    });
  typia.assert(customerJoined);

  const customerLoginBody = {
    email: customerEmail,
    password: customerJoinBody.password,
    ip: null,
    href: "https://shop.example.com/login" as string & tags.Format<"uri">,
    referrer: "https://shop.example.com/home" as string & tags.Format<"uri">,
  } satisfies IShoppingMallCustomerLogin.IRequest;
  const customerLoggedIn: IShoppingMallCustomer.IAuthorized =
    await api.functional.auth.customer.login(connection, {
      body: customerLoginBody,
    });
  typia.assert(customerLoggedIn);

  // 9. Customer creates a shipping address
  const addressBody = {
    shopping_mall_country_id: country.id,
    shopping_mall_region_id: region.id,
    recipient_name: RandomGenerator.name(2),
    line1: "123 Test Street",
    line2: null,
    city: "Test City",
    postal_code: "90001",
    phone_number: RandomGenerator.mobile(),
    is_default: true,
  } satisfies IShoppingMallCustomerAddress.ICreate;
  const address: IShoppingMallCustomerAddress =
    await api.functional.shoppingMall.customer.customers.addresses.create(
      connection,
      {
        customerId: customerJoined.id,
        body: addressBody,
      },
    );
  typia.assert(address);

  // 10. Customer creates cart and order including both SKUs
  const cartBody = {
    actor_type: "customer",
    status: "active",
    currency_code: "USD",
  } satisfies IShoppingMallCart.ICreate;
  const cart: IShoppingMallCart =
    await api.functional.shoppingMall.customer.carts.create(connection, {
      body: cartBody,
    });
  typia.assert(cart);

  const orderItemBodies: IShoppingMallOrderItem.ICreate[] = [
    {
      shopping_mall_sku_id: skuA.id,
      quantity: 1 as number & tags.Type<"int32">,
    },
    {
      shopping_mall_sku_id: skuB.id,
      quantity: 1 as number & tags.Type<"int32">,
    },
  ];

  const shippingSnapshotBody: IShoppingMallShippingAddressSnapshot.ICreate = {
    recipient_name: address.recipient_name,
    phone_number: address.phone_number ?? RandomGenerator.mobile(),
    country_code: country.country_code,
    postal_code: address.postal_code,
    state_or_region: region.name_en,
    city: address.city,
    address_line1: address.line1,
    address_line2: address.line2 ?? null,
  } satisfies IShoppingMallShippingAddressSnapshot.ICreate;

  const orderBody = {
    cart_id: cart.id,
    currency_code: cart.currency_code,
    items: orderItemBodies,
    shipping_address_id: address.id,
    shipping_address_snapshot: shippingSnapshotBody,
    shipping_method_id: shippingMethod.id,
    payment_method_id: paymentMethod.id,
    buyer_memo: null,
    platform_note: null,
  } satisfies IShoppingMallOrder.ICreate;

  const order: IShoppingMallOrder =
    await api.functional.shoppingMall.customer.orders.create(connection, {
      body: orderBody,
    });
  typia.assert(order);

  // 11. Customer creates product-level and SKU-level reviews
  const createReviewBodies = (
    ratings: number[],
  ): IShoppingMallReview.ICreate[] =>
    ratings.map(
      (rating) =>
        ({
          rating: rating as number &
            tags.Type<"int32"> &
            tags.Minimum<1> &
            tags.Maximum<5>,
          title: RandomGenerator.paragraph({ sentences: 2 }),
          body: RandomGenerator.content({ paragraphs: 1 }),
        }) satisfies IShoppingMallReview.ICreate,
    );

  // Product A reviews: product-level ratings 5,4 and SKU-level rating 2
  const productAProductReviews: IShoppingMallReview.ICreate[] =
    createReviewBodies([5, 4]);
  const productASkuReviews: IShoppingMallReview.ICreate[] = createReviewBodies([
    2,
  ]);

  const productBProductReviews: IShoppingMallReview.ICreate[] =
    createReviewBodies([3]);
  const productBSkuReviews: IShoppingMallReview.ICreate[] = createReviewBodies([
    1,
  ]);

  const createdProductAProductReviews: IShoppingMallReview[] = [];
  for (const body of productAProductReviews) {
    const review: IShoppingMallReview =
      await api.functional.shoppingMall.customer.products.reviews.create(
        connection,
        {
          productId: productA.id as string & tags.Format<"uuid">,
          body,
        },
      );
    typia.assert(review);
    createdProductAProductReviews.push(review);
  }

  const createdProductASkuReviews: IShoppingMallReview[] = [];
  for (const body of productASkuReviews) {
    const review: IShoppingMallReview =
      await api.functional.shoppingMall.customer.skus.reviews.create(
        connection,
        {
          skuId: skuA.id as string & tags.Format<"uuid">,
          body,
        },
      );
    typia.assert(review);
    createdProductASkuReviews.push(review);
  }

  const createdProductBProductReviews: IShoppingMallReview[] = [];
  for (const body of productBProductReviews) {
    const review: IShoppingMallReview =
      await api.functional.shoppingMall.customer.products.reviews.create(
        connection,
        {
          productId: productB.id as string & tags.Format<"uuid">,
          body,
        },
      );
    typia.assert(review);
    createdProductBProductReviews.push(review);
  }

  const createdProductBSkuReviews: IShoppingMallReview[] = [];
  for (const body of productBSkuReviews) {
    const review: IShoppingMallReview =
      await api.functional.shoppingMall.customer.skus.reviews.create(
        connection,
        {
          skuId: skuB.id as string & tags.Format<"uuid">,
          body,
        },
      );
    typia.assert(review);
    createdProductBSkuReviews.push(review);
  }

  // 12. Admin login again to call analytics
  const adminRelogged: IShoppingMallAdmin.IAuthorized =
    await api.functional.auth.admin.login(connection, {
      body: adminLoginBody,
    });
  typia.assert(adminRelogged);

  // Distribution 1: product-level filter for Product A (sku_id null)
  const productADistributionBody = {
    product_id: productA.id,
    sku_id: null,
    seller_id: null,
    category_id: null,
    created_from: null,
    created_until: null,
    min_review_count: null,
  } satisfies IShoppingMallReviewRatingDistribution.IRequest;

  const productADistribution: IShoppingMallReviewRatingDistribution =
    await api.functional.shoppingMall.admin.analytics.reviews.distribution.index(
      connection,
      { body: productADistributionBody },
    );
  typia.assert(productADistribution);

  const expectedProductATotal =
    productAProductReviews.length + productASkuReviews.length;
  const expectedProductASumRating = 5 + 4 + 2;

  TestValidator.equals(
    "product A distribution: totalReviewCount should match number of A reviews",
    productADistribution.totalReviewCount,
    expectedProductATotal,
  );

  TestValidator.predicate(
    "product A distribution: bucket reviewCount sum equals totalReviewCount",
    productADistribution.buckets.reduce((sum, b) => sum + b.reviewCount, 0) ===
      productADistribution.totalReviewCount,
  );

  TestValidator.predicate(
    "product A distribution: averageRating roughly matches expected average",
    Math.abs(
      productADistribution.averageRating -
        expectedProductASumRating / expectedProductATotal,
    ) < 1e-6,
  );

  // Distribution 2: SKU-level filter for skuA only (product_id null)
  const skuADistributionBody = {
    product_id: null,
    sku_id: skuA.id,
    seller_id: null,
    category_id: null,
    created_from: null,
    created_until: null,
    min_review_count: null,
  } satisfies IShoppingMallReviewRatingDistribution.IRequest;

  const skuADistribution: IShoppingMallReviewRatingDistribution =
    await api.functional.shoppingMall.admin.analytics.reviews.distribution.index(
      connection,
      { body: skuADistributionBody },
    );
  typia.assert(skuADistribution);

  const expectedSkuATotal = productASkuReviews.length;
  const expectedSkuASumRating = 2;

  TestValidator.equals(
    "sku A distribution: totalReviewCount should match number of sku A reviews",
    skuADistribution.totalReviewCount,
    expectedSkuATotal,
  );

  TestValidator.predicate(
    "sku A distribution: bucket reviewCount sum equals totalReviewCount",
    skuADistribution.buckets.reduce((sum, b) => sum + b.reviewCount, 0) ===
      skuADistribution.totalReviewCount,
  );

  TestValidator.predicate(
    "sku A distribution: averageRating roughly matches expected average",
    Math.abs(
      skuADistribution.averageRating -
        expectedSkuASumRating / expectedSkuATotal,
    ) < 1e-6,
  );

  TestValidator.predicate(
    "product A distribution should have more reviews than sku A distribution",
    productADistribution.totalReviewCount > skuADistribution.totalReviewCount,
  );

  // Distribution 3: product-level with min_review_count filter
  const productADistributionWithMinBody = {
    product_id: productA.id,
    sku_id: null,
    seller_id: null,
    category_id: null,
    created_from: null,
    created_until: null,
    min_review_count: 2 as number & tags.Type<"int32">,
  } satisfies IShoppingMallReviewRatingDistribution.IRequest;

  const productADistributionWithMin: IShoppingMallReviewRatingDistribution =
    await api.functional.shoppingMall.admin.analytics.reviews.distribution.index(
      connection,
      { body: productADistributionWithMinBody },
    );
  typia.assert(productADistributionWithMin);

  TestValidator.predicate(
    "product A distribution with min_review_count should not increase total reviews",
    productADistributionWithMin.totalReviewCount <=
      productADistribution.totalReviewCount,
  );

  TestValidator.predicate(
    "product A distribution with min_review_count keeps bucket sum consistent",
    productADistributionWithMin.buckets.reduce(
      (sum, b) => sum + b.reviewCount,
      0,
    ) === productADistributionWithMin.totalReviewCount,
  );
}
