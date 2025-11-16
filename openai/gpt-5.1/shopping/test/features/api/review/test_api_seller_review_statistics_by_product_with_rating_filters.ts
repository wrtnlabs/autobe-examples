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
import type { IShoppingMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProduct";
import type { IShoppingMallProductReview } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductReview";
import type { IShoppingMallProductReviewStatisticsByProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductReviewStatisticsByProduct";
import type { IShoppingMallProductSku } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductSku";
import type { IShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSeller";
import type { IShoppingMallSellerJoin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSellerJoin";
import type { IShoppingMallSellerLogin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSellerLogin";

export async function test_api_seller_review_statistics_by_product_with_rating_filters(
  connection: api.IConnection,
) {
  // 1. Join seller and keep credentials for later login switching
  const sellerEmail = typia.random<string & tags.Format<"email">>();
  const sellerPassword = RandomGenerator.alphabets(12);
  const sellerJoinBody = {
    email: sellerEmail,
    password: sellerPassword,
    storeName: RandomGenerator.paragraph({ sentences: 2 }),
    contactPhone: RandomGenerator.mobile(),
  } satisfies IShoppingMallSellerJoin.IRequest;

  const sellerAuthorized: IShoppingMallSeller.IAuthorized =
    await api.functional.auth.seller.join(connection, {
      body: sellerJoinBody,
    });
  typia.assert<IShoppingMallSeller.IAuthorized>(sellerAuthorized);

  // 2. Create product as seller
  const productCode = `CODE-${RandomGenerator.alphaNumeric(8)}`;
  const productCreateBody = {
    shopping_mall_seller_id: sellerAuthorized.id,
    shopping_mall_brand_id: undefined,
    code: productCode,
    name: RandomGenerator.paragraph({ sentences: 2 }),
    short_description: RandomGenerator.paragraph({ sentences: 3 }),
    description: RandomGenerator.content({ paragraphs: 2 }),
    status: "active",
    is_multi_sku: true,
    primary_image_uri: undefined,
    additional_data: undefined,
  } satisfies IShoppingMallProduct.ICreate;

  const product: IShoppingMallProduct =
    await api.functional.shoppingMall.seller.products.create(connection, {
      body: productCreateBody,
    });
  typia.assert<IShoppingMallProduct>(product);

  // 3. Create SKU under that product
  const skuCreateBody = {
    code: `SKU-${RandomGenerator.alphaNumeric(6)}`,
    name: RandomGenerator.paragraph({ sentences: 2 }),
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
  typia.assert<IShoppingMallProductSku>(sku);

  // 4. Register customer and login
  const customerEmail = typia.random<string & tags.Format<"email">>();
  const customerPassword = RandomGenerator.alphabets(10);

  const customerJoinBody = {
    email: customerEmail,
    password: customerPassword,
    name: RandomGenerator.name(),
    ip: null,
    href: "https://customer.example.com/join",
    referrer: "https://customer.example.com/",
  } satisfies IShoppingMallCustomerAuth.IJoin;

  const customerAuthorizedJoin: IShoppingMallCustomer.IAuthorized =
    await api.functional.auth.customer.join(connection, {
      body: customerJoinBody,
    });
  typia.assert<IShoppingMallCustomer.IAuthorized>(customerAuthorizedJoin);

  // Explicit login as customer to simulate separate session
  const customerLoginBody = {
    email: customerEmail,
    password: customerPassword,
    ip: null,
    href: "https://customer.example.com/login",
    referrer: "https://customer.example.com/",
    userAgent: "E2E-TEST",
  } satisfies IShoppingMallCustomerAuth.ILogin;

  const customerAuthorizedLogin: IShoppingMallCustomer.IAuthorized =
    await api.functional.auth.customer.login(connection, {
      body: customerLoginBody,
    });
  typia.assert<IShoppingMallCustomer.IAuthorized>(customerAuthorizedLogin);

  // 5. Create customer cart
  const cartCreateBody = {
    currency_code: "USD",
    region_code: "US",
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
  typia.assert<IShoppingMallCustomerCart>(cart);

  // 6. Add cart item for the SKU
  const cartItemCreateBody = {
    skuId: sku.id,
    quantity: 1 as number & tags.Type<"int32"> & tags.Minimum<1>,
    note: "test item for rating stats",
  } satisfies IShoppingMallCustomerCartItem.ICreate;

  const cartItem: IShoppingMallCustomerCartItem =
    await api.functional.shoppingMall.customer.customerCarts.items.create(
      connection,
      {
        customerCartId: cart.id,
        body: cartItemCreateBody,
      },
    );
  typia.assert<IShoppingMallCustomerCartItem>(cartItem);

  // 7. Create order from the cart (use simple consistent amounts)
  const itemsSubtotal = 80;
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
    customer_note: "E2E test order for review stats",
  } satisfies IShoppingMallOrder.ICreate;

  const order: IShoppingMallOrder =
    await api.functional.shoppingMall.customer.orders.create(connection, {
      body: orderCreateBody,
    });
  typia.assert<IShoppingMallOrder>(order);

  // 8. Create two reviews: rating 5 and rating 2 for same product
  const highRatingReviewBody = {
    rating: 5 as number &
      tags.Type<"int32"> &
      tags.Minimum<1> &
      tags.Maximum<5>,
    title: "Awesome product",
    body: "Five star review for stats test",
  } satisfies IShoppingMallProductReview.ICreate;

  const highRatingReview: IShoppingMallProductReview =
    await api.functional.shoppingMall.customer.products.reviews.create(
      connection,
      {
        productId: product.id,
        body: highRatingReviewBody,
      },
    );
  typia.assert<IShoppingMallProductReview>(highRatingReview);

  const lowRatingReviewBody = {
    rating: 2 as number &
      tags.Type<"int32"> &
      tags.Minimum<1> &
      tags.Maximum<5>,
    title: "Not so good",
    body: "Two star review for stats test",
  } satisfies IShoppingMallProductReview.ICreate;

  const lowRatingReview: IShoppingMallProductReview =
    await api.functional.shoppingMall.customer.products.reviews.create(
      connection,
      {
        productId: product.id,
        body: lowRatingReviewBody,
      },
    );
  typia.assert<IShoppingMallProductReview>(lowRatingReview);

  // 9. Switch back to seller account using seller login
  const sellerLoginBody = {
    email: sellerEmail,
    password: sellerPassword,
    ip: null,
    href: "https://seller.example.com/login",
    referrer: "https://seller.example.com/",
  } satisfies IShoppingMallSellerLogin.IRequest;

  const sellerAuthorizedLogin: IShoppingMallSeller.IAuthorized =
    await api.functional.auth.seller.login(connection, {
      body: sellerLoginBody,
    });
  typia.assert<IShoppingMallSeller.IAuthorized>(sellerAuthorizedLogin);

  // Helper to find stats row for our product
  const findStatsForProduct = (
    page: IPageIShoppingMallProductReviewStatisticsByProduct,
  ): IShoppingMallProductReviewStatisticsByProduct | undefined => {
    return page.data.find((row) => row.product.id === product.id);
  };

  // 10. Call stats with minRating=4, maxRating=5
  const requestHigh: IShoppingMallProductReviewStatisticsByProduct.IRequest = {
    productIds: [product.id],
    sellerIds: undefined,
    skuIds: undefined,
    categoryIds: undefined,
    minRating: 4,
    maxRating: 5,
    fromCreatedAt: undefined,
    toCreatedAt: undefined,
    includePending: false,
    includeRejected: false,
    regionCodes: undefined,
    limit: 10,
    offset: 0,
    orderBy: "productId",
    orderDirection: "asc",
  };

  const pageHigh: IPageIShoppingMallProductReviewStatisticsByProduct =
    await api.functional.shoppingMall.seller.reviews.statistics.byProduct.index(
      connection,
      {
        body: requestHigh,
      },
    );
  typia.assert<IPageIShoppingMallProductReviewStatisticsByProduct>(pageHigh);

  TestValidator.predicate(
    "high rating stats has at least one record",
    pageHigh.pagination.records >= 1,
  );

  const statsHigh = findStatsForProduct(pageHigh);
  TestValidator.predicate(
    "high rating stats row for product exists",
    !!statsHigh,
  );

  if (!statsHigh) return;
  typia.assert<IShoppingMallProductReviewStatisticsByProduct>(statsHigh);

  TestValidator.equals(
    "high rating totalReviewCount is 1",
    statsHigh.totalReviewCount,
    1,
  );
  TestValidator.equals(
    "high rating ratingCount5 is 1",
    statsHigh.ratingCount5,
    1,
  );
  TestValidator.equals(
    "high rating ratingCount4 is 0",
    statsHigh.ratingCount4,
    0,
  );
  TestValidator.equals(
    "high rating ratingCount3 is 0",
    statsHigh.ratingCount3,
    0,
  );
  TestValidator.equals(
    "high rating ratingCount2 is 0",
    statsHigh.ratingCount2,
    0,
  );
  TestValidator.equals(
    "high rating ratingCount1 is 0",
    statsHigh.ratingCount1,
    0,
  );
  TestValidator.equals(
    "high rating averageRating is 5",
    statsHigh.averageRating,
    5,
  );

  // 11. Call stats with minRating=1, maxRating=3
  const requestLow: IShoppingMallProductReviewStatisticsByProduct.IRequest = {
    productIds: [product.id],
    sellerIds: undefined,
    skuIds: undefined,
    categoryIds: undefined,
    minRating: 1,
    maxRating: 3,
    fromCreatedAt: undefined,
    toCreatedAt: undefined,
    includePending: false,
    includeRejected: false,
    regionCodes: undefined,
    limit: 10,
    offset: 0,
    orderBy: "productId",
    orderDirection: "asc",
  };

  const pageLow: IPageIShoppingMallProductReviewStatisticsByProduct =
    await api.functional.shoppingMall.seller.reviews.statistics.byProduct.index(
      connection,
      {
        body: requestLow,
      },
    );
  typia.assert<IPageIShoppingMallProductReviewStatisticsByProduct>(pageLow);

  TestValidator.predicate(
    "low rating stats has at least one record",
    pageLow.pagination.records >= 1,
  );

  const statsLow = findStatsForProduct(pageLow);
  TestValidator.predicate(
    "low rating stats row for product exists",
    !!statsLow,
  );

  if (!statsLow) return;
  typia.assert<IShoppingMallProductReviewStatisticsByProduct>(statsLow);

  TestValidator.equals(
    "low rating totalReviewCount is 1",
    statsLow.totalReviewCount,
    1,
  );
  TestValidator.equals(
    "low rating ratingCount2 is 1",
    statsLow.ratingCount2,
    1,
  );
  TestValidator.equals(
    "low rating ratingCount5 is 0",
    statsLow.ratingCount5,
    0,
  );
  TestValidator.equals(
    "low rating ratingCount4 is 0",
    statsLow.ratingCount4,
    0,
  );
  TestValidator.equals(
    "low rating ratingCount3 is 0",
    statsLow.ratingCount3,
    0,
  );
  TestValidator.equals(
    "low rating ratingCount1 is 0",
    statsLow.ratingCount1,
    0,
  );
  TestValidator.equals(
    "low rating averageRating is 2",
    statsLow.averageRating,
    2,
  );
}
