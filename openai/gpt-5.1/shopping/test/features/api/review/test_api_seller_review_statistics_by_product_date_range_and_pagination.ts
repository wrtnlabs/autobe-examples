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

export async function test_api_seller_review_statistics_by_product_date_range_and_pagination(
  connection: api.IConnection,
) {
  // 1. Register seller
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

  const sellerId = sellerAuthorized.id;

  // 2. Create two products X and Y for the seller
  const productCodeX = `PROD-X-${RandomGenerator.alphaNumeric(8)}`;
  const productCodeY = `PROD-Y-${RandomGenerator.alphaNumeric(8)}`;

  const productXBody = {
    shopping_mall_seller_id: sellerId,
    shopping_mall_brand_id: undefined,
    code: productCodeX,
    name: "Product X",
    short_description: "Short desc X",
    description: "Long description for product X",
    status: "active",
    is_multi_sku: true,
    primary_image_uri: undefined,
    additional_data: undefined,
  } satisfies IShoppingMallProduct.ICreate;

  const productYBody = {
    shopping_mall_seller_id: sellerId,
    shopping_mall_brand_id: undefined,
    code: productCodeY,
    name: "Product Y",
    short_description: "Short desc Y",
    description: "Long description for product Y",
    status: "active",
    is_multi_sku: true,
    primary_image_uri: undefined,
    additional_data: undefined,
  } satisfies IShoppingMallProduct.ICreate;

  const productX: IShoppingMallProduct =
    await api.functional.shoppingMall.seller.products.create(connection, {
      body: productXBody,
    });
  typia.assert(productX);

  const productY: IShoppingMallProduct =
    await api.functional.shoppingMall.seller.products.create(connection, {
      body: productYBody,
    });
  typia.assert(productY);

  // 3. Create SKUs for each product
  const skuXBody = {
    code: `SKUX-${RandomGenerator.alphaNumeric(6)}`,
    name: "SKU X Variant",
    listPrice: 10000,
    salePrice: 9000,
    currency: "KRW",
    isActive: true,
    isPurchasable: true,
  } satisfies IShoppingMallProductSku.ICreate;

  const skuYBody = {
    code: `SKUY-${RandomGenerator.alphaNumeric(6)}`,
    name: "SKU Y Variant",
    listPrice: 20000,
    salePrice: 18000,
    currency: "KRW",
    isActive: true,
    isPurchasable: true,
  } satisfies IShoppingMallProductSku.ICreate;

  const skuX: IShoppingMallProductSku =
    await api.functional.shoppingMall.seller.products.skus.create(connection, {
      productCode: productCodeX,
      body: skuXBody,
    });
  typia.assert(skuX);

  const skuY: IShoppingMallProductSku =
    await api.functional.shoppingMall.seller.products.skus.create(connection, {
      productCode: productCodeY,
      body: skuYBody,
    });
  typia.assert(skuY);

  // 4. Register and login customer
  const customerEmail: string & tags.Format<"email"> = typia.random<
    string & tags.Format<"email">
  >();

  const customerJoinBody = {
    email: customerEmail,
    password: RandomGenerator.alphaNumeric(12),
    name: RandomGenerator.name(2),
    ip: null,
    href: "https://shoppingmall.example.com/join",
    referrer: "https://shoppingmall.example.com/landing",
  } satisfies IShoppingMallCustomerAuth.IJoin;

  const customerAuthorized: IShoppingMallCustomer.IAuthorized =
    await api.functional.auth.customer.join(connection, {
      body: customerJoinBody,
    });
  typia.assert(customerAuthorized);

  // explicit login step (though join already authorized) to simulate real flow
  const customerLoginBody = {
    email: customerEmail,
    password: customerJoinBody.password,
    ip: null,
    href: "https://shoppingmall.example.com/login",
    referrer: "https://shoppingmall.example.com/landing",
    userAgent: "E2E-Tester",
  } satisfies IShoppingMallCustomerAuth.ILogin;

  const customerAuthorizedAfterLogin: IShoppingMallCustomer.IAuthorized =
    await api.functional.auth.customer.login(connection, {
      body: customerLoginBody,
    });
  typia.assert(customerAuthorizedAfterLogin);

  // 5. Create customer cart and add items for both SKUs
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

  const cartItemXBody = {
    skuId: skuX.id,
    quantity: 1,
    note: "Item for Product X",
  } satisfies IShoppingMallCustomerCartItem.ICreate;

  const cartItemYBody = {
    skuId: skuY.id,
    quantity: 1,
    note: "Item for Product Y",
  } satisfies IShoppingMallCustomerCartItem.ICreate;

  const cartItemX: IShoppingMallCustomerCartItem =
    await api.functional.shoppingMall.customer.customerCarts.items.create(
      connection,
      {
        customerCartId: cart.id,
        body: cartItemXBody,
      },
    );
  typia.assert(cartItemX);

  const cartItemY: IShoppingMallCustomerCartItem =
    await api.functional.shoppingMall.customer.customerCarts.items.create(
      connection,
      {
        customerCartId: cart.id,
        body: cartItemYBody,
      },
    );
  typia.assert(cartItemY);

  // 6. Create an order from the cart
  // We'll create simple coherent monetary snapshot using cart totals
  const orderCreateBody = {
    customer_cart_id: cart.id,
    currency_code: cart.currency_code,
    items_subtotal_amount: cart.subtotal_amount,
    discount_total_amount: cart.discount_amount,
    shipping_total_amount: cart.shipping_amount,
    tax_total_amount: cart.tax_amount,
    grand_total_amount: cart.total_amount,
    shipping_address_id: typia.random<string & tags.Format<"uuid">>(),
    billing_address_id: typia.random<string & tags.Format<"uuid">>(),
    customer_note: "E2E test order",
  } satisfies IShoppingMallOrder.ICreate;

  const order: IShoppingMallOrder =
    await api.functional.shoppingMall.customer.orders.create(connection, {
      body: orderCreateBody,
    });
  typia.assert(order);

  // 7. Create two reviews as the customer: first for product X (T1), then Y (T2)
  const reviewXBody = {
    rating: 4,
    title: "Review for Product X",
    body: "Pretty good product X",
  } satisfies IShoppingMallProductReview.ICreate;

  const reviewX: IShoppingMallProductReview =
    await api.functional.shoppingMall.customer.products.reviews.create(
      connection,
      {
        productId: productX.id,
        body: reviewXBody,
      },
    );
  typia.assert(reviewX);

  const T1 = reviewX.createdAt;

  const reviewYBody = {
    rating: 5,
    title: "Review for Product Y",
    body: "Excellent product Y",
  } satisfies IShoppingMallProductReview.ICreate;

  const reviewY: IShoppingMallProductReview =
    await api.functional.shoppingMall.customer.products.reviews.create(
      connection,
      {
        productId: productY.id,
        body: reviewYBody,
      },
    );
  typia.assert(reviewY);

  const T2 = reviewY.createdAt;

  // Ensure ordering assumption T1 <= T2
  TestValidator.predicate(
    "reviewY should not be created before reviewX",
    new Date(T1).getTime() <= new Date(T2).getTime(),
  );

  // 8. Switch back to seller account
  const sellerLoginBody = {
    email: sellerJoinBody.email,
    password: sellerJoinBody.password,
    ip: null,
    href: "https://shoppingmall.example.com/seller/login",
    referrer: "https://shoppingmall.example.com/seller/landing",
  } satisfies IShoppingMallSellerLogin.IRequest;

  const sellerAuthorizedAfterLogin: IShoppingMallSeller.IAuthorized =
    await api.functional.auth.seller.login(connection, {
      body: sellerLoginBody,
    });
  typia.assert(sellerAuthorizedAfterLogin);

  // 9. Query statistics with fromCreatedAt between T1 and T2 (exclusive of T1, inclusive T2)
  const fromBetween = new Date(new Date(T1).getTime() + 1).toISOString();
  const toBetween = T2;

  const statsBetween: IPageIShoppingMallProductReviewStatisticsByProduct =
    await api.functional.shoppingMall.seller.reviews.statistics.byProduct.index(
      connection,
      {
        body: {
          productIds: [productX.id, productY.id],
          sellerIds: [sellerId],
          skuIds: undefined,
          categoryIds: undefined,
          minRating: undefined,
          maxRating: undefined,
          fromCreatedAt: fromBetween,
          toCreatedAt: toBetween,
          includePending: false,
          includeRejected: false,
          regionCodes: undefined,
          limit: 10,
          offset: 0,
          orderBy: "productId",
          orderDirection: "asc",
        } satisfies IShoppingMallProductReviewStatisticsByProduct.IRequest,
      },
    );
  typia.assert(statsBetween);

  TestValidator.predicate(
    "statistics between range should have exactly one entry",
    statsBetween.data.length === 1,
  );

  const statsY = statsBetween.data[0];

  TestValidator.equals(
    "product in between-range stats should be Product Y",
    statsY.product.id,
    productY.id,
  );

  if (statsY.lastReviewAt !== null && statsY.lastReviewAt !== undefined) {
    const lastReviewTime = new Date(statsY.lastReviewAt).getTime();
    TestValidator.predicate(
      "lastReviewAt should be >= fromBetween",
      lastReviewTime >= new Date(fromBetween).getTime(),
    );
    TestValidator.predicate(
      "lastReviewAt should be <= toBetween",
      lastReviewTime <= new Date(toBetween).getTime(),
    );
  }

  // 10. Query statistics covering both T1 and T2 with pagination limit=1, offset=0, order by latestReviewCreatedAt desc
  const fullFrom = T1;
  const fullTo = T2;

  const statsPage1: IPageIShoppingMallProductReviewStatisticsByProduct =
    await api.functional.shoppingMall.seller.reviews.statistics.byProduct.index(
      connection,
      {
        body: {
          productIds: [productX.id, productY.id],
          sellerIds: [sellerId],
          skuIds: undefined,
          categoryIds: undefined,
          minRating: undefined,
          maxRating: undefined,
          fromCreatedAt: fullFrom,
          toCreatedAt: fullTo,
          includePending: false,
          includeRejected: false,
          regionCodes: undefined,
          limit: 1,
          offset: 0,
          orderBy: "latestReviewCreatedAt",
          orderDirection: "desc",
        } satisfies IShoppingMallProductReviewStatisticsByProduct.IRequest,
      },
    );
  typia.assert(statsPage1);

  TestValidator.predicate(
    "first page should have exactly one row",
    statsPage1.data.length === 1,
  );

  const firstRow = statsPage1.data[0];

  TestValidator.equals(
    "first page product should be Product Y (latest review)",
    firstRow.product.id,
    productY.id,
  );

  TestValidator.equals(
    "pagination.limit on first page should be 1",
    statsPage1.pagination.limit,
    1,
  );

  // 11. Second page with offset=1 should return Product X
  const statsPage2: IPageIShoppingMallProductReviewStatisticsByProduct =
    await api.functional.shoppingMall.seller.reviews.statistics.byProduct.index(
      connection,
      {
        body: {
          productIds: [productX.id, productY.id],
          sellerIds: [sellerId],
          skuIds: undefined,
          categoryIds: undefined,
          minRating: undefined,
          maxRating: undefined,
          fromCreatedAt: fullFrom,
          toCreatedAt: fullTo,
          includePending: false,
          includeRejected: false,
          regionCodes: undefined,
          limit: 1,
          offset: 1,
          orderBy: "latestReviewCreatedAt",
          orderDirection: "desc",
        } satisfies IShoppingMallProductReviewStatisticsByProduct.IRequest,
      },
    );
  typia.assert(statsPage2);

  TestValidator.predicate(
    "second page should have at least one row",
    statsPage2.data.length >= 1,
  );

  const secondRow = statsPage2.data[0];

  TestValidator.equals(
    "second page product should be Product X (older review)",
    secondRow.product.id,
    productX.id,
  );

  TestValidator.equals(
    "pagination.limit on second page should be 1",
    statsPage2.pagination.limit,
    1,
  );

  TestValidator.predicate(
    "pagination.records should be at least 2",
    statsPage2.pagination.records >= 2,
  );

  TestValidator.equals(
    "pagination.current for second page should be 1",
    statsPage2.pagination.current,
    1,
  );

  TestValidator.predicate(
    "pagination.pages should be consistent with records and limit",
    statsPage2.pagination.pages ===
      (statsPage2.pagination.records === 0
        ? 0
        : Math.ceil(
            statsPage2.pagination.records / statsPage2.pagination.limit,
          )),
  );
}
