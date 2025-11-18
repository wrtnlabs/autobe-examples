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

export async function test_api_admin_review_rating_distribution_time_window(
  connection: api.IConnection,
) {
  // 1. Admin join & login
  const adminJoinBody = {
    email: typia.random<string & tags.Format<"email">>(),
    password: "Admin1234!" as string & tags.Format<"password">,
    ip: null,
    href: "https://admin.example.com/join" as string & tags.Format<"uri">,
    referrer: "https://admin.example.com/" as string & tags.Format<"uri">,
  } satisfies IShoppingMallAdminJoin.ICreate;
  const admin: IShoppingMallAdmin.IAuthorized =
    await api.functional.auth.admin.join(connection, {
      body: adminJoinBody,
    });
  typia.assert(admin);

  // ensure admin token is set on connection by SDK (join already sets Authorization header)

  // 2. Seller join & login
  const sellerEmail = typia.random<string & tags.Format<"email">>();
  const sellerJoinBody = {
    email: sellerEmail,
    password: "Seller1234!" as string & tags.Format<"password">,
    ip: null,
    href: "https://seller.example.com/join" as string & tags.Format<"uri">,
    referrer: "https://seller.example.com/" as string & tags.Format<"uri">,
  } satisfies IShoppingMallSellerAuthJoin.IRequest;
  const seller: IShoppingMallSeller.IAuthorized =
    await api.functional.auth.seller.join(connection, {
      body: sellerJoinBody,
    });
  typia.assert(seller);

  // 3. Customer join & login
  const customerEmail = typia.random<string & tags.Format<"email">>();
  const customerJoinBody = {
    email: customerEmail,
    password: "Customer1234!" as string & tags.Format<"password">,
    ip: null,
    href: "https://shop.example.com/join" as string & tags.Format<"uri">,
    referrer: "https://shop.example.com/" as string & tags.Format<"uri">,
  } satisfies IShoppingMallCustomerJoin.IRequest;
  const customer: IShoppingMallCustomer.IAuthorized =
    await api.functional.auth.customer.join(connection, {
      body: customerJoinBody,
    });
  typia.assert(customer);

  // 4. Switch back to admin context explicitly via login (optional but explicit)
  const adminLoginBody = {
    email: admin.email,
    password: adminJoinBody.password,
    ip: null,
    href: "https://admin.example.com/login" as string & tags.Format<"uri">,
    referrer: "https://admin.example.com/" as string & tags.Format<"uri">,
  } satisfies IShoppingMallAdminLogin.ICreate;
  const adminLoggedIn: IShoppingMallAdmin.IAuthorized =
    await api.functional.auth.admin.login(connection, {
      body: adminLoginBody,
    });
  typia.assert(adminLoggedIn);

  // 5. Admin: create country
  const countryBody = {
    country_code: "KR",
    name_en: "Korea, Republic of",
    phone_code: "+82",
    is_active: true,
    sort_order: 1 as number & tags.Type<"int32">,
  } satisfies IShoppingMallCountry.ICreate;
  const country: IShoppingMallCountry =
    await api.functional.shoppingMall.admin.countries.create(connection, {
      body: countryBody,
    });
  typia.assert(country);

  // 6. Admin: create region under country
  const regionBody = {
    code: "SEOUL",
    name_en: "Seoul",
    region_type: "city",
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

  // 7. Admin: create shipping method
  const shippingMethodBody = {
    method_code: "STANDARD",
    display_name: "Standard Shipping",
    service_level_description: "Standard delivery",
  } satisfies IShoppingMallShippingMethod.ICreate;
  const shippingMethod: IShoppingMallShippingMethod =
    await api.functional.shoppingMall.admin.shippingMethods.create(connection, {
      body: shippingMethodBody,
    });
  typia.assert(shippingMethod);

  // 8. Admin: create payment method
  const paymentMethodBody = {
    code: "CARD",
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

  // 9. Admin: create SKU inventory state
  const inventoryStateBody = {
    code: "IN_STOCK",
    name: "In Stock",
    description: "Available for sale",
    is_purchasable: true,
  } satisfies IShoppingMallSkuInventoryState.ICreate;
  const inventoryState: IShoppingMallSkuInventoryState =
    await api.functional.shoppingMall.admin.skuInventoryStates.create(
      connection,
      {
        body: inventoryStateBody,
      },
    );
  typia.assert(inventoryState);

  // 10. Switch to seller context
  const sellerLoginBody = {
    email: sellerEmail,
    password: sellerJoinBody.password,
    ip: null,
    href: "https://seller.example.com/login" as string & tags.Format<"uri">,
    referrer: "https://seller.example.com/" as string & tags.Format<"uri">,
  } satisfies IShoppingMallSellerAuthLogin.IRequest;
  const sellerLoggedIn: IShoppingMallSeller.IAuthorized =
    await api.functional.auth.seller.login(connection, {
      body: sellerLoginBody,
    });
  typia.assert(sellerLoggedIn);

  // 11. Seller: create product
  const productBody = {
    code: RandomGenerator.alphaNumeric(8),
    title: RandomGenerator.paragraph({ sentences: 3 }),
    summary: RandomGenerator.paragraph({ sentences: 5 }),
    description: RandomGenerator.content({ paragraphs: 2 }),
    brand: "AutoBE Test Brand",
    model_name: "Model-X",
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

  // 12. Seller: create SKU
  const skuBody = {
    code: RandomGenerator.alphaNumeric(8) as string &
      tags.MinLength<1> &
      tags.MaxLength<255>,
    barcode: null,
    status: "active" as string & tags.MinLength<1> & tags.MaxLength<64>,
    price: 100 as number & tags.Minimum<0>,
    original_price: null,
    inventory_quantity: 100 as number & tags.Type<"int32"> & tags.Minimum<0>,
    low_stock_threshold: null,
    shopping_mall_sku_inventory_state_id: inventoryState.id,
    attribute_value_ids: [],
    external_ids: [],
  } satisfies IShoppingMallSku.ICreate;
  const sku: IShoppingMallSku =
    await api.functional.shoppingMall.seller.products.skus.create(connection, {
      productId: product.id,
      body: skuBody,
    });
  typia.assert(sku);

  // 13. Switch to customer context
  const customerLoginBody = {
    email: customerEmail,
    password: customerJoinBody.password,
    ip: null,
    href: "https://shop.example.com/login" as string & tags.Format<"uri">,
    referrer: "https://shop.example.com/" as string & tags.Format<"uri">,
  } satisfies IShoppingMallCustomerLogin.IRequest;
  const customerLoggedIn: IShoppingMallCustomer.IAuthorized =
    await api.functional.auth.customer.login(connection, {
      body: customerLoginBody,
    });
  typia.assert(customerLoggedIn);

  // 14. Customer: create address
  const addressBody = {
    shopping_mall_country_id: country.id,
    shopping_mall_region_id: region.id,
    recipient_name: RandomGenerator.name(2),
    line1: "Test street 1",
    line2: null,
    city: "Seoul",
    postal_code: "06000",
    phone_number: RandomGenerator.mobile(),
    is_default: true,
  } satisfies IShoppingMallCustomerAddress.ICreate;
  const address: IShoppingMallCustomerAddress =
    await api.functional.shoppingMall.customer.customers.addresses.create(
      connection,
      {
        customerId: customerLoggedIn.id,
        body: addressBody,
      },
    );
  typia.assert(address);

  // 15. Customer: create cart
  const cartBody = {
    actor_type: "customer",
    status: "active",
    currency_code: "KRW",
  } satisfies IShoppingMallCart.ICreate;
  const cart: IShoppingMallCart =
    await api.functional.shoppingMall.customer.carts.create(connection, {
      body: cartBody,
    });
  typia.assert(cart);

  // 16. Customer: create order referencing the cart and shipping/payment methods
  const shippingAddressSnapshot: IShoppingMallShippingAddressSnapshot.ICreate =
    {
      recipient_name: address.recipient_name,
      phone_number: address.phone_number ?? RandomGenerator.mobile(),
      country_code: country.country_code,
      postal_code: address.postal_code,
      state_or_region: region.name_en,
      city: address.city,
      address_line1: address.line1,
      address_line2: address.line2 ?? null,
    };

  const orderBody = {
    cart_id: cart.id,
    currency_code: "KRW",
    items: [
      {
        shopping_mall_sku_id: sku.id,
        quantity: 1 as number & tags.Type<"int32">,
      } satisfies IShoppingMallOrderItem.ICreate,
    ],
    shipping_address_id: address.id,
    shipping_address_snapshot: shippingAddressSnapshot,
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

  // 17. Customer: create review A at time T0
  const reviewABody = {
    rating: 4 as number &
      tags.Type<"int32"> &
      tags.Minimum<1> &
      tags.Maximum<5>,
    title: "Review A" as string & tags.MinLength<1> & tags.MaxLength<255>,
    body: "Good product" as string & tags.MinLength<1>,
  } satisfies IShoppingMallReview.ICreate;
  const reviewA: IShoppingMallReview =
    await api.functional.shoppingMall.customer.products.reviews.create(
      connection,
      {
        productId: product.id,
        body: reviewABody,
      },
    );
  typia.assert(reviewA);

  const t0 = new Date(reviewA.created_at);

  // 18. Customer: create review B at time T1 (later)
  const reviewBBody = {
    rating: 2 as number &
      tags.Type<"int32"> &
      tags.Minimum<1> &
      tags.Maximum<5>,
    title: "Review B" as string & tags.MinLength<1> & tags.MaxLength<255>,
    body: "Not so good" as string & tags.MinLength<1>,
  } satisfies IShoppingMallReview.ICreate;
  const reviewB: IShoppingMallReview =
    await api.functional.shoppingMall.customer.products.reviews.create(
      connection,
      {
        productId: product.id,
        body: reviewBBody,
      },
    );
  typia.assert(reviewB);

  const t1 = new Date(reviewB.created_at);

  // Sanity check that T1 >= T0
  TestValidator.predicate(
    "T1 should be same or after T0",
    t1.getTime() >= t0.getTime(),
  );

  // Helper to build ISO strings with offsets
  const addMillis = (base: Date, delta: number): string =>
    new Date(base.getTime() + delta).toISOString();

  // 19. Switch to admin context again for analytics
  const adminRelogin: IShoppingMallAdmin.IAuthorized =
    await api.functional.auth.admin.login(connection, {
      body: adminLoginBody,
    });
  typia.assert(adminRelogin);

  // 20a. Window 1: include only review B (created_from between T0 and T1, created_until after T1)
  const window1From = addMillis(t0, 1);
  const window1Until = addMillis(t1, 1000);

  const dist1: IShoppingMallReviewRatingDistribution =
    await api.functional.shoppingMall.admin.analytics.reviews.distribution.index(
      connection,
      {
        body: {
          product_id: product.id,
          sku_id: null,
          seller_id: null,
          category_id: null,
          created_from: window1From,
          created_until: window1Until,
          min_review_count: null,
        } satisfies IShoppingMallReviewRatingDistribution.IRequest,
      },
    );
  typia.assert(dist1);

  TestValidator.equals(
    "window1 totalReviewCount should be 1 (only B)",
    dist1.totalReviewCount,
    1,
  );

  const bucketB1 = dist1.buckets.find((b) => b.ratingValue === reviewB.rating);
  TestValidator.predicate(
    "window1 should have bucket for rating of B",
    bucketB1 !== undefined,
  );
  if (bucketB1) {
    TestValidator.equals(
      "window1 bucket for B rating should have count 1",
      bucketB1.reviewCount,
      1,
    );
  }
  TestValidator.equals(
    "window1 averageRating should equal rating of B",
    dist1.averageRating,
    reviewB.rating,
  );

  // 20b. Window 2: include only review A (created_from before/equal T0, created_until between T0 and before T1)
  const window2From = addMillis(t0, -1000);
  const window2Until = addMillis(t1, -1);

  const dist2: IShoppingMallReviewRatingDistribution =
    await api.functional.shoppingMall.admin.analytics.reviews.distribution.index(
      connection,
      {
        body: {
          product_id: product.id,
          sku_id: null,
          seller_id: null,
          category_id: null,
          created_from: window2From,
          created_until: window2Until,
          min_review_count: null,
        } satisfies IShoppingMallReviewRatingDistribution.IRequest,
      },
    );
  typia.assert(dist2);

  TestValidator.equals(
    "window2 totalReviewCount should be 1 (only A)",
    dist2.totalReviewCount,
    1,
  );

  const bucketA2 = dist2.buckets.find((b) => b.ratingValue === reviewA.rating);
  TestValidator.predicate(
    "window2 should have bucket for rating of A",
    bucketA2 !== undefined,
  );
  if (bucketA2) {
    TestValidator.equals(
      "window2 bucket for A rating should have count 1",
      bucketA2.reviewCount,
      1,
    );
  }
  TestValidator.equals(
    "window2 averageRating should equal rating of A",
    dist2.averageRating,
    reviewA.rating,
  );

  // 20c. Window 3: wide window covering both T0 and T1
  const earlier = t0.getTime() <= t1.getTime() ? t0 : t1;
  const later = t0.getTime() <= t1.getTime() ? t1 : t0;
  const window3From = addMillis(earlier, -1000);
  const window3Until = addMillis(later, 1000);

  const dist3: IShoppingMallReviewRatingDistribution =
    await api.functional.shoppingMall.admin.analytics.reviews.distribution.index(
      connection,
      {
        body: {
          product_id: product.id,
          sku_id: null,
          seller_id: null,
          category_id: null,
          created_from: window3From,
          created_until: window3Until,
          min_review_count: null,
        } satisfies IShoppingMallReviewRatingDistribution.IRequest,
      },
    );
  typia.assert(dist3);

  TestValidator.equals(
    "window3 totalReviewCount should be 2 (A and B)",
    dist3.totalReviewCount,
    2,
  );

  const bucketA3 = dist3.buckets.find((b) => b.ratingValue === reviewA.rating);
  const bucketB3 = dist3.buckets.find((b) => b.ratingValue === reviewB.rating);
  TestValidator.predicate(
    "window3 should have bucket for rating of A",
    bucketA3 !== undefined,
  );
  TestValidator.predicate(
    "window3 should have bucket for rating of B",
    bucketB3 !== undefined,
  );

  const expectedAverage = (reviewA.rating + reviewB.rating) / 2;
  TestValidator.equals(
    "window3 averageRating should be arithmetic mean of A and B",
    dist3.averageRating,
    expectedAverage,
  );

  // 21. Boundary condition: use created_from == created_until == created_at for each review
  const distAExact: IShoppingMallReviewRatingDistribution =
    await api.functional.shoppingMall.admin.analytics.reviews.distribution.index(
      connection,
      {
        body: {
          product_id: product.id,
          sku_id: null,
          seller_id: null,
          category_id: null,
          created_from: reviewA.created_at,
          created_until: reviewA.created_at,
          min_review_count: null,
        } satisfies IShoppingMallReviewRatingDistribution.IRequest,
      },
    );
  typia.assert(distAExact);

  TestValidator.equals(
    "exact window at T0 should include only A",
    distAExact.totalReviewCount,
    1,
  );
  const bucketAExact = distAExact.buckets.find(
    (b) => b.ratingValue === reviewA.rating,
  );
  TestValidator.predicate(
    "exact window at T0 should have bucket for A",
    bucketAExact !== undefined,
  );

  const distBExact: IShoppingMallReviewRatingDistribution =
    await api.functional.shoppingMall.admin.analytics.reviews.distribution.index(
      connection,
      {
        body: {
          product_id: product.id,
          sku_id: null,
          seller_id: null,
          category_id: null,
          created_from: reviewB.created_at,
          created_until: reviewB.created_at,
          min_review_count: null,
        } satisfies IShoppingMallReviewRatingDistribution.IRequest,
      },
    );
  typia.assert(distBExact);

  TestValidator.equals(
    "exact window at T1 should include only B",
    distBExact.totalReviewCount,
    1,
  );
  const bucketBExact = distBExact.buckets.find(
    (b) => b.ratingValue === reviewB.rating,
  );
  TestValidator.predicate(
    "exact window at T1 should have bucket for B",
    bucketBExact !== undefined,
  );
}
