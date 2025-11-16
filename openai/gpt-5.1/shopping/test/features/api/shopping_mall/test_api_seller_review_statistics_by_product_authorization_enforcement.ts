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

/**
 * Validate seller-scoped access control for product review statistics.
 *
 * This E2E test ensures that the seller-facing review statistics endpoint
 * `/shoppingMall/seller/reviews/statistics/byProduct` only exposes
 * product-level review statistics for products owned by the authenticated
 * seller.
 *
 * Business workflow:
 *
 * 1. Register Seller A and obtain an authenticated seller session.
 * 2. As Seller A, create Product A, then create a SKU for Product A.
 * 3. Register a Customer and obtain an authenticated customer session.
 * 4. As the Customer, create a cart, add Product A’s SKU as an item, and create an
 *    order from that cart so the customer is eligible to review.
 * 5. As the same Customer, create a review for Product A.
 * 6. Register Seller B, obtaining an authenticated seller session distinct from
 *    Seller A.
 * 7. As Seller B, call PATCH `/shoppingMall/seller/reviews/statistics/byProduct`
 *    with `productIds` containing Product A’s id and some basic pagination
 *    options. Assert that the result does not expose any statistics row for
 *    Product A (either zero records or no entry whose `product.id` equals
 *    Product A’s id).
 * 8. As Seller A, call the same endpoint with the same filter and assert that
 *    statistics for Product A are present (pagination.records >= 1 and at least
 *    one data entry whose `product.id` equals Product A.id).
 *
 * The test validates that:
 *
 * - Sellers cannot view review statistics for products they do not own.
 * - Owning sellers can retrieve their own product’s review statistics, once at
 *   least one review exists for the product.
 */
