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
 * Validate that review statistics summary is coherent and that
 * recentReviewCount is a non-negative, bounded subset of totalReviewCount after
 * creating fresh reviews.
 *
 * Business context:
 *
 * - Platform admin manages brands.
 * - Seller registers a product with option types/values, a SKU, and inventory.
 * - Customer orders the product, then writes two reviews.
 * - Global review statistics are then checked for consistency (counts, rating
 *   distribution, average rating, and recentReviewCount constraints) without
 *   manipulating review timestamps.
 *
 * Steps:
 *
 * 1. Join as platform admin and create a brand.
 * 2. Join as seller and create a product, option type, option value, SKU, and
 *    inventory.
 * 3. Join as customer, create a customer cart, add SKU to cart, and create an
 *    order.
 * 4. As the same customer, create two product reviews for that product.
 * 5. Call GET /shoppingMall/reviews/statistics/summary.
 * 6. Assert that:
 *
 *    - TotalReviewCount >= 2.
 *    - RecentReviewCount is between 0 and totalReviewCount.
 *    - RatingDistribution buckets have ratingValue in [1,5] and sum of reviewCount
 *         equals totalReviewCount.
 *    - GlobalAverageRating is between 0 and 5.
 */
export async function test_api_review_statistics_summary_respects_recent_window(
  connection: api.IConnection,
) {
  // 1. Platform admin join and brand creation
  const platformAdminJoinBody = {
    email: typia.random<string & tags.Format<"email">>(),
    name: RandomGenerator.name(2),
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

  const brandCreateBody = {
    name: RandomGenerator.name(2),
    slug: RandomGenerator.alphaNumeric(12),
    description: RandomGenerator.paragraph({ sentences: 5 }),
    logo_uri: undefined,
  } satisfies IShoppingMallBrand.ICreate;

  const brand: IShoppingMallBrand =
    await api.functional.shoppingMall.platformAdmin.brands.create(connection, {
      body: brandCreateBody,
    });
  typia.assert(brand);

  // 2. Seller join and product/SKU/inventory creation
  const sellerJoinBody = {
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(12),
    storeName: RandomGenerator.name(2),
    contactPhone: RandomGenerator.mobile(),
  } satisfies IShoppingMallSellerJoin.IRequest;

  const sellerAuthorized: IShoppingMallSeller.IAuthorized =
    await api.functional.auth.seller.join(connection, {
      body: sellerJoinBody,
    });
  typia.assert(sellerAuthorized);

  const productCode: string = RandomGenerator.alphaNumeric(16);

  const productCreateBody = {
    shopping_mall_seller_id: sellerAuthorized.id,
    shopping_mall_brand_id: brand.id,
    code: productCode as string & tags.MinLength<1>,
    name: RandomGenerator.name(3) as string & tags.MinLength<1>,
    short_description: RandomGenerator.paragraph({ sentences: 3 }),
    description: RandomGenerator.content({ paragraphs: 2 }),
    status: "active" as string & tags.MinLength<1>,
    is_multi_sku: true,
    primary_image_uri: undefined,
    additional_data: undefined,
  } satisfies IShoppingMallProduct.ICreate;

  const product: IShoppingMallProduct =
    await api.functional.shoppingMall.seller.products.create(connection, {
      body: productCreateBody,
    });
  typia.assert(product);

  const optionTypeCreateBody = {
    name: "Color",
    display_name: "Color",
    display_order: 0 as number & tags.Type<"int32"> & tags.Minimum<0>,
  } satisfies IShoppingMallProductOptionType.ICreate;

  const optionType: IShoppingMallProductOptionType =
    await api.functional.shoppingMall.seller.products.optionTypes.create(
      connection,
      {
        productCode,
        body: optionTypeCreateBody,
      },
    );
  typia.assert(optionType);

  const optionValueCreateBody = {
    value: "red",
    display_name: "Red",
    display_order: 0 as number & tags.Type<"int32">,
    is_active: true,
  } satisfies IShoppingMallProductOptionValue.ICreate;

  const optionValue: IShoppingMallProductOptionValue =
    await api.functional.shoppingMall.seller.products.optionTypes.values.create(
      connection,
      {
        productCode,
        productOptionTypeId: optionType.id,
        body: optionValueCreateBody,
      },
    );
  typia.assert(optionValue);

  const skuCode: string = `${productCode}-RED-001`;

  const skuCreateBody = {
    code: skuCode,
    name: `${product.name} - Red`,
    listPrice: 100,
    salePrice: 80,
    currency: "USD",
    isActive: true,
    isPurchasable: true,
  } satisfies IShoppingMallProductSku.ICreate;

  const sku: IShoppingMallProductSku =
    await api.functional.shoppingMall.seller.products.skus.create(connection, {
      productCode,
      body: skuCreateBody,
    });
  typia.assert(sku);

  const inventoryCreateBody = {
    product_sku_id: sku.id,
    on_hand_quantity: 10 as number & tags.Type<"int32"> & tags.Minimum<0>,
    low_stock_threshold: 1 as number & tags.Type<"int32"> & tags.Minimum<0>,
    backorder_enabled: false,
    preorder_enabled: false,
  } satisfies IShoppingMallInventoryItem.ICreate;

  const inventoryItem: IShoppingMallInventoryItem =
    await api.functional.shoppingMall.seller.inventoryItems.create(connection, {
      body: inventoryCreateBody,
    });
  typia.assert(inventoryItem);

  // 3. Customer join, cart, item, and order creation
  const customerJoinBody = {
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(12),
    name: RandomGenerator.name(2),
    ip: null,
    href: "https://shop.example.com/join",
    referrer: "https://shop.example.com/",
  } satisfies IShoppingMallCustomerAuth.IJoin;

  const customerAuthorized: IShoppingMallCustomer.IAuthorized =
    await api.functional.auth.customer.join(connection, {
      body: customerJoinBody,
    });
  typia.assert(customerAuthorized);

  const cartCreateBody = {
    currency_code: "USD",
    region_code: "US",
    channel: "web",
    metadata: undefined,
    is_active: true,
    source_guest_token: undefined,
  } satisfies IShoppingMallCustomerCart.ICreate;

  const customerCart: IShoppingMallCustomerCart =
    await api.functional.shoppingMall.customer.customerCarts.create(
      connection,
      {
        body: cartCreateBody,
      },
    );
  typia.assert(customerCart);

  const cartItemCreateBody = {
    skuId: sku.id,
    quantity: 1 as number & tags.Type<"int32"> & tags.Minimum<1>,
    note: "Test item",
  } satisfies IShoppingMallCustomerCartItem.ICreate;

  const cartItem: IShoppingMallCustomerCartItem =
    await api.functional.shoppingMall.customer.customerCarts.items.create(
      connection,
      {
        customerCartId: customerCart.id,
        body: cartItemCreateBody,
      },
    );
  typia.assert(cartItem);

  const itemsSubtotal =
    (cartItem.unitPrice ?? sku.salePrice) * cartItem.quantity;

  const shippingAddressId = typia.random<string & tags.Format<"uuid">>();
  const billingAddressId = typia.random<string & tags.Format<"uuid">>();

  const orderCreateBody = {
    customer_cart_id: customerCart.id,
    currency_code: customerCart.currency_code,
    items_subtotal_amount: itemsSubtotal,
    discount_total_amount: 0,
    shipping_total_amount: 0,
    tax_total_amount: 0,
    grand_total_amount: itemsSubtotal,
    shipping_address_id: shippingAddressId,
    billing_address_id: billingAddressId,
    customer_note: "Test order for review statistics",
  } satisfies IShoppingMallOrder.ICreate;

  const order: IShoppingMallOrder =
    await api.functional.shoppingMall.customer.orders.create(connection, {
      body: orderCreateBody,
    });
  typia.assert(order);

  // 4. Create two reviews for the product as the customer
  const reviewABody = {
    rating: 4 as number &
      tags.Type<"int32"> &
      tags.Minimum<1> &
      tags.Maximum<5>,
    title: "Solid product" as string & tags.MinLength<1> & tags.MaxLength<255>,
    body: RandomGenerator.paragraph({ sentences: 6 }) as string &
      tags.MinLength<1>,
  } satisfies IShoppingMallProductReview.ICreate;

  const reviewA: IShoppingMallProductReview =
    await api.functional.shoppingMall.customer.products.reviews.create(
      connection,
      {
        productId: product.id,
        body: reviewABody,
      },
    );
  typia.assert(reviewA);

  const reviewBBody = {
    rating: 2 as number &
      tags.Type<"int32"> &
      tags.Minimum<1> &
      tags.Maximum<5>,
    title: "Could be better" as string &
      tags.MinLength<1> &
      tags.MaxLength<255>,
    body: RandomGenerator.paragraph({ sentences: 4 }) as string &
      tags.MinLength<1>,
  } satisfies IShoppingMallProductReview.ICreate;

  const reviewB: IShoppingMallProductReview =
    await api.functional.shoppingMall.customer.products.reviews.create(
      connection,
      {
        productId: product.id,
        body: reviewBBody,
      },
    );
  typia.assert(reviewB);

  // 5. Call review statistics summary
  const summary: IShoppingMallReviewStatisticsSummary =
    await api.functional.shoppingMall.reviews.statistics.summary.index(
      connection,
    );
  typia.assert(summary);

  // 6. Consistency assertions
  TestValidator.predicate(
    "totalReviewCount should be non-negative",
    summary.totalReviewCount >= 0,
  );

  TestValidator.predicate(
    "totalReviewCount should be at least 2 after creating two reviews",
    summary.totalReviewCount >= 2,
  );

  TestValidator.predicate(
    "recentReviewCount should be non-negative",
    summary.recentReviewCount >= 0,
  );

  TestValidator.predicate(
    "recentReviewCount should not exceed totalReviewCount",
    summary.recentReviewCount <= summary.totalReviewCount,
  );

  const distributionSum = summary.ratingDistribution.reduce(
    (acc, bucket) => acc + bucket.reviewCount,
    0,
  );

  TestValidator.equals(
    "sum of ratingDistribution.reviewCount must equal totalReviewCount",
    distributionSum,
    summary.totalReviewCount,
  );

  for (const bucket of summary.ratingDistribution) {
    TestValidator.predicate(
      "ratingDistribution bucket ratingValue must be between 1 and 5",
      bucket.ratingValue >= 1 && bucket.ratingValue <= 5,
    );

    TestValidator.predicate(
      "ratingDistribution bucket reviewCount must be non-negative",
      bucket.reviewCount >= 0,
    );
  }

  TestValidator.predicate(
    "globalAverageRating must be between 0 and 5",
    summary.globalAverageRating >= 0 && summary.globalAverageRating <= 5,
  );
}
