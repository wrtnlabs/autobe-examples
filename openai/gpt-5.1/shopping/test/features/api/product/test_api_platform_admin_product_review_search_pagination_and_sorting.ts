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

export async function test_api_platform_admin_product_review_search_pagination_and_sorting(
  connection: api.IConnection,
) {
  // 1. Register and login platform admin
  const adminEmail: string = typia.random<string & tags.Format<"email">>();
  const platformAdminJoinBody = {
    email: adminEmail,
    name: RandomGenerator.name(),
    password: "Admin!234",
    ip: "127.0.0.1",
    href: "https://admin.example.com/join",
    referrer: "https://admin.example.com/landing",
  } satisfies IShoppingMallPlatformAdminJoin.IRequest;

  const platformAdmin: IShoppingMallPlatformAdmin.IAuthorized =
    await api.functional.auth.platformAdmin.join(connection, {
      body: platformAdminJoinBody,
    });
  typia.assert(platformAdmin);

  // ensure login path also works and sets token (simulate admin re-login)
  const platformAdminLoginBody = {
    email: adminEmail,
    password: "Admin!234",
    ip: "127.0.0.1",
    href: "https://admin.example.com/login",
    referrer: "https://admin.example.com/landing",
  } satisfies IShoppingMallPlatformAdminLogin.IRequest;
  const platformAdminLoggedIn: IShoppingMallPlatformAdmin.IAuthorized =
    await api.functional.auth.platformAdmin.login(connection, {
      body: platformAdminLoginBody,
    });
  typia.assert(platformAdminLoggedIn);

  // 2. Create a category tree (minimal fields)
  const categoryTreeBody = {
    code: RandomGenerator.alphaNumeric(12),
    name: RandomGenerator.paragraph({ sentences: 2 }),
    description: RandomGenerator.paragraph({ sentences: 3 }),
    active: true,
    defaultLocale: "en-US",
  } satisfies IShoppingMallCategoryTree.ICreate;

  const categoryTree: IShoppingMallCategoryTree =
    await api.functional.shoppingMall.platformAdmin.categoryTrees.create(
      connection,
      { body: categoryTreeBody },
    );
  typia.assert(categoryTree);

  // 3. Create a brand
  const brandBody = {
    name: RandomGenerator.paragraph({ sentences: 2 }),
    slug: RandomGenerator.alphaNumeric(12),
    description: RandomGenerator.paragraph({ sentences: 5 }),
    logo_uri: "https://cdn.example.com/logo.png" as string & tags.Format<"uri">,
  } satisfies IShoppingMallBrand.ICreate;

  const brand: IShoppingMallBrand =
    await api.functional.shoppingMall.platformAdmin.brands.create(connection, {
      body: brandBody,
    });
  typia.assert(brand);

  // 4. Create a seller and login (needed for inventory, even though product is created by admin)
  const sellerEmail: string = typia.random<string & tags.Format<"email">>();
  const sellerJoinBody = {
    email: sellerEmail,
    password: "Seller!234",
    storeName: RandomGenerator.name(),
    contactPhone: RandomGenerator.mobile(),
  } satisfies IShoppingMallSellerJoin.IRequest;

  const sellerAuthorized: IShoppingMallSeller.IAuthorized =
    await api.functional.auth.seller.join(connection, { body: sellerJoinBody });
  typia.assert(sellerAuthorized);

  const sellerLoginBody = {
    email: sellerEmail,
    password: "Seller!234",
    ip: "127.0.0.1",
    href: "https://seller.example.com/login",
    referrer: "https://seller.example.com/landing",
  } satisfies IShoppingMallSellerLogin.IRequest;

  const sellerLoggedIn: IShoppingMallSeller.IAuthorized =
    await api.functional.auth.seller.login(connection, {
      body: sellerLoginBody,
    });
  typia.assert(sellerLoggedIn);

  // 5. As platform admin, create a product that belongs to the seller and brand
  // Switch back to platform admin by logging in again to ensure admin token
  const platformAdminRelogin: IShoppingMallPlatformAdmin.IAuthorized =
    await api.functional.auth.platformAdmin.login(connection, {
      body: platformAdminLoginBody,
    });
  typia.assert(platformAdminRelogin);

  const productCode: string & tags.MinLength<1> = RandomGenerator.alphaNumeric(
    16,
  ) as string & tags.MinLength<1>;

  const productCreateBody = {
    shopping_mall_seller_id: sellerAuthorized.id,
    shopping_mall_brand_id: brand.id,
    code: productCode,
    name: RandomGenerator.paragraph({ sentences: 2 }) as string &
      tags.MinLength<1>,
    short_description: RandomGenerator.paragraph({ sentences: 3 }),
    description: RandomGenerator.content({ paragraphs: 2 }),
    status: "active" as string & tags.MinLength<1>,
    is_multi_sku: true,
    primary_image_uri: "https://cdn.example.com/product.png" as string &
      tags.Format<"uri">,
    additional_data: null,
  } satisfies IShoppingMallProduct.ICreate;

  const product: IShoppingMallProduct =
    await api.functional.shoppingMall.platformAdmin.products.create(
      connection,
      {
        body: productCreateBody,
      },
    );
  typia.assert(product);

  // 6. Create a SKU for this product
  const skuCreateBody = {
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
        body: skuCreateBody,
      },
    );
  typia.assert(sku);

  // 7. Create inventory item for that SKU as seller
  const sellerRelogin: IShoppingMallSeller.IAuthorized =
    await api.functional.auth.seller.login(connection, {
      body: sellerLoginBody,
    });
  typia.assert(sellerRelogin);

  const inventoryCreateBody = {
    product_sku_id: sku.id,
    on_hand_quantity: 100,
    low_stock_threshold: 5,
    backorder_enabled: false,
    preorder_enabled: false,
  } satisfies IShoppingMallInventoryItem.ICreate;

  const inventoryItem: IShoppingMallInventoryItem =
    await api.functional.shoppingMall.seller.inventoryItems.create(connection, {
      body: inventoryCreateBody,
    });
  typia.assert(inventoryItem);

  // 8. Create a customer and login
  const customerEmail: string = typia.random<string & tags.Format<"email">>();
  const customerJoinBody = {
    email: customerEmail,
    password: "Customer!234",
    name: RandomGenerator.name(),
    ip: "127.0.0.1",
    href: "https://shop.example.com/join",
    referrer: "https://shop.example.com/landing",
  } satisfies IShoppingMallCustomerAuth.IJoin;

  const customerAuthorized: IShoppingMallCustomer.IAuthorized =
    await api.functional.auth.customer.join(connection, {
      body: customerJoinBody,
    });
  typia.assert(customerAuthorized);

  const customerLoginBody = {
    email: customerEmail,
    password: "Customer!234",
    ip: "127.0.0.1",
    href: "https://shop.example.com/login",
    referrer: "https://shop.example.com/landing",
  } satisfies IShoppingMallCustomerAuth.ILogin;

  const customerLoggedIn: IShoppingMallCustomer.IAuthorized =
    await api.functional.auth.customer.login(connection, {
      body: customerLoginBody,
    });
  typia.assert(customerLoggedIn);

  // 9. Create many reviews (e.g., 25) for this product as the customer
  const totalReviews = 25;
  const createdReviewIds: string[] = [];

  for (let i = 0; i < totalReviews; i++) {
    const rating: number &
      tags.Type<"int32"> &
      tags.Minimum<1> &
      tags.Maximum<5> = ((i % 5) + 1) as number &
      tags.Type<"int32"> &
      tags.Minimum<1> &
      tags.Maximum<5>;

    const reviewCreateBody = {
      rating,
      title: RandomGenerator.paragraph({ sentences: 1 }),
      body: RandomGenerator.paragraph({ sentences: 4 }),
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
    createdReviewIds.push(review.id);
  }

  // 10. Switch back to platform admin for listing/search
  const platformAdminForSearch: IShoppingMallPlatformAdmin.IAuthorized =
    await api.functional.auth.platformAdmin.login(connection, {
      body: platformAdminLoginBody,
    });
  typia.assert(platformAdminForSearch);

  // Helper: function to assert descending sort by ISO date-time string
  const assertCreatedAtDescending = (
    items: IShoppingMallProductReview.ISummary[],
  ): void => {
    for (let i = 0; i + 1 < items.length; i++) {
      const left = items[i].created_at;
      const right = items[i + 1].created_at;
      TestValidator.predicate(
        `created_at descending at index ${i}`,
        left >= right,
      );
    }
  };

  // Helper: assert rating order
  const assertRatingOrder = (
    items: IShoppingMallProductReview.ISummary[],
    direction: "asc" | "desc",
  ): void => {
    for (let i = 0; i + 1 < items.length; i++) {
      const left = items[i].rating_value;
      const right = items[i + 1].rating_value;
      if (direction === "asc") {
        TestValidator.predicate(
          `rating ascending at index ${i}`,
          left <= right,
        );
      } else {
        TestValidator.predicate(
          `rating descending at index ${i}`,
          left >= right,
        );
      }
    }
  };

  // 11. First page: page=1, limit=10, orderBy=createdAt desc
  const firstPageRequestBody = {
    page: 1 as number & tags.Type<"int32"> & tags.Minimum<1>,
    limit: 10 as number &
      tags.Type<"int32"> &
      tags.Minimum<1> &
      tags.Maximum<100>,
    orderBy: "createdAt" as const,
    orderDirection: "desc" as const,
  } satisfies IShoppingMallProductReview.IRequest;

  const firstPage: IPageIShoppingMallProductReview.ISummary =
    await api.functional.shoppingMall.platformAdmin.products.reviews.index(
      connection,
      {
        productId: product.id as string & tags.Format<"uuid">,
        body: firstPageRequestBody,
      },
    );
  typia.assert(firstPage);

  const firstPagination = firstPage.pagination;
  const firstData = firstPage.data;

  TestValidator.equals(
    "first page limit should be 10",
    firstPagination.limit,
    10,
  );

  TestValidator.predicate(
    "records should be at least 25",
    firstPagination.records >= totalReviews,
  );

  const expectedPages = Math.ceil(
    firstPagination.records /
      (firstPagination.limit === 0 ? 1 : firstPagination.limit),
  );

  TestValidator.equals(
    "pages should equal ceil(records/limit)",
    firstPagination.pages,
    expectedPages,
  );

  TestValidator.equals(
    "first page should contain 10 items",
    firstData.length,
    10,
  );

  assertCreatedAtDescending(firstData);

  // 12. Second page: page=2, limit=10, same ordering
  const secondPageRequestBody = {
    page: 2 as number & tags.Type<"int32"> & tags.Minimum<1>,
    limit: 10 as number &
      tags.Type<"int32"> &
      tags.Minimum<1> &
      tags.Maximum<100>,
    orderBy: "createdAt" as const,
    orderDirection: "desc" as const,
  } satisfies IShoppingMallProductReview.IRequest;

  const secondPage: IPageIShoppingMallProductReview.ISummary =
    await api.functional.shoppingMall.platformAdmin.products.reviews.index(
      connection,
      {
        productId: product.id as string & tags.Format<"uuid">,
        body: secondPageRequestBody,
      },
    );
  typia.assert(secondPage);

  const secondData = secondPage.data;

  TestValidator.equals(
    "second page should also contain 10 items",
    secondData.length,
    10,
  );

  // Ensure no overlap of review_ids between page 1 and page 2
  const firstIds = firstData.map((r) => r.review_id);
  const secondIds = secondData.map((r) => r.review_id);

  const intersection = secondIds.filter((id) => firstIds.includes(id));
  TestValidator.equals(
    "no overlapping review_ids between page1 and page2",
    intersection.length,
    0,
  );

  // 13. Sorting by rating asc
  const ratingAscRequestBody = {
    page: 1 as number & tags.Type<"int32"> & tags.Minimum<1>,
    limit: 10 as number &
      tags.Type<"int32"> &
      tags.Minimum<1> &
      tags.Maximum<100>,
    orderBy: "rating" as const,
    orderDirection: "asc" as const,
  } satisfies IShoppingMallProductReview.IRequest;

  const ratingAscPage: IPageIShoppingMallProductReview.ISummary =
    await api.functional.shoppingMall.platformAdmin.products.reviews.index(
      connection,
      {
        productId: product.id as string & tags.Format<"uuid">,
        body: ratingAscRequestBody,
      },
    );
  typia.assert(ratingAscPage);
  assertRatingOrder(ratingAscPage.data, "asc");

  // 14. Sorting by rating desc
  const ratingDescRequestBody = {
    page: 1 as number & tags.Type<"int32"> & tags.Minimum<1>,
    limit: 10 as number &
      tags.Type<"int32"> &
      tags.Minimum<1> &
      tags.Maximum<100>,
    orderBy: "rating" as const,
    orderDirection: "desc" as const,
  } satisfies IShoppingMallProductReview.IRequest;

  const ratingDescPage: IPageIShoppingMallProductReview.ISummary =
    await api.functional.shoppingMall.platformAdmin.products.reviews.index(
      connection,
      {
        productId: product.id as string & tags.Format<"uuid">,
        body: ratingDescRequestBody,
      },
    );
  typia.assert(ratingDescPage);
  assertRatingOrder(ratingDescPage.data, "desc");

  // 15. Out-of-range page: request a page beyond available pages
  const pages = firstPagination.pages;
  const outOfRangePageIndex = (pages + 10) as number &
    tags.Type<"int32"> &
    tags.Minimum<1>;

  const outOfRangeRequestBody = {
    page: outOfRangePageIndex,
    limit: 10 as number &
      tags.Type<"int32"> &
      tags.Minimum<1> &
      tags.Maximum<100>,
    orderBy: "createdAt" as const,
    orderDirection: "desc" as const,
  } satisfies IShoppingMallProductReview.IRequest;

  const outOfRangePage: IPageIShoppingMallProductReview.ISummary =
    await api.functional.shoppingMall.platformAdmin.products.reviews.index(
      connection,
      {
        productId: product.id as string & tags.Format<"uuid">,
        body: outOfRangeRequestBody,
      },
    );
  typia.assert(outOfRangePage);

  TestValidator.equals(
    "out-of-range page should have empty data",
    outOfRangePage.data.length,
    0,
  );

  TestValidator.equals(
    "out-of-range pagination.records should match first page",
    outOfRangePage.pagination.records,
    firstPagination.records,
  );

  TestValidator.equals(
    "out-of-range pagination.pages should match first page",
    outOfRangePage.pagination.pages,
    firstPagination.pages,
  );
}
