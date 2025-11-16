import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIShoppingMallProductReviewStatisticsByProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallProductReviewStatisticsByProduct";
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
import type { IShoppingMallProductReviewStatisticsByProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductReviewStatisticsByProduct";
import type { IShoppingMallProductSku } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductSku";
import type { IShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSeller";
import type { IShoppingMallSellerJoin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSellerJoin";
import type { IShoppingMallSellerLogin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSellerLogin";

/**
 * Validate seller-side aggregated review statistics by product in a basic happy
 * path.
 *
 * Business flow:
 *
 * 1. Platform admin joins and logs in (platformAdmin actor) so that a brand can be
 *    created.
 * 2. Platform admin creates a brand used for the test product.
 * 3. Seller joins and logs in, representing the catalog owner.
 * 4. Seller creates a single product associated with the created brand, with
 *    is_multi_sku=true to allow SKU creation.
 * 5. Seller creates a single purchasable SKU under that product.
 * 6. Customer joins and logs in.
 * 7. Customer creates a persistent cart.
 * 8. Customer adds the created SKU to the cart with quantity 1.
 * 9. Customer creates an order from the cart (using self-consistent monetary
 *    snapshot values and dummy address ids).
 * 10. Customer creates a product review with a known rating for that product.
 * 11. Switch back to seller, and call PATCH
 *     /shoppingMall/seller/reviews/statistics/byProduct with:
 *
 *     - ProductIds = [created product id]
 *     - MinRating/maxRating covering the review rating
 *     - Limit/offset for pagination
 *     - OrderBy = "productId", orderDirection = "asc".
 * 12. Assert that:
 *
 *     - Exactly one statistics entry is returned
 *     - The statistics entry references the created product id
 *     - TotalReviewCount = 1
 *     - AverageRating equals the review rating
 *     - RatingCountX is 1 for that rating bucket and 0 for others
 *     - Seller summary in the statistics matches the seller who owns the product.
 */
export async function test_api_seller_review_statistics_by_product_basic_flow(
  connection: api.IConnection,
) {
  // 1. Platform admin joins
  const platformAdminJoinBody = {
    email: `admin+${RandomGenerator.alphaNumeric(8)}@example.com`,
    name: RandomGenerator.name(),
    password: "AdminPass123!",
    ip: null,
    href: "https://admin.example.com/join",
    referrer: "https://admin.example.com/",
  } satisfies IShoppingMallPlatformAdminJoin.IRequest;

  const platformAdminAuthorized: IShoppingMallPlatformAdmin.IAuthorized =
    await api.functional.auth.platformAdmin.join(connection, {
      body: platformAdminJoinBody,
    });
  typia.assert(platformAdminAuthorized);

  // 2. Create a brand as platform admin
  const brandCreateBody = {
    name: `Brand ${RandomGenerator.name(1)}`,
    slug: `brand-${RandomGenerator.alphaNumeric(8)}`,
    description: RandomGenerator.paragraph({ sentences: 5 }),
    logo_uri: "https://cdn.example.com/logo.png",
  } satisfies IShoppingMallBrand.ICreate;

  const brand: IShoppingMallBrand =
    await api.functional.shoppingMall.platformAdmin.brands.create(connection, {
      body: brandCreateBody,
    });
  typia.assert(brand);

  // 3. Seller joins and logs in
  const sellerJoinBody = {
    email: `seller+${RandomGenerator.alphaNumeric(8)}@example.com`,
    password: "SellerPass123!",
    storeName: `Store ${RandomGenerator.name(1)}`,
    contactPhone: RandomGenerator.mobile(),
  } satisfies IShoppingMallSellerJoin.IRequest;

  const sellerAuthorized: IShoppingMallSeller.IAuthorized =
    await api.functional.auth.seller.join(connection, {
      body: sellerJoinBody,
    });
  typia.assert(sellerAuthorized);

  const sellerLoginBody = {
    email: sellerJoinBody.email,
    password: sellerJoinBody.password,
    ip: null,
    href: "https://seller.example.com/login",
    referrer: "https://seller.example.com/",
  } satisfies IShoppingMallSellerLogin.IRequest;

  const sellerLoginAuthorized: IShoppingMallSeller.IAuthorized =
    await api.functional.auth.seller.login(connection, {
      body: sellerLoginBody,
    });
  typia.assert(sellerLoginAuthorized);

  // 4. Seller creates a product associated with the brand
  const productCode = `PRD-${RandomGenerator.alphaNumeric(8)}`;
  const productCreateBody = {
    shopping_mall_seller_id: sellerLoginAuthorized.id,
    shopping_mall_brand_id: brand.id,
    code: productCode,
    name: `Product ${RandomGenerator.name(1)}`,
    short_description: RandomGenerator.paragraph({ sentences: 3 }),
    description: RandomGenerator.content({ paragraphs: 2 }),
    status: "active",
    is_multi_sku: true,
    primary_image_uri: "https://cdn.example.com/product.png",
    additional_data: null,
  } satisfies IShoppingMallProduct.ICreate;

  const product: IShoppingMallProduct =
    await api.functional.shoppingMall.seller.products.create(connection, {
      body: productCreateBody,
    });
  typia.assert(product);

  // 5. Seller creates a purchasable SKU
  const skuCreateBody = {
    code: `SKU-${RandomGenerator.alphaNumeric(6)}`,
    name: `SKU ${RandomGenerator.name(1)}`,
    listPrice: 100,
    salePrice: 80,
    currency: "USD",
    isActive: true,
    isPurchasable: true,
  } satisfies IShoppingMallProductSku.ICreate;

  const sku: IShoppingMallProductSku =
    await api.functional.shoppingMall.seller.products.skus.create(connection, {
      productCode: product.code,
      body: skuCreateBody,
    });
  typia.assert(sku);

  // 6. Customer joins and logs in
  const customerJoinBody = {
    email: `customer+${RandomGenerator.alphaNumeric(8)}@example.com`,
    password: "CustomerPass123!",
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
    email: customerJoinBody.email,
    password: customerJoinBody.password,
    ip: null,
    href: "https://shop.example.com/login",
    referrer: "https://shop.example.com/",
  } satisfies IShoppingMallCustomerAuth.ILogin;

  const customerLoginAuthorized: IShoppingMallCustomer.IAuthorized =
    await api.functional.auth.customer.login(connection, {
      body: customerLoginBody,
    });
  typia.assert(customerLoginAuthorized);

  // 7. Customer creates a persistent cart
  const cartCreateBody = {
    currency_code: sku.currency,
    region_code: "US",
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
        body: cartCreateBody,
      },
    );
  typia.assert(cart);

  // 8. Customer adds the SKU to the cart
  const cartItemCreateBody = {
    skuId: sku.id,
    quantity: 1,
    note: "test line item",
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

  // 9. Customer creates an order based on the cart
  const shippingAddressId = typia.random<string & tags.Format<"uuid">>();
  const billingAddressId = typia.random<string & tags.Format<"uuid">>();

  const orderCreateBody = {
    customer_cart_id: cart.id,
    currency_code: cart.currency_code,
    items_subtotal_amount: cart.total_amount,
    discount_total_amount: cart.discount_amount,
    shipping_total_amount: cart.shipping_amount,
    tax_total_amount: cart.tax_amount,
    grand_total_amount: cart.total_amount,
    shipping_address_id: shippingAddressId,
    billing_address_id: billingAddressId,
    customer_note: "e2e test order",
  } satisfies IShoppingMallOrder.ICreate;

  const order: IShoppingMallOrder =
    await api.functional.shoppingMall.customer.orders.create(connection, {
      body: orderCreateBody,
    });
  typia.assert(order);

  // 10. Customer creates a product review with a known rating
  const reviewRating = 4;

  const reviewCreateBody = {
    rating: reviewRating,
    title: "Great product",
    body: "Satisfied with this basic flow test product.",
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

  // 11. Switch back to seller context
  const sellerReLoginAuthorized: IShoppingMallSeller.IAuthorized =
    await api.functional.auth.seller.login(connection, {
      body: sellerLoginBody,
    });
  typia.assert(sellerReLoginAuthorized);

  // 12. Seller requests statistics by product
  const statsRequestBody = {
    productIds: [product.id],
    sellerIds: [sellerAuthorized.id],
    skuIds: undefined,
    categoryIds: undefined,
    minRating: reviewRating,
    maxRating: reviewRating,
    fromCreatedAt: undefined,
    toCreatedAt: undefined,
    includePending: false,
    includeRejected: false,
    regionCodes: [cart.region_code],
    limit: 10,
    offset: 0,
    orderBy: "productId" as const,
    orderDirection: "asc" as const,
  } satisfies IShoppingMallProductReviewStatisticsByProduct.IRequest;

  const statsPage: IPageIShoppingMallProductReviewStatisticsByProduct =
    await api.functional.shoppingMall.seller.reviews.statistics.byProduct.index(
      connection,
      {
        body: statsRequestBody,
      },
    );
  typia.assert(statsPage);

  // 13. Basic pagination assertions using plain numbers
  const pageLimit: number = statsPage.pagination.limit;
  TestValidator.equals(
    "statistics page limit should be respected",
    pageLimit,
    statsRequestBody.limit ?? 0,
  );

  const totalRecords: number = statsPage.pagination.records;
  TestValidator.predicate(
    "statistics page records should be at least one",
    totalRecords >= 1,
  );

  TestValidator.predicate(
    "statistics data length should be exactly one entry for this filtered product",
    statsPage.data.length === 1,
  );

  const stat: IShoppingMallProductReviewStatisticsByProduct = statsPage.data[0];
  typia.assert(stat);

  // 14. Validate product and seller references
  TestValidator.equals(
    "statistics product id must match created product id",
    stat.product.id,
    product.id,
  );

  const statSellerId: string | undefined = stat.seller?.id;
  TestValidator.equals(
    "statistics seller id must match seller id",
    statSellerId ?? sellerAuthorized.id,
    sellerAuthorized.id,
  );

  // 15. Validate review counts and averages
  const totalReviewCount: number = stat.totalReviewCount;
  TestValidator.equals(
    "totalReviewCount should be 1 for single review",
    totalReviewCount,
    1,
  );

  const averageRating: number = stat.averageRating;
  TestValidator.equals(
    "averageRating should equal the created review rating",
    averageRating,
    reviewRating,
  );

  const ratingBuckets = [
    stat.ratingCount1,
    stat.ratingCount2,
    stat.ratingCount3,
    stat.ratingCount4,
    stat.ratingCount5,
  ];

  const sumRatings: number = ratingBuckets.reduce(
    (acc: number, value) => acc + value,
    0,
  );

  TestValidator.equals(
    "sum of rating buckets should equal totalReviewCount",
    sumRatings,
    totalReviewCount,
  );

  const expectedBucketIndex = reviewRating - 1;
  ratingBuckets.forEach((count, index) => {
    if (index === expectedBucketIndex) {
      TestValidator.equals(
        `rating bucket ${index + 1} should have count 1`,
        count,
        1,
      );
    } else {
      TestValidator.equals(
        `rating bucket ${index + 1} should have count 0`,
        count,
        0,
      );
    }
  });
}
