import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIShoppingMallProductMedia } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallProductMedia";
import type { IShoppingMallBrand } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallBrand";
import type { IShoppingMallCategoryTree } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCategoryTree";
import type { IShoppingMallPlatformAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallPlatformAdmin";
import type { IShoppingMallPlatformAdminJoin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallPlatformAdminJoin";
import type { IShoppingMallPlatformAdminLogin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallPlatformAdminLogin";
import type { IShoppingMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProduct";
import type { IShoppingMallProductMedia } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductMedia";
import type { IShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSeller";
import type { IShoppingMallSellerJoin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSellerJoin";
import type { IShoppingMallSellerLogin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSellerLogin";

/**
 * Validate product media search filtering by mediaType and isVisible.
 *
 * Business goal: Ensure that the public product media search endpoint (PATCH
 * /shoppingMall/products/{productCode}/media) correctly filters media by
 * mediaType (e.g., image vs video) and by the logical visibility abstraction
 * isVisible, while returning consistent pagination metadata.
 *
 * High level flow:
 *
 * 1. Create a platform admin and authenticate.
 * 2. With admin, create a category tree and a brand.
 * 3. Create a seller and authenticate as that seller.
 * 4. Seller creates a product associated with the created brand.
 * 5. Seller registers three media assets on that product:
 *
 *    - Visible primary image
 *    - Another image (non-primary)
 *    - A non-image media (video)
 * 6. Call the media search endpoint with mediaType="image" and isVisible=true and
 *    verify only image-type media are returned.
 * 7. Call the media search endpoint with mediaType="image" and isVisible=null and
 *    verify that result set is not smaller, while still restricted to
 *    image-type media.
 */
export async function test_api_product_media_search_with_filter_by_media_type_and_visibility(
  connection: api.IConnection,
) {
  // 1. Platform admin join (auto-authenticate via SDK)
  const platformAdminEmail: string & tags.Format<"email"> = typia.random<
    string & tags.Format<"email">
  >();
  const platformAdminPassword: string = RandomGenerator.alphaNumeric(12);

  const platformAdminJoinBody = {
    email: platformAdminEmail,
    name: RandomGenerator.name(),
    password: platformAdminPassword,
    ip: null,
    href: "https://admin.example.com/join",
    referrer: "https://admin.example.com/",
  } satisfies IShoppingMallPlatformAdminJoin.IRequest;

  const platformAdmin: IShoppingMallPlatformAdmin.IAuthorized =
    await api.functional.auth.platformAdmin.join(connection, {
      body: platformAdminJoinBody,
    });
  typia.assert(platformAdmin);

  // 2. Create category tree as platform admin (prerequisite, not directly used)
  const categoryTreeBody = {
    code: `tree-${RandomGenerator.alphaNumeric(8)}`,
    name: "Main Catalog Tree",
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

  // 3. Create a brand as platform admin
  const brandBody = {
    name: `Brand ${RandomGenerator.name(1)}`,
    slug: `brand-${RandomGenerator.alphaNumeric(10)}`,
    description: RandomGenerator.paragraph({ sentences: 2 }),
    logo_uri: typia.random<string & tags.Format<"uri">>(),
  } satisfies IShoppingMallBrand.ICreate;

  const brand: IShoppingMallBrand =
    await api.functional.shoppingMall.platformAdmin.brands.create(connection, {
      body: brandBody,
    });
  typia.assert(brand);

  // 4. Seller join (auto-authenticates as seller)
  const sellerEmail: string & tags.Format<"email"> = typia.random<
    string & tags.Format<"email">
  >();
  const sellerPassword: string = RandomGenerator.alphaNumeric(12);

  const sellerJoinBody = {
    email: sellerEmail,
    password: sellerPassword,
    storeName: `Store ${RandomGenerator.name(1)}`,
    contactPhone: RandomGenerator.mobile(),
  } satisfies IShoppingMallSellerJoin.IRequest;

  const sellerAuthorized: IShoppingMallSeller.IAuthorized =
    await api.functional.auth.seller.join(connection, {
      body: sellerJoinBody,
    });
  typia.assert(sellerAuthorized);

  // 4-b. Explicit seller login to ensure token refresh path works (optional)
  const sellerLoginBody = {
    email: sellerEmail,
    password: sellerPassword,
    ip: null,
    href: "https://seller.example.com/login",
    referrer: "https://seller.example.com/",
  } satisfies IShoppingMallSellerLogin.IRequest;

  const sellerLoggedIn: IShoppingMallSeller.IAuthorized =
    await api.functional.auth.seller.login(connection, {
      body: sellerLoginBody,
    });
  typia.assert(sellerLoggedIn);

  // 5. Seller creates a product associated with the brand
  const productCode: string & tags.MinLength<1> = RandomGenerator.alphaNumeric(
    12,
  ) as string satisfies string as string;

  const productCreateBody = {
    shopping_mall_seller_id: sellerLoggedIn.seller.id,
    shopping_mall_brand_id: brand.id,
    code: productCode,
    name: RandomGenerator.paragraph({ sentences: 3 }),
    short_description: RandomGenerator.paragraph({ sentences: 2 }),
    description: RandomGenerator.content({ paragraphs: 2 }),
    status: "active",
    is_multi_sku: false,
    primary_image_uri: null,
    additional_data: null,
  } satisfies IShoppingMallProduct.ICreate;

  const product: IShoppingMallProduct =
    await api.functional.shoppingMall.seller.products.create(connection, {
      body: productCreateBody,
    });
  typia.assert(product);

  // 6. Seller creates media assets for the product
  // 6-a. Visible primary image media
  const primaryImageBody = {
    uri: typia.random<string & tags.Format<"uri">>(),
    media_type: "image",
    alt_text: RandomGenerator.paragraph({ sentences: 2 }),
    display_order: 1,
    is_primary: true,
  } satisfies IShoppingMallProductMedia.ICreate;

  const primaryImage: IShoppingMallProductMedia =
    await api.functional.shoppingMall.seller.products.media.create(connection, {
      productCode: product.code,
      body: primaryImageBody,
    });
  typia.assert(primaryImage);

  // 6-b. Another image media (non-primary, conceptually could be hidden later)
  const secondaryImageBody = {
    uri: typia.random<string & tags.Format<"uri">>(),
    media_type: "image",
    alt_text: RandomGenerator.paragraph({ sentences: 1 }),
    display_order: 2,
    is_primary: false,
  } satisfies IShoppingMallProductMedia.ICreate;

  const secondaryImage: IShoppingMallProductMedia =
    await api.functional.shoppingMall.seller.products.media.create(connection, {
      productCode: product.code,
      body: secondaryImageBody,
    });
  typia.assert(secondaryImage);

  // 6-c. Non-image media (video)
  const videoMediaBody = {
    uri: typia.random<string & tags.Format<"uri">>(),
    media_type: "video",
    alt_text: RandomGenerator.paragraph({ sentences: 1 }),
    display_order: 3,
    is_primary: false,
  } satisfies IShoppingMallProductMedia.ICreate;

  const videoMedia: IShoppingMallProductMedia =
    await api.functional.shoppingMall.seller.products.media.create(connection, {
      productCode: product.code,
      body: videoMediaBody,
    });
  typia.assert(videoMedia);

  // 7. Search with mediaType="image" and isVisible=true
  const visibleImageSearchBody = {
    page: 1,
    limit: 10,
    mediaType: "image",
    isVisible: true,
    isPrimary: null,
    createdFrom: null,
    createdTo: null,
    orderBy: null,
    orderDirection: null,
  } satisfies IShoppingMallProductMedia.IRequest;

  const visibleImagePage: IPageIShoppingMallProductMedia.ISummary =
    await api.functional.shoppingMall.products.media.index(connection, {
      productCode: product.code,
      body: visibleImageSearchBody,
    });
  typia.assert(visibleImagePage);

  const visibleImageData = visibleImagePage.data;

  // All returned media should be of media_type "image"
  for (const item of visibleImageData) {
    TestValidator.equals(
      "visible image search returns only image media_type",
      item.media_type,
      "image",
    );
  }

  // Ensure that the non-image media is excluded
  TestValidator.predicate(
    "visible image search excludes video media",
    visibleImageData.every((item) => item.id !== videoMedia.id),
  );

  // At least one image should be returned (the primary image)
  TestValidator.predicate(
    "visible image search returns at least one record",
    visibleImageData.length >= 1,
  );

  // Pagination metadata consistency
  const visiblePagination = visibleImagePage.pagination;
  TestValidator.predicate(
    "pagination.limit is not less than data length (visible image search)",
    visiblePagination.limit >= visibleImageData.length,
  );

  TestValidator.predicate(
    "pagination.records is not less than data length (visible image search)",
    visiblePagination.records >= visibleImageData.length,
  );

  // 8. Search with mediaType="image" and isVisible=null (no visibility filter)
  const relaxedVisibilitySearchBody = {
    page: 1,
    limit: 10,
    mediaType: "image",
    isVisible: null,
    isPrimary: null,
    createdFrom: null,
    createdTo: null,
    orderBy: null,
    orderDirection: null,
  } satisfies IShoppingMallProductMedia.IRequest;

  const relaxedVisibilityPage: IPageIShoppingMallProductMedia.ISummary =
    await api.functional.shoppingMall.products.media.index(connection, {
      productCode: product.code,
      body: relaxedVisibilitySearchBody,
    });
  typia.assert(relaxedVisibilityPage);

  const relaxedData = relaxedVisibilityPage.data;

  // All returned media should still be of media_type "image"
  for (const item of relaxedData) {
    TestValidator.equals(
      "relaxed visibility search returns only image media_type",
      item.media_type,
      "image",
    );
  }

  // Relaxing visibility constraint must not reduce the number of matching records
  const relaxedPagination = relaxedVisibilityPage.pagination;
  TestValidator.predicate(
    "relaxed visibility search does not reduce total records",
    relaxedPagination.records >= visiblePagination.records,
  );

  // Also, page size should be sufficient for returned data
  TestValidator.predicate(
    "pagination.limit is not less than data length (relaxed visibility)",
    relaxedPagination.limit >= relaxedData.length,
  );

  TestValidator.predicate(
    "pagination.records is not less than data length (relaxed visibility)",
    relaxedPagination.records >= relaxedData.length,
  );
}
