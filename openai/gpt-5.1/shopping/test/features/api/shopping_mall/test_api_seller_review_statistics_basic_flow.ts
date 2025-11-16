import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIShoppingMallProductReviewStatisticsBySeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallProductReviewStatisticsBySeller";
import type { IShoppingMallBrand } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallBrand";
import type { IShoppingMallCategoryTree } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCategoryTree";
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

export async function test_api_seller_review_statistics_basic_flow(
  connection: api.IConnection,
) {
  // 1. Create actors: platform admin, seller, customer
  const adminJoinBody = {
    email: typia.random<string & tags.Format<"email">>(),
    name: RandomGenerator.name(),
    password: RandomGenerator.alphaNumeric(12),
    ip: null,
    href: "https://admin.example.com/join",
    referrer: "https://admin.example.com/",
  } satisfies IShoppingMallPlatformAdminJoin.IRequest;
  const admin: IShoppingMallPlatformAdmin.IAuthorized =
    await api.functional.auth.platformAdmin.join(connection, {
      body: adminJoinBody,
    });
  typia.assert(admin);

  const sellerEmail: string & tags.Format<"email"> = typia.random<
    string & tags.Format<"email">
  >();
  const sellerPassword: string = RandomGenerator.alphaNumeric(12);
  const sellerJoinBody = {
    email: sellerEmail,
    password: sellerPassword,
    storeName: RandomGenerator.name(2),
    contactPhone: RandomGenerator.mobile(),
  } satisfies IShoppingMallSellerJoin.IRequest;
  const sellerAuthorized: IShoppingMallSeller.IAuthorized =
    await api.functional.auth.seller.join(connection, {
      body: sellerJoinBody,
    });
  typia.assert(sellerAuthorized);

  const customerJoinBody = {
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(12),
    name: RandomGenerator.name(2),
    ip: null,
    href: "https://shop.example.com/join",
    referrer: "https://shop.example.com/landing",
  } satisfies IShoppingMallCustomerAuth.IJoin;
  const customerAuthorized: IShoppingMallCustomer.IAuthorized =
    await api.functional.auth.customer.join(connection, {
      body: customerJoinBody,
    });
  typia.assert(customerAuthorized);

  // 2. As platform admin: category tree and brand
  const categoryTreeBody = {
    code: RandomGenerator.alphaNumeric(8),
    name: RandomGenerator.paragraph({ sentences: 2 }),
    description: undefined,
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
    name: RandomGenerator.paragraph({ sentences: 2 }),
    slug: RandomGenerator.alphaNumeric(12),
    description: undefined,
    logo_uri: undefined,
  } satisfies IShoppingMallBrand.ICreate;
  const brand: IShoppingMallBrand =
    await api.functional.shoppingMall.platformAdmin.brands.create(connection, {
      body: brandBody,
    });
  typia.assert(brand);

  // 3. As seller: create product
  const sellerLoginBody = {
    email: sellerEmail,
    password: sellerPassword,
    ip: null,
    href: "https://seller.example.com/login",
    referrer: "https://seller.example.com/",
  } satisfies IShoppingMallSellerLogin.IRequest;
  const sellerLogin: IShoppingMallSeller.IAuthorized =
    await api.functional.auth.seller.login(connection, {
      body: sellerLoginBody,
    });
  typia.assert(sellerLogin);

  const productCode: string & tags.MinLength<1> = RandomGenerator.alphaNumeric(
    10,
  ) as string & tags.MinLength<1>;
  const productCreateBody = {
    shopping_mall_seller_id: sellerLogin.id,
    shopping_mall_brand_id: brand.id,
    code: productCode,
    name: RandomGenerator.paragraph({ sentences: 2 }),
    short_description: null,
    description: RandomGenerator.content({ paragraphs: 2 }),
    status: "active",
    is_multi_sku: true,
    primary_image_uri: null,
    additional_data: null,
  } satisfies IShoppingMallProduct.ICreate;
  const product: IShoppingMallProduct =
    await api.functional.shoppingMall.seller.products.create(connection, {
      body: productCreateBody,
    });
  typia.assert(product);

  // 4. As platform admin: create SKU under product
  const skuBody = {
    code: RandomGenerator.alphaNumeric(8),
    name: RandomGenerator.paragraph({ sentences: 2 }),
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
        productCode: product.code,
        body: skuBody,
      },
    );
  typia.assert(sku);

  // 5. As customer: create cart and add item
  const customerLoginBody = {
    email: customerJoinBody.email,
    password: customerJoinBody.password,
    ip: null,
    href: "https://shop.example.com/login",
    referrer: "https://shop.example.com/",
    userAgent: "Mozilla/5.0",
  } satisfies IShoppingMallCustomerAuth.ILogin;
  const customerLogin: IShoppingMallCustomer.IAuthorized =
    await api.functional.auth.customer.login(connection, {
      body: customerLoginBody,
    });
  typia.assert(customerLogin);

  const cartBody = {
    currency_code: sku.currency,
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
        body: cartBody,
      },
    );
  typia.assert(cart);

  const quantity: number & tags.Type<"int32"> & tags.Minimum<1> = 1 as number &
    tags.Type<"int32"> &
    tags.Minimum<1>;
  const cartItemBody = {
    skuId: sku.id,
    quantity,
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
  typia.assert(cartItem);

  // 6. As customer: create order from cart
  const itemsSubtotal = sku.salePrice * cartItem.quantity;
  const discountTotal = 0;
  const shippingTotal = 0;
  const taxTotal = 0;
  const grandTotal = itemsSubtotal - discountTotal + shippingTotal + taxTotal;

  const shippingAddressId: string & tags.Format<"uuid"> = typia.random<
    string & tags.Format<"uuid">
  >();
  const billingAddressId: string & tags.Format<"uuid"> = typia.random<
    string & tags.Format<"uuid">
  >();

  const orderBody = {
    customer_cart_id: cart.id,
    currency_code: cart.currency_code,
    items_subtotal_amount: itemsSubtotal,
    discount_total_amount: discountTotal,
    shipping_total_amount: shippingTotal,
    tax_total_amount: taxTotal,
    grand_total_amount: grandTotal,
    shipping_address_id: shippingAddressId,
    billing_address_id: billingAddressId,
    customer_note: undefined,
  } satisfies IShoppingMallOrder.ICreate;
  const order: IShoppingMallOrder =
    await api.functional.shoppingMall.customer.orders.create(connection, {
      body: orderBody,
    });
  typia.assert(order);

  // 7. As customer: create product and SKU reviews (ratings 4 and 5)
  const productReviewBody = {
    rating: 4 as number &
      tags.Type<"int32"> &
      tags.Minimum<1> &
      tags.Maximum<5>,
    title: RandomGenerator.paragraph({ sentences: 1 }),
    body: RandomGenerator.content({ paragraphs: 1 }),
  } satisfies IShoppingMallProductReview.ICreate;
  const productReview: IShoppingMallProductReview =
    await api.functional.shoppingMall.customer.products.reviews.create(
      connection,
      {
        productId: product.id,
        body: productReviewBody,
      },
    );
  typia.assert(productReview);

  const skuReviewBody = {
    rating: 5 as number &
      tags.Type<"int32"> &
      tags.Minimum<1> &
      tags.Maximum<5>,
    title: RandomGenerator.paragraph({ sentences: 1 }),
    body: RandomGenerator.content({ paragraphs: 1 }),
  } satisfies IShoppingMallProductReview.ICreate;
  const skuReview: IShoppingMallProductReview =
    await api.functional.shoppingMall.customer.products.skus.reviews.create(
      connection,
      {
        productId: product.id,
        skuId: sku.id,
        body: skuReviewBody,
      },
    );
  typia.assert(skuReview);

  // 8. As seller: query statistics by seller
  const sellerLoginAgain: IShoppingMallSeller.IAuthorized =
    await api.functional.auth.seller.login(connection, {
      body: sellerLoginBody,
    });
  typia.assert(sellerLoginAgain);

  const now = new Date();
  const from = new Date(now.getTime() - 24 * 60 * 60 * 1000).toISOString();
  const to = new Date(now.getTime() + 24 * 60 * 60 * 1000).toISOString();

  const statsRequestBody = {
    sellerIds: [sellerAuthorized.id],
    productIds: undefined,
    categoryIds: undefined,
    minRating: undefined,
    maxRating: undefined,
    fromCreatedAt: from,
    toCreatedAt: to,
    includePending: undefined,
    includeRejected: undefined,
    regionCodes: undefined,
    limit: 10,
    offset: 0,
    orderBy: "averageRating",
    orderDirection: "desc",
  } satisfies IShoppingMallProductReviewStatisticsBySeller.IRequest;

  const page: IPageIShoppingMallProductReviewStatisticsBySeller =
    await api.functional.shoppingMall.seller.reviews.statistics.bySeller.index(
      connection,
      {
        body: statsRequestBody,
      },
    );
  typia.assert(page);

  const typedPage = page;

  // 9. Assertions on pagination and data presence
  TestValidator.predicate(
    "statistics page should have non-negative record count",
    typedPage.pagination.records >= 0,
  );
  TestValidator.predicate(
    "statistics page should have at least one data entry",
    typedPage.data.length >= 1,
  );

  const sellerStats = typedPage.data.find(
    (entry) => entry.sellerId === sellerAuthorized.id,
  );
  TestValidator.predicate(
    "statistics should contain entry for our seller",
    sellerStats !== undefined,
  );
  if (!sellerStats) return;

  const s = sellerStats;
  const bucketSum =
    s.ratingCount1 +
    s.ratingCount2 +
    s.ratingCount3 +
    s.ratingCount4 +
    s.ratingCount5;

  TestValidator.predicate(
    "totalReviewCount should be at least number of created reviews",
    s.totalReviewCount >= 2,
  );
  TestValidator.predicate(
    "totalReviewCount should be >= sum of rating buckets",
    s.totalReviewCount >= bucketSum,
  );

  TestValidator.predicate(
    "ratingCount4 should be at least 1",
    s.ratingCount4 >= 1,
  );
  TestValidator.predicate(
    "ratingCount5 should be at least 1",
    s.ratingCount5 >= 1,
  );

  TestValidator.predicate(
    "averageRating should be between 0 and 5",
    s.averageRating >= 0 && s.averageRating <= 5,
  );

  const expectedMean = (4 + 5) / 2;
  const diff = Math.abs(s.averageRating - expectedMean);
  TestValidator.predicate(
    "averageRating should be reasonably close to mean of created ratings",
    diff <= 0.5,
  );

  TestValidator.predicate(
    "lastReviewAt should be defined",
    s.lastReviewAt !== null && s.lastReviewAt !== undefined,
  );
  if (s.lastReviewAt !== null && s.lastReviewAt !== undefined) {
    const lastDate = new Date(s.lastReviewAt);
    TestValidator.predicate(
      "lastReviewAt should be parsable date",
      !Number.isNaN(lastDate.getTime()),
    );
  }

  // Ensure no other seller ids present when filtering by sellerIds
  const hasOtherSeller = typedPage.data.some(
    (entry) => entry.sellerId !== sellerAuthorized.id,
  );
  TestValidator.predicate(
    "statistics should not contain other sellers when filtered by sellerIds",
    !hasOtherSeller,
  );
}
