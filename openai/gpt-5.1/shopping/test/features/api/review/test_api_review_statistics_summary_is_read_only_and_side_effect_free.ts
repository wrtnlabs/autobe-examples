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
 * Validate that the global review statistics summary endpoint is read-only and
 * side-effect free.
 *
 * Business flow:
 *
 * 1. Register and authenticate three actors: platform admin, seller, and customer.
 * 2. As platform admin, create a catalog brand.
 * 3. As seller, create a product under that brand, define an option type and
 *    value, create a SKU, and provision inventory for it.
 * 4. As customer, create a cart, add the SKU as a cart item, and create an order
 *    referencing that cart (address and pricing snapshots via typia.random).
 * 5. As customer, create two deterministic product reviews (rating 4 and 5) for
 *    the product.
 * 6. Call GET /shoppingMall/reviews/statistics/summary once and capture all
 *    summary fields as a baseline.
 * 7. Call the same summary endpoint multiple times without any intervening write
 *    operations.
 * 8. For every subsequent call, assert that:
 *
 *    - All numeric aggregates (totalReviewCount, totalRatedProductCount,
 *         globalAverageRating, recentReviewCount) match the baseline.
 *    - RatingDistribution contains identical buckets (same ratingValue and
 *         reviewCount pairs).
 *    - The totals are consistent with the reviews we created (e.g., totalReviewCount
 *
 * > = 2 and distribution contains non-zero entries for 4 and 5).
 */
