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
import type { IShoppingMallInventoryItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallInventoryItem";
import type { IShoppingMallOrder } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrder";
import type { IShoppingMallPlatformAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallPlatformAdmin";
import type { IShoppingMallPlatformAdminJoin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallPlatformAdminJoin";
import type { IShoppingMallPlatformAdminLogin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallPlatformAdminLogin";
import type { IShoppingMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProduct";
import type { IShoppingMallProductOptionType } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductOptionType";
import type { IShoppingMallProductOptionValue } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductOptionValue";
import type { IShoppingMallProductReview } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductReview";
import type { IShoppingMallProductSku } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductSku";
import type { IShoppingMallReviewStatisticsSummary } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallReviewStatisticsSummary";
import type { IShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSeller";
import type { IShoppingMallSellerJoin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSellerJoin";
import type { IShoppingMallSellerLogin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSellerLogin";

/**
 * Validate that the global review statistics summary aggregates multiple
 * reviews with different ratings across products.
 *
 * Business flow:
 *
 * 1. Platform admin joins and creates a brand.
 * 2. Seller joins and creates two products (A, B) under that brand, each with a
 *    simple option type/value and a single SKU, plus inventory.
 * 3. Customer joins, creates a cart, adds one SKU from each product, and creates
 *    an order.
 * 4. Customer writes three reviews: ratings 5 and 4 for Product A, and rating 2
 *    for Product B.
 * 5. Call GET /shoppingMall/reviews/statistics/summary and verify that:
 *
 *    - TotalReviewCount and recentReviewCount are at least 3.
 *    - TotalRatedProductCount is at least 2.
 *    - GlobalAverageRating lies within a reasonable range (1–5 and between min/max
 *         ratings of the new reviews).
 *    - RatingDistribution has buckets for 2, 4, and 5 with counts >= 1.
 */
export async function test_api_review_statistics_summary_with_multiple_ratings(
  connection: api.IConnection,
) {
  // 1. Platform admin joins
  const platformAdminEmail: string = typia.random<
    string & tags.Format<"email">
  >();

  const platformAdminJoinBody = {
    email: platformAdminEmail,
    name: RandomGenerator.name(),
    password: RandomGenerator.alphaNumeric(12),
    ip: null,
    href: "https://admin.example.com/join",
    referrer: "https://admin.example.com/",
  } satisfies IShoppingMallPlatformAdminJoin.IRequest;

  const platformAdminAuthorized: IShoppingMallPlatformAdmin.IAuthorized =
    await api.functional.auth.platformAdmin.join(connection, {
      body: platformAdminJoinBody,
    });
  typia.assert(platformAdminAuthorized);

  // Platform admin login
  const platformAdminLoginBody = {
    email: platformAdminEmail,
    password: platformAdminJoinBody.password,
    ip: null,
    href: "https://admin.example.com/login",
    referrer: "https://admin.example.com/",
  } satisfies IShoppingMallPlatformAdminLogin.IRequest;

  const platformAdminLoggedIn: IShoppingMallPlatformAdmin.IAuthorized =
    await api.functional.auth.platformAdmin.login(connection, {
      body: platformAdminLoginBody,
    });
  typia.assert(platformAdminLoggedIn);

  // 2. Create brand as platform admin
  const brandBody = {
    name: RandomGenerator.paragraph({ sentences: 2 }),
    slug: RandomGenerator.alphaNumeric(12),
    description: RandomGenerator.paragraph({ sentences: 5 }),
    logo_uri: "https://cdn.example.com/logo.png",
  } satisfies IShoppingMallBrand.ICreate;

  const brand: IShoppingMallBrand =
    await api.functional.shoppingMall.platformAdmin.brands.create(connection, {
      body: brandBody,
    });
  typia.assert(brand);

  // 3. Seller joins and logs in
  const sellerEmail: string = typia.random<string & tags.Format<"email">>();
  const sellerJoinBody = {
    email: sellerEmail,
    password: RandomGenerator.alphaNumeric(12),
    storeName: RandomGenerator.paragraph({ sentences: 2 }),
    contactPhone: RandomGenerator.mobile(),
  } satisfies IShoppingMallSellerJoin.IRequest;

  const sellerAuthorized: IShoppingMallSeller.IAuthorized =
    await api.functional.auth.seller.join(connection, {
      body: sellerJoinBody,
    });
  typia.assert(sellerAuthorized);

  const sellerLoginBody = {
    email: sellerEmail,
    password: sellerJoinBody.password,
    ip: null,
    href: "https://seller.example.com/login",
    referrer: "https://seller.example.com/",
  } satisfies IShoppingMallSellerLogin.IRequest;

  const sellerLoggedIn: IShoppingMallSeller.IAuthorized =
    await api.functional.auth.seller.login(connection, {
      body: sellerLoginBody,
    });
  typia.assert(sellerLoggedIn);

  const sellerId = sellerLoggedIn.id;
  const brandId = brand.id;

  // 4. Create two products under that brand
  const productACode = `PROD-A-${RandomGenerator.alphaNumeric(6)}`;
  const productBCode = `PROD-B-${RandomGenerator.alphaNumeric(6)}`;

  const productABody = {
    shopping_mall_seller_id: sellerId,
    shopping_mall_brand_id: brandId,
    code: productACode,
    name: RandomGenerator.paragraph({ sentences: 2 }),
    short_description: RandomGenerator.paragraph({ sentences: 3 }),
    description: RandomGenerator.content({ paragraphs: 2 }),
    status: "active",
    is_multi_sku: true,
    primary_image_uri: "https://cdn.example.com/product-a.png",
    additional_data: null,
  } satisfies IShoppingMallProduct.ICreate;

  const productBBody = {
    shopping_mall_seller_id: sellerId,
    shopping_mall_brand_id: brandId,
    code: productBCode,
    name: RandomGenerator.paragraph({ sentences: 2 }),
    short_description: RandomGenerator.paragraph({ sentences: 3 }),
    description: RandomGenerator.content({ paragraphs: 2 }),
    status: "active",
    is_multi_sku: true,
    primary_image_uri: "https://cdn.example.com/product-b.png",
    additional_data: null,
  } satisfies IShoppingMallProduct.ICreate;

  const productA: IShoppingMallProduct =
    await api.functional.shoppingMall.seller.products.create(connection, {
      body: productABody,
    });
  typia.assert(productA);

  const productB: IShoppingMallProduct =
    await api.functional.shoppingMall.seller.products.create(connection, {
      body: productBBody,
    });
  typia.assert(productB);

  // 5. Option types and values for each product
  const optionTypeABody = {
    name: "Color",
    display_name: "Color",
    display_order: 0,
  } satisfies IShoppingMallProductOptionType.ICreate;

  const optionTypeA: IShoppingMallProductOptionType =
    await api.functional.shoppingMall.seller.products.optionTypes.create(
      connection,
      {
        productCode: productA.code,
        body: optionTypeABody,
      },
    );
  typia.assert(optionTypeA);

  const optionTypeBBody = {
    name: "Size",
    display_name: "Size",
    display_order: 0,
  } satisfies IShoppingMallProductOptionType.ICreate;

  const optionTypeB: IShoppingMallProductOptionType =
    await api.functional.shoppingMall.seller.products.optionTypes.create(
      connection,
      {
        productCode: productB.code,
        body: optionTypeBBody,
      },
    );
  typia.assert(optionTypeB);

  const optionValueABody = {
    value: "red",
    display_name: "Red",
    display_order: 0,
    is_active: true,
  } satisfies IShoppingMallProductOptionValue.ICreate;

  const optionValueA: IShoppingMallProductOptionValue =
    await api.functional.shoppingMall.seller.products.optionTypes.values.create(
      connection,
      {
        productCode: productA.code,
        productOptionTypeId: optionTypeA.id,
        body: optionValueABody,
      },
    );
  typia.assert(optionValueA);

  const optionValueBBody = {
    value: "large",
    display_name: "Large",
    display_order: 0,
    is_active: true,
  } satisfies IShoppingMallProductOptionValue.ICreate;

  const optionValueB: IShoppingMallProductOptionValue =
    await api.functional.shoppingMall.seller.products.optionTypes.values.create(
      connection,
      {
        productCode: productB.code,
        productOptionTypeId: optionTypeB.id,
        body: optionValueBBody,
      },
    );
  typia.assert(optionValueB);

  // 6. SKUs for each product
  const skuABody = {
    code: `SKU-A-${RandomGenerator.alphaNumeric(6)}`,
    name: RandomGenerator.paragraph({ sentences: 2 }),
    listPrice: 100,
    salePrice: 90,
    currency: "USD",
    isActive: true,
    isPurchasable: true,
  } satisfies IShoppingMallProductSku.ICreate;

  const skuA: IShoppingMallProductSku =
    await api.functional.shoppingMall.seller.products.skus.create(connection, {
      productCode: productA.code,
      body: skuABody,
    });
  typia.assert(skuA);

  const skuBBody = {
    code: `SKU-B-${RandomGenerator.alphaNumeric(6)}`,
    name: RandomGenerator.paragraph({ sentences: 2 }),
    listPrice: 50,
    salePrice: 40,
    currency: "USD",
    isActive: true,
    isPurchasable: true,
  } satisfies IShoppingMallProductSku.ICreate;

  const skuB: IShoppingMallProductSku =
    await api.functional.shoppingMall.seller.products.skus.create(connection, {
      productCode: productB.code,
      body: skuBBody,
    });
  typia.assert(skuB);

  // 7. Inventory items for each SKU
  const inventoryABody = {
    product_sku_id: skuA.id,
    on_hand_quantity: 10,
    low_stock_threshold: 1,
    backorder_enabled: false,
    preorder_enabled: false,
  } satisfies IShoppingMallInventoryItem.ICreate;

  const inventoryA: IShoppingMallInventoryItem =
    await api.functional.shoppingMall.seller.inventoryItems.create(connection, {
      body: inventoryABody,
    });
  typia.assert(inventoryA);

  const inventoryBBody = {
    product_sku_id: skuB.id,
    on_hand_quantity: 10,
    low_stock_threshold: 1,
    backorder_enabled: false,
    preorder_enabled: false,
  } satisfies IShoppingMallInventoryItem.ICreate;

  const inventoryB: IShoppingMallInventoryItem =
    await api.functional.shoppingMall.seller.inventoryItems.create(connection, {
      body: inventoryBBody,
    });
  typia.assert(inventoryB);

  // 8. Customer joins and logs in
  const customerEmail: string = typia.random<string & tags.Format<"email">>();
  const customerJoinBody = {
    email: customerEmail,
    password: RandomGenerator.alphaNumeric(12),
    name: RandomGenerator.name(),
    ip: null,
    href: "https://shop.example.com/join",
    referrer: "https://shop.example.com/",
  } satisfies IShoppingMallCustomerAuth.IJoin;

  const customerAuthorized: IShoppingMallCustomer.IAuthorized =
    await api.functional.auth.customer.join(connection, {
      body: customerJoinBody,
    });
  typia.assert(customerAuthorized);

  const customerLoginBody = {
    email: customerEmail,
    password: customerJoinBody.password,
    ip: null,
    href: "https://shop.example.com/login",
    referrer: "https://shop.example.com/",
    userAgent: "E2E-Test-Agent",
  } satisfies IShoppingMallCustomerAuth.ILogin;

  const customerLoggedIn: IShoppingMallCustomer.IAuthorized =
    await api.functional.auth.customer.login(connection, {
      body: customerLoginBody,
    });
  typia.assert(customerLoggedIn);

  // 9. Customer cart creation
  const cartBody = {
    currency_code: "USD",
    region_code: "US",
    channel: "web",
    metadata: {
      testCase: "review-statistics-summary",
    },
    is_active: true,
  } satisfies IShoppingMallCustomerCart.ICreate;

  const cart: IShoppingMallCustomerCart =
    await api.functional.shoppingMall.customer.customerCarts.create(
      connection,
      {
        body: cartBody,
      },
    );
  typia.assert(cart);

  // 10. Add SKUs from both products to cart
  const cartItemABody = {
    skuId: skuA.id,
    quantity: 1,
    note: "Product A item",
  } satisfies IShoppingMallCustomerCartItem.ICreate;

  const cartItemA: IShoppingMallCustomerCartItem =
    await api.functional.shoppingMall.customer.customerCarts.items.create(
      connection,
      {
        customerCartId: cart.id,
        body: cartItemABody,
      },
    );
  typia.assert(cartItemA);

  const cartItemBBody = {
    skuId: skuB.id,
    quantity: 1,
    note: "Product B item",
  } satisfies IShoppingMallCustomerCartItem.ICreate;

  const cartItemB: IShoppingMallCustomerCartItem =
    await api.functional.shoppingMall.customer.customerCarts.items.create(
      connection,
      {
        customerCartId: cart.id,
        body: cartItemBBody,
      },
    );
  typia.assert(cartItemB);

  // 11. Create order from cart
  const itemsSubtotal = skuABody.salePrice + skuBBody.salePrice;
  const discountTotal = 0;
  const shippingTotal = 0;
  const taxTotal = 0;
  const grandTotal = itemsSubtotal - discountTotal + shippingTotal + taxTotal;

  const orderBody = {
    customer_cart_id: cart.id,
    currency_code: cart.currency_code,
    items_subtotal_amount: itemsSubtotal,
    discount_total_amount: discountTotal,
    shipping_total_amount: shippingTotal,
    tax_total_amount: taxTotal,
    grand_total_amount: grandTotal,
    shipping_address_id: typia.random<string & tags.Format<"uuid">>(),
    billing_address_id: typia.random<string & tags.Format<"uuid">>(),
    customer_note: "Review statistics test order",
  } satisfies IShoppingMallOrder.ICreate;

  const order: IShoppingMallOrder =
    await api.functional.shoppingMall.customer.orders.create(connection, {
      body: orderBody,
    });
  typia.assert(order);

  // 12. Create reviews as the same customer
  const reviewA1Body = {
    rating: 5,
    title: "Excellent product",
    body: RandomGenerator.paragraph({ sentences: 5 }),
  } satisfies IShoppingMallProductReview.ICreate;

  const reviewA1: IShoppingMallProductReview =
    await api.functional.shoppingMall.customer.products.reviews.create(
      connection,
      {
        productId: productA.id,
        body: reviewA1Body,
      },
    );
  typia.assert(reviewA1);

  const reviewA2Body = {
    rating: 4,
    title: "Good overall",
    body: RandomGenerator.paragraph({ sentences: 4 }),
  } satisfies IShoppingMallProductReview.ICreate;

  const reviewA2: IShoppingMallProductReview =
    await api.functional.shoppingMall.customer.products.reviews.create(
      connection,
      {
        productId: productA.id,
        body: reviewA2Body,
      },
    );
  typia.assert(reviewA2);

  const reviewBBody = {
    rating: 2,
    title: "Not satisfied",
    body: RandomGenerator.paragraph({ sentences: 4 }),
  } satisfies IShoppingMallProductReview.ICreate;

  const reviewB: IShoppingMallProductReview =
    await api.functional.shoppingMall.customer.products.reviews.create(
      connection,
      {
        productId: productB.id,
        body: reviewBBody,
      },
    );
  typia.assert(reviewB);

  // 13. Call statistics summary endpoint
  const summary: IShoppingMallReviewStatisticsSummary =
    await api.functional.shoppingMall.reviews.statistics.summary.index(
      connection,
    );
  typia.assert(summary);

  // 14. Business validations on aggregated statistics
  TestValidator.predicate(
    "totalReviewCount should be at least the three newly created reviews",
    summary.totalReviewCount >= 3,
  );

  TestValidator.predicate(
    "totalRatedProductCount should be at least the two products we reviewed",
    summary.totalRatedProductCount >= 2,
  );

  TestValidator.predicate(
    "globalAverageRating should stay within 1 to 5 range",
    summary.globalAverageRating >= 1 && summary.globalAverageRating <= 5,
  );

  const minNewRating = 2;
  const maxNewRating = 5;
  TestValidator.predicate(
    "globalAverageRating should be within min and max rating range",
    summary.globalAverageRating >= minNewRating &&
      summary.globalAverageRating <= maxNewRating,
  );

  const bucketFor2 = summary.ratingDistribution.find(
    (b) => b.ratingValue === 2,
  );
  const bucketFor4 = summary.ratingDistribution.find(
    (b) => b.ratingValue === 4,
  );
  const bucketFor5 = summary.ratingDistribution.find(
    (b) => b.ratingValue === 5,
  );

  TestValidator.predicate(
    "ratingDistribution should contain bucket for rating 2 with at least one review",
    bucketFor2 !== undefined && bucketFor2.reviewCount >= 1,
  );

  TestValidator.predicate(
    "ratingDistribution should contain bucket for rating 4 with at least one review",
    bucketFor4 !== undefined && bucketFor4.reviewCount >= 1,
  );

  TestValidator.predicate(
    "ratingDistribution should contain bucket for rating 5 with at least one review",
    bucketFor5 !== undefined && bucketFor5.reviewCount >= 1,
  );

  TestValidator.predicate(
    "recentReviewCount should be at least the number of reviews we just created",
    summary.recentReviewCount >= 3,
  );
}
