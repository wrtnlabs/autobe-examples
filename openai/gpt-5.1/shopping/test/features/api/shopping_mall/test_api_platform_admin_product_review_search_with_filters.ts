import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIShoppingMallProductReview } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallProductReview";
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
import type { IShoppingMallProductReview } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductReview";
import type { IShoppingMallProductSku } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductSku";
import type { IShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSeller";
import type { IShoppingMallSellerJoin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSellerJoin";
import type { IShoppingMallSellerLogin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSellerLogin";
import type { IShoppingMallWishlist } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallWishlist";
import type { IShoppingMallWishlistItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallWishlistItem";

export async function test_api_platform_admin_product_review_search_with_filters(
  connection: api.IConnection,
) {
  // 1. Platform admin joins and logs in
  const platformAdminJoinBody = {
    email: typia.random<string & tags.Format<"email">>(),
    name: RandomGenerator.name(),
    password: RandomGenerator.alphaNumeric(12),
    ip: null,
    href: typia.random<string & tags.Format<"uri">>(),
    referrer: typia.random<string & tags.Format<"uri">>(),
  } satisfies IShoppingMallPlatformAdminJoin.IRequest;

  const platformAdmin: IShoppingMallPlatformAdmin.IAuthorized =
    await api.functional.auth.platformAdmin.join(connection, {
      body: platformAdminJoinBody,
    });
  typia.assert(platformAdmin);

  // ensure platform admin login also works and sets auth header explicitly
  const platformAdminLoginBody = {
    email: platformAdmin.email,
    password: platformAdminJoinBody.password,
    ip: null,
    href: platformAdminJoinBody.href,
    referrer: platformAdminJoinBody.referrer,
  } satisfies IShoppingMallPlatformAdminLogin.IRequest;

  const platformAdminLoggedIn: IShoppingMallPlatformAdmin.IAuthorized =
    await api.functional.auth.platformAdmin.login(connection, {
      body: platformAdminLoginBody,
    });
  typia.assert(platformAdminLoggedIn);

  // 2. Seller joins and logs in (for inventory realism)
  const sellerJoinBody = {
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(12),
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
    href: typia.random<string & tags.Format<"uri">>(),
    referrer: typia.random<string & tags.Format<"uri">>(),
  } satisfies IShoppingMallSellerLogin.IRequest;

  const sellerLoggedIn: IShoppingMallSeller.IAuthorized =
    await api.functional.auth.seller.login(connection, {
      body: sellerLoginBody,
    });
  typia.assert(sellerLoggedIn);

  // 3. Category tree, brand, and product creation as platform admin
  // switch back to platform admin
  const platformAdminRelogin: IShoppingMallPlatformAdmin.IAuthorized =
    await api.functional.auth.platformAdmin.login(connection, {
      body: platformAdminLoginBody,
    });
  typia.assert(platformAdminRelogin);

  const categoryTreeBody = {
    code: `tree-${RandomGenerator.alphaNumeric(8)}`,
    name: RandomGenerator.name(2),
    description: RandomGenerator.paragraph({ sentences: 5 }),
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
    name: `Brand ${RandomGenerator.name(1)}`,
    slug: `brand-${RandomGenerator.alphaNumeric(6)}`,
    description: RandomGenerator.paragraph({ sentences: 4 }),
    logo_uri: typia.random<string & tags.Format<"uri">>(),
  } satisfies IShoppingMallBrand.ICreate;

  const brand: IShoppingMallBrand =
    await api.functional.shoppingMall.platformAdmin.brands.create(connection, {
      body: brandBody,
    });
  typia.assert(brand);

  const productBody = {
    shopping_mall_seller_id: seller.id,
    shopping_mall_brand_id: brand.id,
    code: `prod-${RandomGenerator.alphaNumeric(8)}` as string &
      tags.MinLength<1>,
    name: `Product ${RandomGenerator.name(1)}` as string & tags.MinLength<1>,
    short_description: RandomGenerator.paragraph({ sentences: 3 }),
    description: RandomGenerator.content({ paragraphs: 2 }),
    status: "active" as string & tags.MinLength<1>,
    is_multi_sku: true,
    primary_image_uri: typia.random<string & tags.Format<"uri">>(),
    additional_data: null,
  } satisfies IShoppingMallProduct.ICreate;

  const product: IShoppingMallProduct =
    await api.functional.shoppingMall.platformAdmin.products.create(
      connection,
      {
        body: productBody,
      },
    );
  typia.assert(product);

  // 4. Create a SKU under this product
  const skuBody = {
    code: `sku-${RandomGenerator.alphaNumeric(6)}`,
    name: `SKU ${RandomGenerator.name(1)}`,
    listPrice: 10000,
    salePrice: 8000,
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

  // 5. Create inventory for SKU as seller (realism, though reviews do not depend on it directly)
  const sellerRelogin: IShoppingMallSeller.IAuthorized =
    await api.functional.auth.seller.login(connection, {
      body: sellerLoginBody,
    });
  typia.assert(sellerRelogin);

  const inventoryBody = {
    product_sku_id: sku.id,
    on_hand_quantity: 100,
    low_stock_threshold: 10,
    backorder_enabled: false,
    preorder_enabled: false,
  } satisfies IShoppingMallInventoryItem.ICreate;

  const inventoryItem: IShoppingMallInventoryItem =
    await api.functional.shoppingMall.seller.inventoryItems.create(connection, {
      body: inventoryBody,
    });
  typia.assert(inventoryItem);

  // 6. Customer joins and logs in
  const customerJoinBody = {
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(12),
    name: RandomGenerator.name(),
    ip: null,
    href: typia.random<string & tags.Format<"uri">>(),
    referrer: typia.random<string & tags.Format<"uri">>(),
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
    href: customerJoinBody.href,
    referrer: customerJoinBody.referrer,
    userAgent: "e2e-test-agent",
  } satisfies IShoppingMallCustomerAuth.ILogin;

  const customerLoggedIn: IShoppingMallCustomer.IAuthorized =
    await api.functional.auth.customer.login(connection, {
      body: customerLoginBody,
    });
  typia.assert(customerLoggedIn);

  // 7. (Optional realism) Customer creates a cart and adds SKU as a cart item
  const cartBody = {
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
        body: cartBody,
      },
    );
  typia.assert(cart);

  const cartItemBody = {
    skuId: sku.id,
    quantity: 1,
    note: "test item",
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

  // 8. Customer creates multiple reviews with varying ratings
  const ratings = [1, 3, 5, 4, 2];
  type CreatedReviewInfo = {
    id: string & tags.Format<"uuid">;
    rating: number;
    createdAt: string & tags.Format<"date-time">;
  };
  const createdReviews: CreatedReviewInfo[] = [];

  for (const rating of ratings) {
    const reviewBody = {
      rating: rating as 1 | 2 | 3 | 4 | 5,
      title: RandomGenerator.paragraph({ sentences: 3 }),
      body: RandomGenerator.content({ paragraphs: 1 }),
    } satisfies IShoppingMallProductReview.ICreate;

    const review: IShoppingMallProductReview =
      await api.functional.shoppingMall.customer.products.reviews.create(
        connection,
        {
          productId: product.id,
          body: reviewBody,
        },
      );
    typia.assert(review);

    createdReviews.push({
      id: review.id,
      rating,
      createdAt: review.createdAt,
    });
  }

  // Derive rating range and date window for reviews with rating >= 4
  const highRatedReviews = createdReviews.filter((r) => r.rating >= 4);
  const hasHighRated = highRatedReviews.length > 0;

  let minCreatedAt: string & tags.Format<"date-time"> =
    createdReviews[0].createdAt;
  let maxCreatedAt: string & tags.Format<"date-time"> =
    createdReviews[0].createdAt;

  for (const info of highRatedReviews.length > 0
    ? highRatedReviews
    : createdReviews) {
    if (info.createdAt < minCreatedAt) minCreatedAt = info.createdAt;
    if (info.createdAt > maxCreatedAt) maxCreatedAt = info.createdAt;
  }

  // 9. Re-login as platform admin for review search
  const platformAdminForSearch: IShoppingMallPlatformAdmin.IAuthorized =
    await api.functional.auth.platformAdmin.login(connection, {
      body: platformAdminLoginBody,
    });
  typia.assert(platformAdminForSearch);

  // 10. Primary filtered search: rating range + date window + status
  const requestBody = {
    page: 1,
    limit: 10,
    orderBy: "createdAt" as const,
    orderDirection: "desc" as const,
    minRating: hasHighRated ? 4 : 1,
    maxRating: 5,
    fromCreatedAt: minCreatedAt,
    toCreatedAt: maxCreatedAt,
    hasMedia: undefined,
    verifiedPurchaseOnly: undefined,
    status: "published" as const,
  } satisfies IShoppingMallProductReview.IRequest;

  const pageResult: IPageIShoppingMallProductReview.ISummary =
    await api.functional.shoppingMall.platformAdmin.products.reviews.index(
      connection,
      {
        productId: product.id,
        body: requestBody,
      },
    );
  typia.assert(pageResult);

  const pagination: IPage.IPagination = pageResult.pagination;
  const rows = pageResult.data;

  // Pagination basic invariants
  TestValidator.predicate(
    "pagination.limit is non-negative",
    pagination.limit >= 0,
  );
  TestValidator.predicate(
    "pagination.current is non-negative",
    pagination.current >= 0,
  );
  TestValidator.predicate(
    "pagination.records >= data.length",
    pagination.records >= rows.length,
  );

  if (pagination.records === 0) {
    TestValidator.equals("no records implies pages is 0", pagination.pages, 0);
  } else {
    TestValidator.predicate(
      "records > 0 implies pages >= 1",
      pagination.pages >= 1,
    );
  }

  // Validate each returned row against filters
  for (const summary of rows) {
    // rating filter
    TestValidator.predicate(
      "rating within requested range",
      summary.rating_value >= (requestBody.minRating ?? 1) &&
        summary.rating_value <= (requestBody.maxRating ?? 5),
    );

    // product scope
    TestValidator.equals(
      "product_id matches target product",
      summary.product_id,
      product.id,
    );

    // created_at within date window
    TestValidator.predicate(
      "created_at within [fromCreatedAt, toCreatedAt]",
      summary.created_at >= minCreatedAt && summary.created_at <= maxCreatedAt,
    );
  }

  // 11. Secondary search: hasMedia=true (contract-only validation)
  const hasMediaRequest = {
    page: 1,
    limit: 10,
    orderBy: "createdAt" as const,
    orderDirection: "desc" as const,
    hasMedia: true,
  } satisfies IShoppingMallProductReview.IRequest;

  const hasMediaResult: IPageIShoppingMallProductReview.ISummary =
    await api.functional.shoppingMall.platformAdmin.products.reviews.index(
      connection,
      {
        productId: product.id,
        body: hasMediaRequest,
      },
    );
  typia.assert(hasMediaResult);

  const hasMediaPagination: IPage.IPagination = hasMediaResult.pagination;
  const hasMediaRows = hasMediaResult.data;

  TestValidator.predicate(
    "hasMedia pagination.records >= data.length",
    hasMediaPagination.records >= hasMediaRows.length,
  );

  for (const summary of hasMediaRows) {
    TestValidator.predicate(
      "has_media is true when filtered by hasMedia=true",
      summary.has_media === true,
    );
  }
}
