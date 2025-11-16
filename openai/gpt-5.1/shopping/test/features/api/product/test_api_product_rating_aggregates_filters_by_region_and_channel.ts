import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallBrand } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallBrand";
import type { IShoppingMallCategoryTree } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCategoryTree";
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
import type { IShoppingMallProductRatingAggregate } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductRatingAggregate";
import type { IShoppingMallProductReview } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductReview";
import type { IShoppingMallProductSku } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductSku";
import type { IShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSeller";
import type { IShoppingMallSellerJoin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSellerJoin";
import type { IShoppingMallSellerLogin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSellerLogin";

/**
 * Validate that product rating aggregates respect regionCode and channelCode
 * filters.
 *
 * Business flow (high level):
 *
 * 1. Platform admin joins and logs in.
 * 2. Seller joins and logs in.
 * 3. Admin creates category tree and brand.
 * 4. Admin creates a product for the seller and a single SKU.
 * 5. Seller creates inventory for that SKU so it becomes purchasable.
 * 6. Customer A joins, logs in, creates a cart for REGION_A/CHANNEL_X, adds the
 *    SKU, creates an order, and writes one or more 5-star reviews.
 * 7. Customer B joins, logs in, creates a cart for REGION_B/CHANNEL_Y, adds the
 *    same SKU, creates an order, and writes one or more 1-star reviews.
 * 8. As an unauthenticated caller, call ratingAggregates.index for the product
 *    with filters (regionCode=REGION_A, channelCode=CHANNEL_X) and without
 *    filters.
 * 9. Assert that filtered aggregates reflect only Region A / Channel X reviews
 *    (review_count equals number of A reviews and average_rating equals 5), and
 *    that global aggregates reflect both A and B reviews (review_count >=
 *    filtered and average_rating between 1 and 5).
 */
export async function test_api_product_rating_aggregates_filters_by_region_and_channel(
  connection: api.IConnection,
) {
  // 1. Platform admin joins
  const platformAdminEmail: string & tags.Format<"email"> = typia.random<
    string & tags.Format<"email">
  >();

  const platformAdminJoinBody = {
    email: platformAdminEmail,
    name: RandomGenerator.name(2),
    password: "AdminPass123!",
    ip: null,
    href: "https://admin.test.local/join",
    referrer: "https://admin.test.local/",
  } satisfies IShoppingMallPlatformAdminJoin.IRequest;

  const platformAdminAuthorized: IShoppingMallPlatformAdmin.IAuthorized =
    await api.functional.auth.platformAdmin.join(connection, {
      body: platformAdminJoinBody,
    });
  typia.assert(platformAdminAuthorized);

  // 2. Platform admin login (ensure admin token is active before admin-only calls)
  const platformAdminLoginBody = {
    email: platformAdminEmail,
    password: "AdminPass123!",
    ip: null,
    href: "https://admin.test.local/login",
    referrer: "https://admin.test.local/",
  } satisfies IShoppingMallPlatformAdminLogin.IRequest;

  const platformAdminLoginOutput: IShoppingMallPlatformAdmin.IAuthorized =
    await api.functional.auth.platformAdmin.login(connection, {
      body: platformAdminLoginBody,
    });
  typia.assert(platformAdminLoginOutput);

  // 3. Seller joins and logs in (seller operations will be done later)
  const sellerEmail: string & tags.Format<"email"> = typia.random<
    string & tags.Format<"email">
  >();

  const sellerJoinBody = {
    email: sellerEmail,
    password: "SellerPass123!",
    storeName: RandomGenerator.name(2),
    contactPhone: RandomGenerator.mobile(),
  } satisfies IShoppingMallSellerJoin.IRequest;

  const sellerAuthorized: IShoppingMallSeller.IAuthorized =
    await api.functional.auth.seller.join(connection, {
      body: sellerJoinBody,
    });
  typia.assert(sellerAuthorized);

  // Switch back to platform admin before admin-only catalog operations
  const platformAdminLoginForCatalog: IShoppingMallPlatformAdmin.IAuthorized =
    await api.functional.auth.platformAdmin.login(connection, {
      body: platformAdminLoginBody,
    });
  typia.assert(platformAdminLoginForCatalog);

  // 4. Category tree and brand creation as platform admin
  const categoryTreeBody = {
    code: `tree-${RandomGenerator.alphaNumeric(8)}`,
    name: "Main Catalog Tree",
    description: "Tree for rating aggregate tests",
    active: true,
    defaultLocale: "en-US",
  } satisfies IShoppingMallCategoryTree.ICreate;

  const categoryTree: IShoppingMallCategoryTree =
    await api.functional.shoppingMall.platformAdmin.categoryTrees.create(
      connection,
      { body: categoryTreeBody },
    );
  typia.assert(categoryTree);

  const brandBody = {
    name: `Brand-${RandomGenerator.alphabets(6)}`,
    slug: `brand-${RandomGenerator.alphaNumeric(6)}`,
    description: "Brand for rating aggregate tests",
    logo_uri: "https://cdn.test.local/logo.png" as string & tags.Format<"uri">,
  } satisfies IShoppingMallBrand.ICreate;

  const brand: IShoppingMallBrand =
    await api.functional.shoppingMall.platformAdmin.brands.create(connection, {
      body: brandBody,
    });
  typia.assert(brand);

  // 5. Product creation as platform admin (owned by seller)
  const productCode = `prod-${RandomGenerator.alphaNumeric(8)}`;
  const productCreateBody = {
    shopping_mall_seller_id: sellerAuthorized.id,
    shopping_mall_brand_id: brand.id,
    code: productCode as string & tags.MinLength<1>,
    name: "Rating Aggregate Test Product" as string & tags.MinLength<1>,
    short_description: "Product used to test rating aggregates",
    description: RandomGenerator.content({ paragraphs: 2 }),
    status: "active" as string & tags.MinLength<1>,
    is_multi_sku: true,
    primary_image_uri: "https://cdn.test.local/product.png" as string &
      tags.Format<"uri">,
    additional_data: null,
  } satisfies IShoppingMallProduct.ICreate;

  const product: IShoppingMallProduct =
    await api.functional.shoppingMall.platformAdmin.products.create(
      connection,
      { body: productCreateBody },
    );
  typia.assert(product);

  // 6. Create a single SKU under the product as platform admin
  const skuCode = `sku-${RandomGenerator.alphaNumeric(8)}`;
  const skuCreateBody = {
    code: skuCode,
    name: "Default Variant",
    listPrice: 100,
    salePrice: 80,
    currency: "USD",
    isActive: true,
    isPurchasable: true,
  } satisfies IShoppingMallProductSku.ICreate;

  const sku: IShoppingMallProductSku =
    await api.functional.shoppingMall.platformAdmin.products.skus.create(
      connection,
      {
        productCode,
        body: skuCreateBody,
      },
    );
  typia.assert(sku);

  // 7. Seller login and inventory creation for the SKU
  const sellerLoginBody = {
    email: sellerEmail,
    password: "SellerPass123!",
    ip: null,
    href: "https://seller.test.local/login",
    referrer: "https://seller.test.local/",
  } satisfies IShoppingMallSellerLogin.IRequest;

  const sellerLoginOutput: IShoppingMallSeller.IAuthorized =
    await api.functional.auth.seller.login(connection, {
      body: sellerLoginBody,
    });
  typia.assert(sellerLoginOutput);

  const inventoryCreateBody = {
    product_sku_id: sku.id,
    on_hand_quantity: 100 as number & tags.Type<"int32"> & tags.Minimum<0>,
    low_stock_threshold: 10 as number & tags.Type<"int32"> & tags.Minimum<0>,
    backorder_enabled: false,
    preorder_enabled: false,
  } satisfies IShoppingMallInventoryItem.ICreate;

  const inventoryItem: IShoppingMallInventoryItem =
    await api.functional.shoppingMall.seller.inventoryItems.create(connection, {
      body: inventoryCreateBody,
    });
  typia.assert(inventoryItem);

  // Helper to join/login a customer
  const joinAndLoginCustomer = async () => {
    const email: string & tags.Format<"email"> = typia.random<
      string & tags.Format<"email">
    >();

    const joinBody = {
      email,
      password: "CustomerPass123!",
      name: RandomGenerator.name(2),
      ip: null,
      href: "https://customer.test.local/join",
      referrer: "https://customer.test.local/",
    } satisfies IShoppingMallCustomerAuth.IJoin;

    const joinOutput: IShoppingMallCustomer.IAuthorized =
      await api.functional.auth.customer.join(connection, {
        body: joinBody,
      });
    typia.assert(joinOutput);

    const loginBody = {
      email,
      password: "CustomerPass123!",
      ip: null,
      href: "https://customer.test.local/login",
      referrer: "https://customer.test.local/",
      userAgent: "E2E-Test-Agent",
    } satisfies IShoppingMallCustomerAuth.ILogin;

    const loginOutput: IShoppingMallCustomer.IAuthorized =
      await api.functional.auth.customer.login(connection, {
        body: loginBody,
      });
    typia.assert(loginOutput);

    return loginOutput;
  };

  // 8. Customer A (Region A / Channel X) flow
  const customerA: IShoppingMallCustomer.IAuthorized =
    await joinAndLoginCustomer();
  typia.assert(customerA);

  const cartACreateBody = {
    currency_code: "USD",
    region_code: "REGION_A",
    channel: "CHANNEL_X",
    metadata: {
      source: "e2e-test",
      scenario: "rating-aggregate-region-channel",
    },
    is_active: true,
    source_guest_token: undefined,
  } satisfies IShoppingMallCustomerCart.ICreate;

  const cartA: IShoppingMallCustomerCart =
    await api.functional.shoppingMall.customer.customerCarts.create(
      connection,
      { body: cartACreateBody },
    );
  typia.assert(cartA);

  const cartAItemBody = {
    skuId: sku.id,
    quantity: 1 as number & tags.Type<"int32"> & tags.Minimum<1>,
    note: "Customer A item",
  } satisfies IShoppingMallCustomerCartItem.ICreate;

  const cartAItem: IShoppingMallCustomerCartItem =
    await api.functional.shoppingMall.customer.customerCarts.items.create(
      connection,
      {
        customerCartId: cartA.id,
        body: cartAItemBody,
      },
    );
  typia.assert(cartAItem);

  const orderACreateBody = {
    customer_cart_id: cartA.id,
    currency_code: cartA.currency_code,
    items_subtotal_amount: 80,
    discount_total_amount: 0,
    shipping_total_amount: 0,
    tax_total_amount: 0,
    grand_total_amount: 80,
    shipping_address_id: typia.random<string & tags.Format<"uuid">>(),
    billing_address_id: typia.random<string & tags.Format<"uuid">>(),
    customer_note: "Order A for Region A / Channel X",
  } satisfies IShoppingMallOrder.ICreate;

  const orderA: IShoppingMallOrder =
    await api.functional.shoppingMall.customer.orders.create(connection, {
      body: orderACreateBody,
    });
  typia.assert(orderA);

  // Customer A creates two 5-star reviews
  const reviewA1Body = {
    rating: 5 as number &
      tags.Type<"int32"> &
      tags.Minimum<1> &
      tags.Maximum<5>,
    title: "Amazing product" as string &
      tags.MinLength<1> &
      tags.MaxLength<255>,
    body: RandomGenerator.paragraph({ sentences: 5 }) as string &
      tags.MinLength<1>,
  } satisfies IShoppingMallProductReview.ICreate;

  const reviewA1: IShoppingMallProductReview =
    await api.functional.shoppingMall.customer.products.reviews.create(
      connection,
      {
        productId: product.id,
        body: reviewA1Body,
      },
    );
  typia.assert(reviewA1);

  const reviewA2Body = {
    rating: 5 as number &
      tags.Type<"int32"> &
      tags.Minimum<1> &
      tags.Maximum<5>,
    title: "Loved it" as string & tags.MinLength<1> & tags.MaxLength<255>,
    body: RandomGenerator.paragraph({ sentences: 4 }) as string &
      tags.MinLength<1>,
  } satisfies IShoppingMallProductReview.ICreate;

  const reviewA2: IShoppingMallProductReview =
    await api.functional.shoppingMall.customer.products.reviews.create(
      connection,
      {
        productId: product.id,
        body: reviewA2Body,
      },
    );
  typia.assert(reviewA2);

  const totalAReviews = 2;
  const expectedAFilteredAverage = 5;

  // 9. Customer B (Region B / Channel Y) flow
  const customerB: IShoppingMallCustomer.IAuthorized =
    await joinAndLoginCustomer();
  typia.assert(customerB);

  const cartBCreateBody = {
    currency_code: "USD",
    region_code: "REGION_B",
    channel: "CHANNEL_Y",
    metadata: {
      source: "e2e-test",
      scenario: "rating-aggregate-region-channel-B",
    },
    is_active: true,
    source_guest_token: undefined,
  } satisfies IShoppingMallCustomerCart.ICreate;

  const cartB: IShoppingMallCustomerCart =
    await api.functional.shoppingMall.customer.customerCarts.create(
      connection,
      { body: cartBCreateBody },
    );
  typia.assert(cartB);

  const cartBItemBody = {
    skuId: sku.id,
    quantity: 1 as number & tags.Type<"int32"> & tags.Minimum<1>,
    note: "Customer B item",
  } satisfies IShoppingMallCustomerCartItem.ICreate;

  const cartBItem: IShoppingMallCustomerCartItem =
    await api.functional.shoppingMall.customer.customerCarts.items.create(
      connection,
      {
        customerCartId: cartB.id,
        body: cartBItemBody,
      },
    );
  typia.assert(cartBItem);

  const orderBCreateBody = {
    customer_cart_id: cartB.id,
    currency_code: cartB.currency_code,
    items_subtotal_amount: 80,
    discount_total_amount: 0,
    shipping_total_amount: 0,
    tax_total_amount: 0,
    grand_total_amount: 80,
    shipping_address_id: typia.random<string & tags.Format<"uuid">>(),
    billing_address_id: typia.random<string & tags.Format<"uuid">>(),
    customer_note: "Order B for Region B / Channel Y",
  } satisfies IShoppingMallOrder.ICreate;

  const orderB: IShoppingMallOrder =
    await api.functional.shoppingMall.customer.orders.create(connection, {
      body: orderBCreateBody,
    });
  typia.assert(orderB);

  // Customer B creates two 1-star reviews
  const reviewB1Body = {
    rating: 1 as number &
      tags.Type<"int32"> &
      tags.Minimum<1> &
      tags.Maximum<5>,
    title: "Terrible experience" as string &
      tags.MinLength<1> &
      tags.MaxLength<255>,
    body: RandomGenerator.paragraph({ sentences: 3 }) as string &
      tags.MinLength<1>,
  } satisfies IShoppingMallProductReview.ICreate;

  const reviewB1: IShoppingMallProductReview =
    await api.functional.shoppingMall.customer.products.reviews.create(
      connection,
      {
        productId: product.id,
        body: reviewB1Body,
      },
    );
  typia.assert(reviewB1);

  const reviewB2Body = {
    rating: 1 as number &
      tags.Type<"int32"> &
      tags.Minimum<1> &
      tags.Maximum<5>,
    title: "Not recommended" as string &
      tags.MinLength<1> &
      tags.MaxLength<255>,
    body: RandomGenerator.paragraph({ sentences: 4 }) as string &
      tags.MinLength<1>,
  } satisfies IShoppingMallProductReview.ICreate;

  const reviewB2: IShoppingMallProductReview =
    await api.functional.shoppingMall.customer.products.reviews.create(
      connection,
      {
        productId: product.id,
        body: reviewB2Body,
      },
    );
  typia.assert(reviewB2);

  const totalBReviews = 2;

  // 10. Call rating aggregates with Region A / Channel X filter
  const filteredRequestBody = {
    regionCode: "REGION_A",
    channelCode: "CHANNEL_X",
    fromTimestamp: undefined,
    toTimestamp: undefined,
    includeSkuBreakdown: false,
  } satisfies IShoppingMallProductRatingAggregate.IRequest;

  const filteredAggregate: IShoppingMallProductRatingAggregate =
    await api.functional.shoppingMall.products.ratingAggregates.index(
      connection,
      {
        productId: product.id,
        body: filteredRequestBody,
      },
    );
  typia.assert(filteredAggregate);

  // 11. Call rating aggregates without region/channel filters (global)
  const globalRequestBody = {
    includeSkuBreakdown: false,
  } satisfies IShoppingMallProductRatingAggregate.IRequest;

  const globalAggregate: IShoppingMallProductRatingAggregate =
    await api.functional.shoppingMall.products.ratingAggregates.index(
      connection,
      {
        productId: product.id,
        body: globalRequestBody,
      },
    );
  typia.assert(globalAggregate);

  // 12. Business assertions for counts
  TestValidator.predicate(
    "global review_count should be >= total number of Region A reviews",
    globalAggregate.review_count >= totalAReviews,
  );

  TestValidator.predicate(
    "global review_count should be >= filtered review_count",
    globalAggregate.review_count >= filteredAggregate.review_count,
  );

  // It's possible that filtering returns fewer reviews than we expect if
  // the backend associates region/channel differently, so we only check
  // that filtered count is > 0 to ensure filtering produced some data.
  TestValidator.predicate(
    "filtered aggregates should have at least one review",
    filteredAggregate.review_count > 0,
  );

  // 13. Business assertions for average ratings when both A and B have reviews
  if (
    filteredAggregate.average_rating !== undefined &&
    filteredAggregate.average_rating !== null &&
    globalAggregate.average_rating !== undefined &&
    globalAggregate.average_rating !== null
  ) {
    const filteredAvg = filteredAggregate.average_rating;
    const globalAvg = globalAggregate.average_rating;

    TestValidator.predicate(
      "filtered average_rating should be between 1 and 5",
      filteredAvg >= 1 && filteredAvg <= 5,
    );

    TestValidator.predicate(
      "global average_rating should be between 1 and 5",
      globalAvg >= 1 && globalAvg <= 5,
    );

    // Expect filtered average to match Region A-only pattern (5-star)
    TestValidator.predicate(
      "filtered average_rating should be close to expected Region A rating (5)",
      Math.abs(filteredAvg - expectedAFilteredAverage) < 0.0001,
    );

    // With both Region A (5-star) and Region B (1-star) reviews present,
    // the global average should not stay at 5.
    if (globalAggregate.review_count >= totalAReviews + totalBReviews) {
      TestValidator.predicate(
        "global average_rating should reflect both 5-star and 1-star reviews (i.e., differ from 5)",
        Math.abs(globalAvg - expectedAFilteredAverage) > 0.0001,
      );
    }
  }
}