export async function test_api_seller_review_statistics_by_product_authorization_enforcement(
  connection: api.IConnection,
) {
  // 1. Register Seller A (join auto-authenticates and sets Authorization).
  const sellerAEmail = `${RandomGenerator.alphabets(8)}@example.com`;
  const sellerAJoinBody = {
    email: sellerAEmail,
    password: RandomGenerator.alphaNumeric(12),
    storeName: RandomGenerator.name(2),
    contactPhone: RandomGenerator.mobile(),
  } satisfies IShoppingMallSellerJoin.IRequest;

  const sellerAAuth: IShoppingMallSeller.IAuthorized =
    await api.functional.auth.seller.join(connection, {
      body: sellerAJoinBody,
    });
  typia.assert<IShoppingMallSeller.IAuthorized>(sellerAAuth);

  // 2. As Seller A, create Product A.
  const productCodeA = RandomGenerator.alphaNumeric(12);
  const productABody = {
    shopping_mall_seller_id: sellerAAuth.id,
    shopping_mall_brand_id: null,
    code: productCodeA as string & tags.MinLength<1>,
    name: RandomGenerator.name(3) as string & tags.MinLength<1>,
    short_description: RandomGenerator.paragraph({ sentences: 3 }),
    description: RandomGenerator.content({ paragraphs: 2 }),
    status: "active" as string & tags.MinLength<1>,
    is_multi_sku: true,
    primary_image_uri: undefined,
    additional_data: undefined,
  } satisfies IShoppingMallProduct.ICreate;

  const productA: IShoppingMallProduct =
    await api.functional.shoppingMall.seller.products.create(connection, {
      body: productABody,
    });
  typia.assert<IShoppingMallProduct>(productA);

  // 2-1. As Seller A, create a SKU for Product A.
  const skuBody = {
    code: RandomGenerator.alphaNumeric(10),
    name: RandomGenerator.name(2),
    listPrice: 10000,
    salePrice: 9000,
    currency: "KRW",
    isActive: true,
    isPurchasable: true,
  } satisfies IShoppingMallProductSku.ICreate;

  const productASku: IShoppingMallProductSku =
    await api.functional.shoppingMall.seller.products.skus.create(connection, {
      productCode: productA.code,
      body: skuBody,
    });
  typia.assert<IShoppingMallProductSku>(productASku);

  // 3. Register a Customer and obtain authenticated customer session.
  const customerEmail = `${RandomGenerator.alphabets(8)}@customer.test`;
  const customerJoinBody = {
    email: customerEmail as string & tags.Format<"email">,
    password: RandomGenerator.alphaNumeric(12),
    name: RandomGenerator.name(2),
    ip: null,
    href: "https://frontend.example.com/signup" as string & tags.Format<"uri">,
    referrer: "https://frontend.example.com/landing" as string &
      tags.Format<"uri">,
  } satisfies IShoppingMallCustomerAuth.IJoin;

  const customerAuth: IShoppingMallCustomer.IAuthorized =
    await api.functional.auth.customer.join(connection, {
      body: customerJoinBody,
    });
  typia.assert<IShoppingMallCustomer.IAuthorized>(customerAuth);

  // 4. As the Customer, create a cart.
  const cartBody = {
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
      { body: cartBody },
    );
  typia.assert<IShoppingMallCustomerCart>(cart);

  // 4-1. Add Product A’s SKU as a cart item.
  const cartItemBody = {
    skuId: productASku.id,
    quantity: 1 as number & tags.Type<"int32"> & tags.Minimum<1>,
    note: null,
  } satisfies IShoppingMallCustomerCartItem.ICreate;

  const cartItem: IShoppingMallCustomerCartItem =
    await api.functional.shoppingMall.customer.customerCarts.items.create(
      connection,
      {
        customerCartId: cart.id,
        body: cartItemBody,
      },
    );
  typia.assert<IShoppingMallCustomerCartItem>(cartItem);

  // 4-2. Create an order from the cart.
  const orderBody = {
    customer_cart_id: cart.id,
    currency_code: cart.currency_code,
    items_subtotal_amount: cart.subtotal_amount,
    discount_total_amount: cart.discount_amount,
    shipping_total_amount: cart.shipping_amount,
    tax_total_amount: cart.tax_amount,
    grand_total_amount: cart.total_amount,
    shipping_address_id: typia.random<string & tags.Format<"uuid">>(),
    billing_address_id: typia.random<string & tags.Format<"uuid">>(),
    customer_note: "Review statistics test order",
  } satisfies IShoppingMallOrder.ICreate;

  const order: IShoppingMallOrder =
    await api.functional.shoppingMall.customer.orders.create(connection, {
      body: orderBody,
    });
  typia.assert<IShoppingMallOrder>(order);

  // 5. As the same Customer, create a review for Product A.
  const reviewBody = {
    rating: 5 as number &
      tags.Type<"int32"> &
      tags.Minimum<1> &
      tags.Maximum<5>,
    title: RandomGenerator.paragraph({ sentences: 2 }),
    body: RandomGenerator.content({ paragraphs: 1 }),
  } satisfies IShoppingMallProductReview.ICreate;

  const review: IShoppingMallProductReview =
    await api.functional.shoppingMall.customer.products.reviews.create(
      connection,
      {
        productId: productA.id,
        body: reviewBody,
      },
    );
  typia.assert<IShoppingMallProductReview>(review);

  // 6. Register Seller B and obtain a separate seller session.
  const sellerBEmail = `${RandomGenerator.alphabets(8)}@example.com`;
  const sellerBJoinBody = {
    email: sellerBEmail,
    password: RandomGenerator.alphaNumeric(12),
    storeName: RandomGenerator.name(2),
    contactPhone: RandomGenerator.mobile(),
  } satisfies IShoppingMallSellerJoin.IRequest;

  const sellerBAuth: IShoppingMallSeller.IAuthorized =
    await api.functional.auth.seller.join(connection, {
      body: sellerBJoinBody,
    });
  typia.assert<IShoppingMallSeller.IAuthorized>(sellerBAuth);

  // At this point, connection is authenticated as Seller B.

  // 7. As Seller B, query statistics for Product A by productIds filter.
  const sellerBStatsRequest = {
    productIds: [productA.id],
    sellerIds: undefined,
    skuIds: undefined,
    categoryIds: undefined,
    minRating: undefined,
    maxRating: undefined,
    fromCreatedAt: undefined,
    toCreatedAt: undefined,
    includePending: undefined,
    includeRejected: undefined,
    regionCodes: undefined,
    limit: 10 as number & tags.Type<"int32"> & tags.Minimum<1>,
    offset: 0 as number & tags.Type<"int32"> & tags.Minimum<0>,
    orderBy: "productId" as const,
    orderDirection: "asc" as const,
  } satisfies IShoppingMallProductReviewStatisticsByProduct.IRequest;

  const sellerBStatsPage: IPageIShoppingMallProductReviewStatisticsByProduct =
    await api.functional.shoppingMall.seller.reviews.statistics.byProduct.index(
      connection,
      { body: sellerBStatsRequest },
    );
  typia.assert<IPageIShoppingMallProductReviewStatisticsByProduct>(
    sellerBStatsPage,
  );

  // Assert that Seller B cannot see statistics for Product A.
  const sellerBHasProductA = sellerBStatsPage.data.some(
    (row: IShoppingMallProductReviewStatisticsByProduct) =>
      row.product.id === productA.id,
  );
  TestValidator.predicate(
    "Seller B should not see statistics for Product A",
    sellerBHasProductA === false,
  );

  // 8. Switch back to Seller A by logging in.
  const sellerALoginBody = {
    email: sellerAEmail as string & tags.Format<"email">,
    password: sellerAJoinBody.password,
    ip: null,
    href: "https://frontend.example.com/seller/login" as string &
      tags.Format<"uri">,
    referrer: "https://frontend.example.com/seller" as string &
      tags.Format<"uri">,
  } satisfies IShoppingMallSellerLogin.IRequest;

  const sellerALoginAuth: IShoppingMallSeller.IAuthorized =
    await api.functional.auth.seller.login(connection, {
      body: sellerALoginBody,
    });
  typia.assert<IShoppingMallSeller.IAuthorized>(sellerALoginAuth);

  // 8-1. As Seller A, query statistics again for Product A.
  const sellerAStatsRequest = {
    productIds: [productA.id],
    sellerIds: undefined,
    skuIds: undefined,
    categoryIds: undefined,
    minRating: undefined,
    maxRating: undefined,
    fromCreatedAt: undefined,
    toCreatedAt: undefined,
    includePending: undefined,
    includeRejected: undefined,
    regionCodes: undefined,
    limit: 10 as number & tags.Type<"int32"> & tags.Minimum<1>,
    offset: 0 as number & tags.Type<"int32"> & tags.Minimum<0>,
    orderBy: "productId" as const,
    orderDirection: "asc" as const,
  } satisfies IShoppingMallProductReviewStatisticsByProduct.IRequest;

  const sellerAStatsPage: IPageIShoppingMallProductReviewStatisticsByProduct =
    await api.functional.shoppingMall.seller.reviews.statistics.byProduct.index(
      connection,
      { body: sellerAStatsRequest },
    );
  typia.assert<IPageIShoppingMallProductReviewStatisticsByProduct>(
    sellerAStatsPage,
  );

  const sellerAHasProductA = sellerAStatsPage.data.some(
    (row: IShoppingMallProductReviewStatisticsByProduct) =>
      row.product.id === productA.id,
  );

  TestValidator.predicate(
    "Seller A should see statistics for Product A",
    sellerAHasProductA === true,
  );

  // Additional sanity: when Seller A sees Product A stats, ensure pagination
  // is consistent with the presence of at least one row.
  if (sellerAHasProductA) {
    TestValidator.predicate(
      "Seller A statistics page should report at least one record",
      sellerAStatsPage.pagination.records >= 1,
    );
  }
}
