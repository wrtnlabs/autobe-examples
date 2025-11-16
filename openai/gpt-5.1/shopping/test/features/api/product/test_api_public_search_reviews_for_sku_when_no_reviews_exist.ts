import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIShoppingMallProductReview } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallProductReview";
import type { IShoppingMallBrand } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallBrand";
import type { IShoppingMallCategoryTree } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCategoryTree";
import type { IShoppingMallPlatformAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallPlatformAdmin";
import type { IShoppingMallPlatformAdminJoin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallPlatformAdminJoin";
import type { IShoppingMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProduct";
import type { IShoppingMallProductReview } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductReview";
import type { IShoppingMallProductSku } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductSku";
import type { IShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSeller";

/**
 * Verify that searching reviews for a valid product/SKU pair with no reviews
 * returns an empty page with correct pagination metadata and no errors.
 *
 * Business context
 *
 * - Public shoppers can view reviews for specific product SKUs.
 * - When no reviews exist yet for a given SKU, the search endpoint should behave
 *   like a normal paginated list but with an empty result set.
 * - Pagination metadata must be consistent with IPage.IPagination semantics for
 *   the zero-record case: records = 0, pages = 0, current = 0.
 *
 * High-level flow
 *
 * 1. Register a platform admin (join) to obtain an authorized context for catalog
 *    management APIs.
 * 2. As the admin, create supporting catalog entities:
 *
 *    - A category tree (realistic but not strictly required by product APIs).
 *    - A brand.
 * 3. Create a product that belongs to the brand.
 * 4. Create a SKU under that product.
 * 5. Without creating any product reviews, call the public SKU review search
 *    endpoint for (productId, skuId) with a basic pagination payload.
 * 6. Assert that the response is successful, the data array is empty, and
 *    pagination metadata reflects zero records and zero pages.
 */
export async function test_api_public_search_reviews_for_sku_when_no_reviews_exist(
  connection: api.IConnection,
) {
  // 1. Register a platform admin and establish authorized context
  const adminJoinBody = {
    email: typia.random<string & tags.Format<"email">>(),
    name: RandomGenerator.name(),
    password: RandomGenerator.alphaNumeric(12),
    ip: null,
    href: typia.random<string & tags.Format<"uri">>(),
    referrer: typia.random<string & tags.Format<"uri">>(),
  } satisfies IShoppingMallPlatformAdminJoin.IRequest;

  const admin: IShoppingMallPlatformAdmin.IAuthorized =
    await api.functional.auth.platformAdmin.join(connection, {
      body: adminJoinBody,
    });
  typia.assert(admin);

  // 2. Create catalog support entities as platform admin
  // 2-1. Category tree (not strictly required for product create,
  //      but realistic context)
  const categoryTreeBody = {
    code: RandomGenerator.alphaNumeric(12),
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

  // 2-2. Brand
  const brandBody = {
    name: RandomGenerator.paragraph({ sentences: 2 }),
    slug: RandomGenerator.alphaNumeric(16),
    description: undefined,
    logo_uri: typia.random<string & tags.Format<"uri">>(),
  } satisfies IShoppingMallBrand.ICreate;

  const brand: IShoppingMallBrand =
    await api.functional.shoppingMall.platformAdmin.brands.create(connection, {
      body: brandBody,
    });
  typia.assert(brand);

  // 3. Create a product associated with the brand
  // Note: There is no seller creation endpoint in the materials, so
  // we generate a UUID for shopping_mall_seller_id that is type-valid.
  const productBody = {
    shopping_mall_seller_id: typia.random<string & tags.Format<"uuid">>(),
    shopping_mall_brand_id: brand.id,
    code: RandomGenerator.alphaNumeric(16),
    name: RandomGenerator.paragraph({ sentences: 2 }),
    short_description: null,
    description: null,
    status: "active",
    is_multi_sku: true,
    primary_image_uri: typia.random<string & tags.Format<"uri">>(),
    additional_data: null,
  } satisfies IShoppingMallProduct.ICreate;

  const product: IShoppingMallProduct =
    await api.functional.shoppingMall.platformAdmin.products.create(
      connection,
      { body: productBody },
    );
  typia.assert(product);

  // 4. Create a SKU under the product (using product.code as path param)
  const skuBody = {
    code: RandomGenerator.alphaNumeric(12),
    name: RandomGenerator.paragraph({ sentences: 3 }),
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

  // 5. Search reviews for this SKU without creating any reviews
  const searchRequestBody = {
    page: 1,
    limit: 10,
    orderBy: undefined,
    orderDirection: undefined,
    minRating: undefined,
    maxRating: undefined,
    fromCreatedAt: undefined,
    toCreatedAt: undefined,
    hasMedia: undefined,
    verifiedPurchaseOnly: undefined,
    status: undefined,
  } satisfies IShoppingMallProductReview.IRequest;

  const page: IPageIShoppingMallProductReview.ISummary =
    await api.functional.shoppingMall.products.skus.reviews.index(connection, {
      productId: product.id,
      skuId: sku.id,
      body: searchRequestBody,
    });
  typia.assert<IPageIShoppingMallProductReview.ISummary>(page);

  const { pagination, data } = page;

  // 6. Validate empty-state semantics
  TestValidator.equals(
    "SKU review search returns empty data when no reviews exist",
    data.length,
    0,
  );

  TestValidator.equals(
    "SKU review search pagination.records is zero when no reviews exist",
    pagination.records,
    0,
  );

  TestValidator.equals(
    "SKU review search pagination.pages is zero when no reviews exist",
    pagination.pages,
    0,
  );

  TestValidator.equals(
    "SKU review search pagination.current is zero when no reviews exist",
    pagination.current,
    0,
  );

  TestValidator.predicate(
    "SKU review search pagination.limit is non-negative",
    pagination.limit >= 0,
  );
}
