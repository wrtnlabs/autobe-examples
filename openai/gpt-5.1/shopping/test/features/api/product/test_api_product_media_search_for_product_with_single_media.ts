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
 * Validate searching product media for a product with exactly one media asset.
 *
 * Business flow:
 *
 * 1. Platform admin joins (authenticated) and creates a brand and category tree.
 * 2. Seller joins (authenticated) and creates a product linked to that brand.
 * 3. Seller attaches exactly one media asset to the product.
 * 4. Public media search API is called with basic pagination only.
 * 5. Assert that exactly one media summary is returned and it matches the created
 *    media.
 */
export async function test_api_product_media_search_for_product_with_single_media(
  connection: api.IConnection,
) {
  // 1. Platform admin joins
  const platformAdminEmail: string & tags.Format<"email"> = typia.random<
    string & tags.Format<"email">
  >();
  const platformAdminJoinRequest = {
    email: platformAdminEmail,
    name: RandomGenerator.name(),
    password: "admin-password-1234",
    ip: null,
    href: "https://admin.example.com/join",
    referrer: "https://admin.example.com/landing",
  } satisfies IShoppingMallPlatformAdminJoin.IRequest;

  const platformAdmin: IShoppingMallPlatformAdmin.IAuthorized =
    await api.functional.auth.platformAdmin.join(connection, {
      body: platformAdminJoinRequest,
    });
  typia.assert(platformAdmin);

  // 2. Platform admin creates a brand
  const brandCreateBody = {
    name: RandomGenerator.paragraph({ sentences: 2 }),
    slug: RandomGenerator.alphaNumeric(12),
    description: RandomGenerator.paragraph({ sentences: 5 }),
    logo_uri: "https://cdn.example.com/brand/logo.png" as string &
      tags.Format<"uri">,
  } satisfies IShoppingMallBrand.ICreate;

  const brand: IShoppingMallBrand =
    await api.functional.shoppingMall.platformAdmin.brands.create(connection, {
      body: brandCreateBody,
    });
  typia.assert(brand);

  // 3. Platform admin creates a category tree
  const categoryTreeCreateBody = {
    code: `tree-${RandomGenerator.alphaNumeric(8)}`,
    name: RandomGenerator.paragraph({ sentences: 2 }),
    description: RandomGenerator.paragraph({ sentences: 4 }),
    active: true,
    defaultLocale: "en-US",
  } satisfies IShoppingMallCategoryTree.ICreate;

  const categoryTree: IShoppingMallCategoryTree =
    await api.functional.shoppingMall.platformAdmin.categoryTrees.create(
      connection,
      {
        body: categoryTreeCreateBody,
      },
    );
  typia.assert(categoryTree);

  // 4. Seller joins
  const sellerEmail: string & tags.Format<"email"> = typia.random<
    string & tags.Format<"email">
  >();
  const sellerJoinBody = {
    email: sellerEmail,
    password: "seller-password-1234",
    storeName: RandomGenerator.paragraph({ sentences: 2 }),
    contactPhone: RandomGenerator.mobile(),
  } satisfies IShoppingMallSellerJoin.IRequest;

  const seller: IShoppingMallSeller.IAuthorized =
    await api.functional.auth.seller.join(connection, {
      body: sellerJoinBody,
    });
  typia.assert(seller);

  // 5. Seller creates a product linked to the brand
  const productCode: string & tags.MinLength<1> =
    `prd-${RandomGenerator.alphaNumeric(10)}` as string & tags.MinLength<1>;

  const productCreateBody = {
    shopping_mall_seller_id: seller.id,
    shopping_mall_brand_id: brand.id,
    code: productCode,
    name: RandomGenerator.paragraph({ sentences: 2 }),
    short_description: RandomGenerator.paragraph({ sentences: 3 }),
    description: RandomGenerator.content({ paragraphs: 2 }),
    status: "active" as string & tags.MinLength<1>,
    is_multi_sku: false,
    primary_image_uri: "https://cdn.example.com/product/primary.png" as string &
      tags.Format<"uri">,
    additional_data: null,
  } satisfies IShoppingMallProduct.ICreate;

  const product: IShoppingMallProduct =
    await api.functional.shoppingMall.seller.products.create(connection, {
      body: productCreateBody,
    });
  typia.assert(product);

  TestValidator.equals(
    "created product code should match request code",
    product.code,
    productCode,
  );

  // 6. Seller attaches a single media asset to the product
  const mediaCreateBody = {
    uri: "https://cdn.example.com/product/media-1.png" as string &
      tags.Format<"uri">,
    media_type: "image",
    alt_text: RandomGenerator.paragraph({ sentences: 3 }),
    display_order: 1 as number & tags.Type<"int32">,
    is_primary: true,
  } satisfies IShoppingMallProductMedia.ICreate;

  const media: IShoppingMallProductMedia =
    await api.functional.shoppingMall.seller.products.media.create(connection, {
      productCode: product.code,
      body: mediaCreateBody,
    });
  typia.assert(media);

  TestValidator.equals(
    "created media uri should match request uri",
    media.uri,
    mediaCreateBody.uri,
  );
  TestValidator.equals(
    "created media display_order should match request display_order",
    media.display_order,
    mediaCreateBody.display_order,
  );
  TestValidator.equals(
    "created media is_primary should match request is_primary",
    media.is_primary,
    mediaCreateBody.is_primary,
  );

  // 7 & 8. Call media search API with basic pagination only
  const searchRequestBody = {
    page: 0 as number & tags.Type<"int32">,
    limit: 10 as number & tags.Type<"int32">,
    mediaType: undefined,
    isVisible: undefined,
    isPrimary: undefined,
    createdFrom: undefined,
    createdTo: undefined,
    orderBy: undefined,
    orderDirection: undefined,
  } satisfies IShoppingMallProductMedia.IRequest;

  const pageResult: IPageIShoppingMallProductMedia.ISummary =
    await api.functional.shoppingMall.products.media.index(connection, {
      productCode: product.code,
      body: searchRequestBody,
    });
  typia.assert(pageResult);

  const pagination: IPage.IPagination = pageResult.pagination;
  typia.assert(pagination);

  // 9. Verify pagination metadata and single record
  TestValidator.equals(
    "pagination.records should be 1 for single media",
    pagination.records,
    1,
  );
  TestValidator.equals(
    "pagination.pages should be 1 when limit>records",
    pagination.pages,
    1,
  );
  TestValidator.equals(
    "data length should be exactly 1",
    pageResult.data.length,
    1,
  );

  const summary: IShoppingMallProductMedia.ISummary = pageResult.data[0];
  typia.assert(summary);

  // 10. Validate that returned summary matches created media
  TestValidator.equals(
    "returned media id should match created media id",
    summary.id,
    media.id,
  );
  TestValidator.equals(
    "returned media uri should match created media uri",
    summary.uri,
    media.uri,
  );
  TestValidator.equals(
    "returned media media_type should match created media media_type",
    summary.media_type,
    media.media_type,
  );
  TestValidator.equals(
    "returned media is_primary should match created media is_primary",
    summary.is_primary,
    media.is_primary,
  );
  TestValidator.equals(
    "returned media display_order should match created media display_order",
    summary.display_order,
    media.display_order,
  );
}