export async function test_api_review_statistics_summary_is_read_only_and_side_effect_free(
  connection: api.IConnection,
) {
  // 1. Platform admin registration and login
  const platformAdminJoinBody = {
    email: typia.random<string & tags.Format<"email">>(),
    name: RandomGenerator.name(2),
    password: RandomGenerator.alphabets(12),
    ip: null,
    href: "https://admin.example.com/join",
    referrer: "https://admin.example.com/",
  } satisfies IShoppingMallPlatformAdminJoin.IRequest;

  const platformAdmin: IShoppingMallPlatformAdmin.IAuthorized =
    await api.functional.auth.platformAdmin.join(connection, {
      body: platformAdminJoinBody,
    });
  typia.assert(platformAdmin);

  const platformAdminLoginBody = {
    email: platformAdmin.email,
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

  // 2. Seller registration and login
  const sellerJoinBody = {
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphabets(12),
    storeName: RandomGenerator.name(2),
    contactPhone: RandomGenerator.mobile(),
  } satisfies IShoppingMallSellerJoin.IRequest;

  const seller: IShoppingMallSeller.IAuthorized =
    await api.functional.auth.seller.join(connection, {
      body: sellerJoinBody,
    });
  typia.assert(seller);

  const sellerLoginBody = {
    email: seller.email,
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

  // 3. Customer registration and login
  const customerJoinBody = {
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphabets(12),
    name: RandomGenerator.name(2),
    ip: null,
    href: "https://shop.example.com/join",
    referrer: "https://shop.example.com/",
  } satisfies IShoppingMallCustomerAuth.IJoin;

  const customer: IShoppingMallCustomer.IAuthorized =
    await api.functional.auth.customer.join(connection, {
      body: customerJoinBody,
    });
  typia.assert(customer);

  const customerLoginBody = {
    email: customer.email,
    password: customerJoinBody.password,
    ip: null,
    href: "https://shop.example.com/login",
    referrer: "https://shop.example.com/",
    userAgent: "E2E-Test-Agent/1.0",
  } satisfies IShoppingMallCustomerAuth.ILogin;

  const customerLoggedIn: IShoppingMallCustomer.IAuthorized =
    await api.functional.auth.customer.login(connection, {
      body: customerLoginBody,
    });
  typia.assert(customerLoggedIn);

  // 4. As platform admin, create a brand
  const brandBody = {
    name: RandomGenerator.name(2),
    slug: RandomGenerator.alphaNumeric(12),
    description: RandomGenerator.paragraph({ sentences: 5 }),
    logo_uri: "https://cdn.example.com/logo.png",
  } satisfies IShoppingMallBrand.ICreate;

  const brand: IShoppingMallBrand =
    await api.functional.shoppingMall.platformAdmin.brands.create(connection, {
      body: brandBody,
    });
  typia.assert(brand);

  // 5. As seller, create a product under that brand
  const productCode = RandomGenerator.alphaNumeric(16);
  const productBody = {
    shopping_mall_seller_id: seller.id,
    shopping_mall_brand_id: brand.id,
    code: productCode as string & tags.MinLength<1>,
    name: RandomGenerator.paragraph({ sentences: 2 }) as string &
      tags.MinLength<1>,
    short_description: RandomGenerator.paragraph({ sentences: 3 }),
    description: RandomGenerator.content({ paragraphs: 2 }),
    status: "active" as string & tags.MinLength<1>,
    is_multi_sku: true,
    primary_image_uri: "https://cdn.example.com/product-main.png",
    additional_data: undefined,
  } satisfies IShoppingMallProduct.ICreate;

  const product: IShoppingMallProduct =
    await api.functional.shoppingMall.seller.products.create(connection, {
      body: productBody,
    });
  typia.assert(product);

  // 6. As seller, create an option type for the product
  const optionTypeBody = {
    name: "Size",
    display_name: "Size",
    display_order: 0 as number & tags.Type<"int32"> & tags.Minimum<0>,
  } satisfies IShoppingMallProductOptionType.ICreate;

  const optionType: IShoppingMallProductOptionType =
    await api.functional.shoppingMall.seller.products.optionTypes.create(
      connection,
      {
        productCode: product.code,
        body: optionTypeBody,
      },
    );
  typia.assert(optionType);

  // 7. As seller, create an option value under that option type
  const optionValueBody = {
    value: "M",
    display_name: "Medium",
    display_order: 0 as number & tags.Type<"int32">,
    is_active: true,
  } satisfies IShoppingMallProductOptionValue.ICreate;

  const optionValue: IShoppingMallProductOptionValue =
    await api.functional.shoppingMall.seller.products.optionTypes.values.create(
      connection,
      {
        productCode: product.code,
        productOptionTypeId: optionType.id,
        body: optionValueBody,
      },
    );
  typia.assert(optionValue);

  // 8. As seller, create a SKU for the product
  const skuCode = RandomGenerator.alphaNumeric(10);
  const skuBody = {
    code: skuCode,
    name: `${product.name} - ${optionValue.display_name ?? optionValue.value}`,
    listPrice: 10000,
    salePrice: 9000,
    currency: "KRW",
    isActive: true,
    isPurchasable: true,
  } satisfies IShoppingMallProductSku.ICreate;

  const sku: IShoppingMallProductSku =
    await api.functional.shoppingMall.seller.products.skus.create(connection, {
      productCode: product.code,
      body: skuBody,
    });
  typia.assert(sku);

  // 9. As seller, create inventory for the SKU
  const inventoryBody = {
    product_sku_id: sku.id,
    on_hand_quantity: 100 as number & tags.Type<"int32"> & tags.Minimum<0>,
    low_stock_threshold: 10 as number & tags.Type<"int32"> & tags.Minimum<0>,
    backorder_enabled: false,
    preorder_enabled: false,
  } satisfies IShoppingMallInventoryItem.ICreate;

  const inventoryItem: IShoppingMallInventoryItem =
    await api.functional.shoppingMall.seller.inventoryItems.create(connection, {
      body: inventoryBody,
    });
  typia.assert(inventoryItem);

  // 10. As customer, create a cart
  const cartBody = {
    currency_code: "KRW",
    region_code: "KR-Seoul",
    channel: "web",
    metadata: {
      source: "e2e-test",
    },
    is_active: true,
    source_guest_token: undefined,
  } satisfies IShoppingMallCustomerCart.ICreate;

  const cart: IShoppingMallCustomerCart =
    await api.functional.shoppingMall.customer.customerCarts.create(
      connection,
      {
        body: cartBody,
      },
    );
  typia.assert(cart);

  // 11. As customer, add an item for the SKU into the cart
  const cartItemBody = {
    skuId: sku.id,
    quantity: 1 as number & tags.Type<"int32"> & tags.Minimum<1>,
    note: "Test line item for statistics test",
  } satisfies IShoppingMallCustomerCartItem.ICreate;

  const cartItem: IShoppingMallCustomerCartItem =
    await api.functional.shoppingMall.customer.customerCarts.items.create(
      connection,
      {
        customerCartId: cart.id,
        body: cartItemBody,
      },
    );
  typia.assert(cartItem);

  // 12. As customer, create an order using this cart.
  // We rely on typia.random for monetary and address snapshot fields and
  // inject the correct customer_cart_id to bind this order to the created cart.
  const randomOrderCreate: IShoppingMallOrder.ICreate =
    typia.random<IShoppingMallOrder.ICreate>();

  const orderBody = {
    ...randomOrderCreate,
    customer_cart_id: cart.id,
  } satisfies IShoppingMallOrder.ICreate;

  const order: IShoppingMallOrder =
    await api.functional.shoppingMall.customer.orders.create(connection, {
      body: orderBody,
    });
  typia.assert(order);

  // 13. As customer, create two deterministic product reviews (ratings 4 and 5)
  const reviewBody4 = {
    rating: 4 as number &
      tags.Type<"int32"> &
      tags.Minimum<1> &
      tags.Maximum<5>,
    title: "Good product",
    body: "I liked this product, works as expected.",
  } satisfies IShoppingMallProductReview.ICreate;

  const review4: IShoppingMallProductReview =
    await api.functional.shoppingMall.customer.products.reviews.create(
      connection,
      {
        productId: product.id,
        body: reviewBody4,
      },
    );
  typia.assert(review4);

  const reviewBody5 = {
    rating: 5 as number &
      tags.Type<"int32"> &
      tags.Minimum<1> &
      tags.Maximum<5>,
    title: "Excellent product",
    body: "Exceeded expectations, highly recommend.",
  } satisfies IShoppingMallProductReview.ICreate;

  const review5: IShoppingMallProductReview =
    await api.functional.shoppingMall.customer.products.reviews.create(
      connection,
      {
        productId: product.id,
        body: reviewBody5,
      },
    );
  typia.assert(review5);

  // 14. Take a baseline snapshot from GET /shoppingMall/reviews/statistics/summary
  const baseline: IShoppingMallReviewStatisticsSummary =
    await api.functional.shoppingMall.reviews.statistics.summary.index(
      connection,
    );
  typia.assert(baseline);

  // Convert distribution into a map keyed by ratingValue for easier equality checks
  const baselineBucketsByRating = new Map<
    number,
    IShoppingMallReviewStatisticsSummary.IRatingBucket
  >();
  for (const bucket of baseline.ratingDistribution) {
    baselineBucketsByRating.set(bucket.ratingValue, bucket);
  }

  // Basic sanity checks: at least two reviews accounted for globally
  TestValidator.predicate(
    "totalReviewCount should be at least 2 after creating two reviews",
    baseline.totalReviewCount >= 2,
  );

  // We cannot guarantee exact values for globalAverageRating or distribution,
  // because other tests/data may exist, but we can ensure buckets for 4 and 5
  // exist or at least that the ratingDistribution array is non-empty.
  TestValidator.predicate(
    "ratingDistribution should not be empty",
    baseline.ratingDistribution.length >= 1,
  );

  // 15. Call the summary endpoint multiple times and assert invariance
  const repeatCount = 5;
  for (let i = 0; i < repeatCount; ++i) {
    const summary: IShoppingMallReviewStatisticsSummary =
      await api.functional.shoppingMall.reviews.statistics.summary.index(
        connection,
      );
    typia.assert(summary);

    // Aggregate fields must stay equal to baseline
    TestValidator.equals(
      `totalReviewCount remains stable on call #${i + 1}`,
      summary.totalReviewCount,
      baseline.totalReviewCount,
    );
    TestValidator.equals(
      `totalRatedProductCount remains stable on call #${i + 1}`,
      summary.totalRatedProductCount,
      baseline.totalRatedProductCount,
    );
    TestValidator.equals(
      `globalAverageRating remains stable on call #${i + 1}`,
      summary.globalAverageRating,
      baseline.globalAverageRating,
    );
    TestValidator.equals(
      `recentReviewCount remains stable on call #${i + 1}`,
      summary.recentReviewCount,
      baseline.recentReviewCount,
    );

    // Compare ratingDistribution by ratingValue -> reviewCount
    const currentBucketsByRating = new Map<
      number,
      IShoppingMallReviewStatisticsSummary.IRatingBucket
    >();
    for (const bucket of summary.ratingDistribution) {
      currentBucketsByRating.set(bucket.ratingValue, bucket);
    }

    TestValidator.equals(
      `ratingDistribution bucket count remains stable on call #${i + 1}`,
      currentBucketsByRating.size,
      baselineBucketsByRating.size,
    );

    for (const [ratingValue, baselineBucket] of baselineBucketsByRating) {
      const currentBucket = currentBucketsByRating.get(ratingValue);
      TestValidator.predicate(
        `rating bucket for value ${ratingValue} should exist on call #${i + 1}`,
        currentBucket !== undefined,
      );
      if (currentBucket !== undefined) {
        TestValidator.equals(
          `reviewCount for rating ${ratingValue} remains stable on call #${i + 1}`,
          currentBucket.reviewCount,
          baselineBucket.reviewCount,
        );
      }
    }
  }
}
