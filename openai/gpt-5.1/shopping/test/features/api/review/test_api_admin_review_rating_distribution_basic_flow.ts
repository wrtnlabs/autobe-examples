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
import type { IShoppingMallProductCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductCategory";
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
 * Validate the basic admin review rating distribution analytics flow.
 *
 * Business context:
 *
 * - Admins need to see aggregated rating distributions for reviews.
 * - Distribution can be filtered by product or SKU and a date range.
 *
 * Steps:
 *
 * 1. Admin joins and logs in.
 * 2. Admin creates a country and region used for customer shipping addresses.
 * 3. Admin creates a shipping method and a payment method.
 * 4. Seller joins and logs in, then creates a product.
 * 5. Admin associates the product with a (dummy) category so category filters are
 *    valid if used.
 * 6. Admin creates an inventory state and seller creates a SKU under the product.
 * 7. Customer joins and logs in, then creates a shipping address referencing the
 *    created country and region.
 * 8. Customer creates a cart and an order purchasing the created SKU using the
 *    shipping and payment methods.
 * 9. Customer writes four reviews (generic, product-scoped, SKU-scoped,
 *    customer-scoped) with known ratings.
 * 10. Admin logs back in and calls the rating distribution analytics endpoint
 *     twice:
 *
 *     - Once filtered by product_id
 *     - Once filtered by sku_id
 * 11. Validate that:
 *
 *     - TotalReviewCount is non-negative,
 *     - Bucket.reviewCount sums equal totalReviewCount,
 *     - ScaleMin and scaleMax correspond to the 1–5 rating scale,
 *     - AverageRating, when there are reviews, lies within [scaleMin, scaleMax].
 */
export async function test_api_admin_review_rating_distribution_basic_flow(
  connection: api.IConnection,
): Promise<void> {
  // 1. Admin joins
  const adminJoinBody = {
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(12) as string &
      tags.Format<"password">,
    ip: null,
    href: "https://admin.example.com/join" as string & tags.Format<"uri">,
    referrer: "https://admin.example.com" as string & tags.Format<"uri">,
  } satisfies IShoppingMallAdminJoin.ICreate;
  const adminAuthorized: IShoppingMallAdmin.IAuthorized =
    await api.functional.auth.admin.join(connection, {
      body: adminJoinBody,
    });
  typia.assert(adminAuthorized);

  // 1-2. Admin logs in again (explicitly exercise login)
  const adminLoginBody = {
    email: adminJoinBody.email,
    password: adminJoinBody.password,
    ip: null,
    href: "https://admin.example.com/login" as string & tags.Format<"uri">,
    referrer: "https://admin.example.com" as string & tags.Format<"uri">,
  } satisfies IShoppingMallAdminLogin.ICreate;
  const adminLogin: IShoppingMallAdmin.IAuthorized =
    await api.functional.auth.admin.login(connection, {
      body: adminLoginBody,
    });
  typia.assert(adminLogin);

  // 2. Admin creates a country and region
  const countryBody = {
    country_code: "US",
    name_en: "United States",
    phone_code: "+1",
    is_active: true,
    sort_order: 1 as number & tags.Type<"int32">,
  } satisfies IShoppingMallCountry.ICreate;
  const country: IShoppingMallCountry =
    await api.functional.shoppingMall.admin.countries.create(connection, {
      body: countryBody,
    });
  typia.assert(country);

  const regionBody = {
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
        body: regionBody,
      },
    );
  typia.assert(region);

  // 3. Admin creates shipping and payment methods
  const shippingMethodBody = {
    method_code: "standard",
    display_name: "Standard Shipping",
    service_level_description: "Standard ground shipping",
  } satisfies IShoppingMallShippingMethod.ICreate;
  const shippingMethod: IShoppingMallShippingMethod =
    await api.functional.shoppingMall.admin.shippingMethods.create(connection, {
      body: shippingMethodBody,
    });
  typia.assert(shippingMethod);

  const paymentMethodBody = {
    code: "card",
    display_name: "Credit Card",
    description: "Standard card payments",
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

  // 4. Seller joins & logs in
  const sellerJoinBody = {
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(12) as string &
      tags.Format<"password">,
    ip: null,
    href: "https://seller.example.com/join" as string & tags.Format<"uri">,
    referrer: "https://seller.example.com" as string & tags.Format<"uri">,
  } satisfies IShoppingMallSellerAuthJoin.IRequest;
  const sellerAuth: IShoppingMallSeller.IAuthorized =
    await api.functional.auth.seller.join(connection, {
      body: sellerJoinBody,
    });
  typia.assert(sellerAuth);

  const sellerLoginBody = {
    email: sellerJoinBody.email,
    password: sellerJoinBody.password,
    ip: null,
    href: "https://seller.example.com/login" as string & tags.Format<"uri">,
    referrer: "https://seller.example.com" as string & tags.Format<"uri">,
  } satisfies IShoppingMallSellerAuthLogin.IRequest;
  const sellerLogin: IShoppingMallSeller.IAuthorized =
    await api.functional.auth.seller.login(connection, {
      body: sellerLoginBody,
    });
  typia.assert(sellerLogin);

  // 5. Seller creates a product
  const productBody = {
    code: RandomGenerator.alphaNumeric(8),
    title: RandomGenerator.paragraph({ sentences: 3 }),
    summary: RandomGenerator.paragraph({ sentences: 5 }),
    description: RandomGenerator.content({ paragraphs: 2 }),
    brand: "BrandX",
    model_name: "ModelY",
    status: "active",
    primary_image_uri: "https://cdn.example.com/product.jpg" as string &
      tags.Format<"uri">,
    default_locale: "en-US",
  } satisfies IShoppingMallProduct.ICreate;
  const product: IShoppingMallProduct =
    await api.functional.shoppingMall.seller.products.create(connection, {
      body: productBody,
    });
  typia.assert(product);

  // 5b. Admin associates product to a random category (dummy ID)
  const randomCategoryId = typia.random<string & tags.Format<"uuid">>();
  const productCategoryBody = {
    shopping_mall_category_id: randomCategoryId,
    is_primary: true,
  } satisfies IShoppingMallProductCategory.ICreate;
  const categoryLink =
    await api.functional.shoppingMall.admin.products.categories.create(
      connection,
      {
        productId: product.id,
        body: productCategoryBody,
      },
    );
  typia.assert(categoryLink);

  // 6. Admin creates SKU inventory state; seller creates SKU
  const skuInventoryStateBody = {
    code: "in_stock",
    name: "In Stock",
    description: "Available for purchase",
    is_purchasable: true,
  } satisfies IShoppingMallSkuInventoryState.ICreate;
  const skuState: IShoppingMallSkuInventoryState =
    await api.functional.shoppingMall.admin.skuInventoryStates.create(
      connection,
      {
        body: skuInventoryStateBody,
      },
    );
  typia.assert(skuState);

  const skuCreateBody = {
    code: RandomGenerator.alphaNumeric(8) as string &
      tags.MinLength<1> &
      tags.MaxLength<255>,
    barcode: null,
    status: "active" as string & tags.MinLength<1> & tags.MaxLength<64>,
    price: 100,
    original_price: null,
    inventory_quantity: 10 as number & tags.Type<"int32"> & tags.Minimum<0>,
    low_stock_threshold: null,
    shopping_mall_sku_inventory_state_id: skuState.id,
    attribute_value_ids: [],
    external_ids: [],
  } satisfies IShoppingMallSku.ICreate;
  const sku: IShoppingMallSku =
    await api.functional.shoppingMall.seller.products.skus.create(connection, {
      productId: product.id,
      body: skuCreateBody,
    });
  typia.assert(sku);

  // 7. Customer joins, logs in, and creates address
  const customerJoinBody = {
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(12) as string &
      tags.Format<"password">,
    ip: null,
    href: "https://shop.example.com/join" as string & tags.Format<"uri">,
    referrer: "https://shop.example.com" as string & tags.Format<"uri">,
  } satisfies IShoppingMallCustomerJoin.IRequest;
  const customerAuth: IShoppingMallCustomer.IAuthorized =
    await api.functional.auth.customer.join(connection, {
      body: customerJoinBody,
    });
  typia.assert(customerAuth);

  const customerLoginBody = {
    email: customerJoinBody.email,
    password: customerJoinBody.password,
    ip: null,
    href: "https://shop.example.com/login" as string & tags.Format<"uri">,
    referrer: "https://shop.example.com" as string & tags.Format<"uri">,
  } satisfies IShoppingMallCustomerLogin.IRequest;
  const customerLogin: IShoppingMallCustomer.IAuthorized =
    await api.functional.auth.customer.login(connection, {
      body: customerLoginBody,
    });
  typia.assert(customerLogin);

  const addressBody = {
    shopping_mall_country_id: country.id,
    shopping_mall_region_id: region.id,
    recipient_name: RandomGenerator.name(2),
    line1: RandomGenerator.paragraph({ sentences: 2 }),
    line2: null,
    city: "San Francisco",
    postal_code: "94105",
    phone_number: RandomGenerator.mobile(),
    is_default: true,
  } satisfies IShoppingMallCustomerAddress.ICreate;
  const address: IShoppingMallCustomerAddress =
    await api.functional.shoppingMall.customer.customers.addresses.create(
      connection,
      {
        customerId: customerAuth.id,
        body: addressBody,
      },
    );
  typia.assert(address);

  // 8. Customer creates cart and order
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

  const orderItemCreate: IShoppingMallOrderItem.ICreate = {
    shopping_mall_sku_id: sku.id,
    quantity: 1 as number & tags.Type<"int32">,
  };
  const shippingSnapshotBody = {
    recipient_name: address.recipient_name,
    phone_number: address.phone_number ?? "",
    country_code: country.country_code,
    postal_code: address.postal_code,
    state_or_region: "California",
    city: address.city,
    address_line1: address.line1,
    address_line2: address.line2 ?? null,
  } satisfies IShoppingMallShippingAddressSnapshot.ICreate;
  const orderBody = {
    cart_id: cart.id,
    currency_code: cart.currency_code,
    items: [orderItemCreate],
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

  // 9. Customer creates reviews with known ratings
  const ratings = [5, 4, 3, 2] as const;

  const genericReviewBody = {
    rating: ratings[0],
    title: "Generic review",
    body: "Generic order level review",
  } satisfies IShoppingMallReview.ICreate;
  const genericReview: IShoppingMallReview =
    await api.functional.shoppingMall.customer.reviews.create(connection, {
      body: genericReviewBody,
    });
  typia.assert(genericReview);

  const productReviewBody = {
    rating: ratings[1],
    title: "Product scoped review",
    body: "Product-focused review body",
  } satisfies IShoppingMallReview.ICreate;
  const productReview: IShoppingMallReview =
    await api.functional.shoppingMall.customer.products.reviews.create(
      connection,
      {
        productId: product.id,
        body: productReviewBody,
      },
    );
  typia.assert(productReview);

  const skuReviewBody = {
    rating: ratings[2],
    title: "SKU scoped review",
    body: "SKU-level review body",
  } satisfies IShoppingMallReview.ICreate;
  const skuReview: IShoppingMallReview =
    await api.functional.shoppingMall.customer.skus.reviews.create(connection, {
      skuId: sku.id,
      body: skuReviewBody,
    });
  typia.assert(skuReview);

  const customerReviewBody = {
    rating: ratings[3],
    title: "Customer scoped review",
    body: "Customer-centric review body",
  } satisfies IShoppingMallReview.ICreate;
  const customerReview: IShoppingMallReview =
    await api.functional.shoppingMall.customer.customers.reviews.create(
      connection,
      {
        customerId: customerAuth.id,
        body: customerReviewBody,
      },
    );
  typia.assert(customerReview);

  const allReviews: IShoppingMallReview[] = [
    genericReview,
    productReview,
    skuReview,
    customerReview,
  ];

  const ratingValues = allReviews.map((r) => r.rating);
  const expectedTotal = allReviews.length;
  const expectedAverage =
    ratingValues.reduce((acc, v) => acc + v, 0) / expectedTotal;
  void expectedAverage;

  // 10. Switch back to admin via login before calling analytics
  const adminLoginAgain: IShoppingMallAdmin.IAuthorized =
    await api.functional.auth.admin.login(connection, {
      body: adminLoginBody,
    });
  typia.assert(adminLoginAgain);

  // 11. Call analytics filtered by product_id
  const nowIso = new Date().toISOString() as string & tags.Format<"date-time">;

  const productFilterBody = {
    product_id: product.id,
    sku_id: null,
    seller_id: null,
    category_id: null,
    created_from: null,
    created_until: nowIso,
    min_review_count: null,
  } satisfies IShoppingMallReviewRatingDistribution.IRequest;
  const productDist: IShoppingMallReviewRatingDistribution =
    await api.functional.shoppingMall.admin.analytics.reviews.distribution.index(
      connection,
      {
        body: productFilterBody,
      },
    );
  typia.assert(productDist);

  TestValidator.predicate(
    "product distribution totalReviewCount is non-negative",
    productDist.totalReviewCount >= 0,
  );
  TestValidator.predicate(
    "product distribution scaleMin is 1",
    productDist.scaleMin === 1,
  );
  TestValidator.predicate(
    "product distribution scaleMax is 5",
    productDist.scaleMax === 5,
  );

  const productBucketTotal = productDist.buckets.reduce(
    (acc, b) => acc + b.reviewCount,
    0,
  );
  TestValidator.equals(
    "product distribution bucket reviewCount sum matches totalReviewCount",
    productBucketTotal,
    productDist.totalReviewCount,
  );

  TestValidator.predicate(
    "product distribution averageRating within rating scale",
    productDist.totalReviewCount === 0 ||
      (productDist.averageRating >= productDist.scaleMin &&
        productDist.averageRating <= productDist.scaleMax),
  );

  // 11b. Call analytics filtered by sku_id
  const skuFilterBody = {
    product_id: null,
    sku_id: sku.id,
    seller_id: null,
    category_id: null,
    created_from: null,
    created_until: nowIso,
    min_review_count: null,
  } satisfies IShoppingMallReviewRatingDistribution.IRequest;
  const skuDist: IShoppingMallReviewRatingDistribution =
    await api.functional.shoppingMall.admin.analytics.reviews.distribution.index(
      connection,
      {
        body: skuFilterBody,
      },
    );
  typia.assert(skuDist);

  TestValidator.predicate(
    "sku distribution totalReviewCount is non-negative",
    skuDist.totalReviewCount >= 0,
  );
  TestValidator.predicate(
    "sku distribution scaleMin is 1",
    skuDist.scaleMin === 1,
  );
  TestValidator.predicate(
    "sku distribution scaleMax is 5",
    skuDist.scaleMax === 5,
  );

  const skuBucketTotal = skuDist.buckets.reduce(
    (acc, b) => acc + b.reviewCount,
    0,
  );
  TestValidator.equals(
    "sku distribution bucket reviewCount sum matches totalReviewCount",
    skuBucketTotal,
    skuDist.totalReviewCount,
  );

  TestValidator.predicate(
    "sku distribution averageRating within rating scale",
    skuDist.totalReviewCount === 0 ||
      (skuDist.averageRating >= skuDist.scaleMin &&
        skuDist.averageRating <= skuDist.scaleMax),
  );
}
