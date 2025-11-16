import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIShoppingMallProductReviewStatisticsBySeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallProductReviewStatisticsBySeller";
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
import type { IShoppingMallProductReviewStatisticsBySeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductReviewStatisticsBySeller";
import type { IShoppingMallProductSku } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductSku";
import type { IShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSeller";
import type { IShoppingMallSellerJoin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSellerJoin";
import type { IShoppingMallSellerLogin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSellerLogin";

export async function test_api_platform_admin_review_statistics_by_seller_multi_seller_comparison(
  connection: api.IConnection,
) {
  // 1. Register Seller A
  const sellerAEmail: string = typia.random<string & tags.Format<"email">>();
  const sellerAJoinBody = {
    email: sellerAEmail,
    password: "password-1234",
    storeName: RandomGenerator.name(2),
    contactPhone: RandomGenerator.mobile(),
  } satisfies IShoppingMallSellerJoin.IRequest;

  const sellerA: IShoppingMallSeller.IAuthorized =
    await api.functional.auth.seller.join(connection, {
      body: sellerAJoinBody,
    });
  typia.assert(sellerA);

  const sellerAId = sellerA.id;

  // 2. Register Seller B
  const sellerBEmail: string = typia.random<string & tags.Format<"email">>();
  const sellerBJoinBody = {
    email: sellerBEmail,
    password: "password-1234",
    storeName: RandomGenerator.name(2),
    contactPhone: RandomGenerator.mobile(),
  } satisfies IShoppingMallSellerJoin.IRequest;

  const sellerB: IShoppingMallSeller.IAuthorized =
    await api.functional.auth.seller.join(connection, {
      body: sellerBJoinBody,
    });
  typia.assert(sellerB);

  const sellerBId = sellerB.id;

  // 3. Seller A creates a product
  const productACode = RandomGenerator.alphaNumeric(12);
  const productACreateBody = {
    shopping_mall_seller_id: sellerAId,
    shopping_mall_brand_id: null,
    code: productACode as string & tags.MinLength<1>,
    name: RandomGenerator.name(3) as string & tags.MinLength<1>,
    short_description: RandomGenerator.paragraph({ sentences: 3 }),
    description: RandomGenerator.content({ paragraphs: 1 }),
    status: "active" as string & tags.MinLength<1>,
    is_multi_sku: true,
    primary_image_uri: "https://example.com/product-a.jpg" as string &
      tags.Format<"uri">,
    additional_data: null,
  } satisfies IShoppingMallProduct.ICreate;

  const productA: IShoppingMallProduct =
    await api.functional.shoppingMall.seller.products.create(connection, {
      body: productACreateBody,
    });
  typia.assert(productA);

  // 4. Seller A creates a SKU for product A
  const skuACreateBody = {
    code: RandomGenerator.alphaNumeric(10),
    name: RandomGenerator.name(2),
    listPrice: 10000,
    salePrice: 10000,
    currency: "KRW",
    isActive: true,
    isPurchasable: true,
  } satisfies IShoppingMallProductSku.ICreate;

  const skuA: IShoppingMallProductSku =
    await api.functional.shoppingMall.seller.products.skus.create(connection, {
      productCode: productA.code,
      body: skuACreateBody,
    });
  typia.assert(skuA);

  // 5. Seller B creates a product
  const productBCode = RandomGenerator.alphaNumeric(12);
  const productBCreateBody = {
    shopping_mall_seller_id: sellerBId,
    shopping_mall_brand_id: null,
    code: productBCode as string & tags.MinLength<1>,
    name: RandomGenerator.name(3) as string & tags.MinLength<1>,
    short_description: RandomGenerator.paragraph({ sentences: 3 }),
    description: RandomGenerator.content({ paragraphs: 1 }),
    status: "active" as string & tags.MinLength<1>,
    is_multi_sku: true,
    primary_image_uri: "https://example.com/product-b.jpg" as string &
      tags.Format<"uri">,
    additional_data: null,
  } satisfies IShoppingMallProduct.ICreate;

  const productB: IShoppingMallProduct =
    await api.functional.shoppingMall.seller.products.create(connection, {
      body: productBCreateBody,
    });
  typia.assert(productB);

  // 6. Seller B creates a SKU for product B
  const skuBCreateBody = {
    code: RandomGenerator.alphaNumeric(10),
    name: RandomGenerator.name(2),
    listPrice: 20000,
    salePrice: 20000,
    currency: "KRW",
    isActive: true,
    isPurchasable: true,
  } satisfies IShoppingMallProductSku.ICreate;

  const skuB: IShoppingMallProductSku =
    await api.functional.shoppingMall.seller.products.skus.create(connection, {
      productCode: productB.code,
      body: skuBCreateBody,
    });
  typia.assert(skuB);

  // 7. Register a customer
  const customerEmail: string = typia.random<string & tags.Format<"email">>();
  const customerJoinBody = {
    email: customerEmail,
    password: "password-1234",
    name: RandomGenerator.name(2),
    ip: null,
    href: "https://customer.example.com/join" as string & tags.Format<"uri">,
    referrer: "https://customer.example.com/landing" as string &
      tags.Format<"uri">,
  } satisfies IShoppingMallCustomerAuth.IJoin;

  const customerAuthorized: IShoppingMallCustomer.IAuthorized =
    await api.functional.auth.customer.join(connection, {
      body: customerJoinBody,
    });
  typia.assert(customerAuthorized);

  const customer = customerAuthorized.customer;
  typia.assert(customer);

  // 8. Create a customer cart
  const cartCreateBody = {
    currency_code: "KRW",
    region_code: "KR-Seoul",
    channel: "web",
    metadata: undefined,
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

  // 9. Add items for both SKUs into the cart
  const cartItemACreateBody = {
    skuId: skuA.id,
    quantity: 1 as number & tags.Type<"int32"> & tags.Minimum<1>,
    note: "Item A",
  } satisfies IShoppingMallCustomerCartItem.ICreate;

  const cartItemA: IShoppingMallCustomerCartItem =
    await api.functional.shoppingMall.customer.customerCarts.items.create(
      connection,
      {
        customerCartId: cart.id,
        body: cartItemACreateBody,
      },
    );
  typia.assert(cartItemA);

  const cartItemBCreateBody = {
    skuId: skuB.id,
    quantity: 1 as number & tags.Type<"int32"> & tags.Minimum<1>,
    note: "Item B",
  } satisfies IShoppingMallCustomerCartItem.ICreate;

  const cartItemB: IShoppingMallCustomerCartItem =
    await api.functional.shoppingMall.customer.customerCarts.items.create(
      connection,
      {
        customerCartId: cart.id,
        body: cartItemBCreateBody,
      },
    );
  typia.assert(cartItemB);

  // 10. Create an order based on the cart
  const itemsSubtotal = cart.subtotal_amount;
  const discountTotal = cart.discount_amount;
  const shippingTotal = cart.shipping_amount;
  const taxTotal = cart.tax_amount;
  const grandTotal = cart.total_amount;

  const shippingAddressId: string & tags.Format<"uuid"> = typia.random<
    string & tags.Format<"uuid">
  >();
  const billingAddressId: string & tags.Format<"uuid"> = typia.random<
    string & tags.Format<"uuid">
  >();

  const orderCreateBody = {
    customer_cart_id: cart.id,
    currency_code: cart.currency_code,
    items_subtotal_amount: itemsSubtotal,
    discount_total_amount: discountTotal,
    shipping_total_amount: shippingTotal,
    tax_total_amount: taxTotal,
    grand_total_amount: grandTotal,
    shipping_address_id: shippingAddressId,
    billing_address_id: billingAddressId,
    customer_note: "Test combined order for two sellers",
  } satisfies IShoppingMallOrder.ICreate;

  const order: IShoppingMallOrder =
    await api.functional.shoppingMall.customer.orders.create(connection, {
      body: orderCreateBody,
    });
  typia.assert(order);

  // 11. Create reviews as the same authenticated customer
  const reviewABody = {
    rating: 5 as number &
      tags.Type<"int32"> &
      tags.Minimum<1> &
      tags.Maximum<5>,
    title: "Great product from seller A" as string &
      tags.MinLength<1> &
      tags.MaxLength<255>,
    body: "Excellent quality and fast shipping" as string & tags.MinLength<1>,
  } satisfies IShoppingMallProductReview.ICreate;

  const reviewA: IShoppingMallProductReview =
    await api.functional.shoppingMall.customer.products.reviews.create(
      connection,
      {
        productId: productA.id,
        body: reviewABody,
      },
    );
  typia.assert(reviewA);

  const reviewBBody = {
    rating: 3 as number &
      tags.Type<"int32"> &
      tags.Minimum<1> &
      tags.Maximum<5>,
    title: "Average product from seller B" as string &
      tags.MinLength<1> &
      tags.MaxLength<255>,
    body: "Product is okay but not outstanding" as string & tags.MinLength<1>,
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

  // 12. Register a platform admin (auto-authenticated)
  const platformAdminEmail: string = typia.random<
    string & tags.Format<"email">
  >();
  const platformAdminJoinBody = {
    email: platformAdminEmail,
    name: RandomGenerator.name(2),
    password: "password-1234",
    ip: null,
    href: "https://admin.example.com/join" as string & tags.Format<"uri">,
    referrer: "https://admin.example.com/landing" as string &
      tags.Format<"uri">,
  } satisfies IShoppingMallPlatformAdminJoin.IRequest;

  const platformAdmin: IShoppingMallPlatformAdmin.IAuthorized =
    await api.functional.auth.platformAdmin.join(connection, {
      body: platformAdminJoinBody,
    });
  typia.assert(platformAdmin);

  // 13. Call review statistics by seller as platform admin
  // Define date range around now that covers the created reviews
  const now = new Date();
  const fromDate = new Date(now.getTime() - 1000 * 60 * 60).toISOString();
  const toDate = new Date(now.getTime() + 1000 * 60 * 60).toISOString();

  const statsRequestBody = {
    sellerIds: undefined,
    productIds: undefined,
    categoryIds: undefined,
    minRating: undefined,
    maxRating: undefined,
    fromCreatedAt: fromDate,
    toCreatedAt: toDate,
    includePending: false,
    includeRejected: false,
    regionCodes: undefined,
    limit: 10,
    offset: 0,
    orderBy: "sellerId",
    orderDirection: "asc",
  } satisfies IShoppingMallProductReviewStatisticsBySeller.IRequest;

  const statsPage: IPageIShoppingMallProductReviewStatisticsBySeller =
    await api.functional.shoppingMall.platformAdmin.reviews.statistics.bySeller.index(
      connection,
      {
        body: statsRequestBody,
      },
    );
  typia.assert(statsPage);

  const pagination: IPage.IPagination = statsPage.pagination;
  typia.assert(pagination);

  const statsList: IShoppingMallProductReviewStatisticsBySeller[] =
    statsPage.data;

  // Basic sanity checks on pagination
  TestValidator.predicate(
    "pagination records is at least 2",
    pagination.records >= 2,
  );

  TestValidator.predicate(
    "statistics list has at least 2 entries",
    statsList.length >= 2,
  );

  // Find stats entries for each seller
  const sellerAStats = statsList.find((s) => s.sellerId === sellerAId);
  const sellerBStats = statsList.find((s) => s.sellerId === sellerBId);

  TestValidator.predicate(
    "statistics includes seller A",
    sellerAStats !== undefined,
  );
  TestValidator.predicate(
    "statistics includes seller B",
    sellerBStats !== undefined,
  );

  if (!sellerAStats || !sellerBStats) return;

  // Validate Seller A statistics
  TestValidator.equals(
    "seller A total review count is 1",
    sellerAStats.totalReviewCount,
    1,
  );
  TestValidator.equals(
    "seller A average rating is 5",
    sellerAStats.averageRating,
    5,
  );
  TestValidator.equals(
    "seller A ratingCount5 is 1",
    sellerAStats.ratingCount5,
    1,
  );
  TestValidator.equals(
    "seller A ratingCount3 is 0",
    sellerAStats.ratingCount3,
    0,
  );

  // Validate Seller B statistics
  TestValidator.equals(
    "seller B total review count is 1",
    sellerBStats.totalReviewCount,
    1,
  );
  TestValidator.equals(
    "seller B average rating is 3",
    sellerBStats.averageRating,
    3,
  );
  TestValidator.equals(
    "seller B ratingCount3 is 1",
    sellerBStats.ratingCount3,
    1,
  );
  TestValidator.equals(
    "seller B ratingCount5 is 0",
    sellerBStats.ratingCount5,
    0,
  );

  // Ensure there is no other seller with non-zero reviews beyond A and B
  const otherSellersWithReviews = statsList.filter(
    (s) =>
      s.sellerId !== sellerAId &&
      s.sellerId !== sellerBId &&
      s.totalReviewCount > 0,
  );

  TestValidator.equals(
    "no additional sellers with non-zero reviews",
    otherSellersWithReviews.length,
    0,
  );
}
