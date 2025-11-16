import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallBrand } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallBrand";
import type { IShoppingMallCatalogStatistics } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCatalogStatistics";
import type { IShoppingMallCategoryTree } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCategoryTree";
import type { IShoppingMallPlatformAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallPlatformAdmin";
import type { IShoppingMallPlatformAdminJoin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallPlatformAdminJoin";
import type { IShoppingMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProduct";
import type { IShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSeller";

/**
 * Validate that product status summary aggregation is structurally consistent
 * and reflects at least the products created in this test, treating all of them
 * as non-deleted because no delete/soft-delete API is available in the provided
 * function set.
 *
 * Business context:
 *
 * - Platform admin joins and receives an authorized session.
 * - Admin creates catalog scaffolding: a category tree and a brand.
 * - Admin creates several products with the same status (e.g., "active").
 * - Admin calls the productStatusSummary analytics endpoint.
 * - The test validates that:
 *
 *   - The summary structure matches IProductStatusSummary.
 *   - TotalCount equals the sum of bucket.productCount values.
 *   - The bucket corresponding to our chosen status exists and has a productCount
 *       greater than or equal to the number of products created in this test
 *       (since other products may already exist in the system).
 */
export async function test_api_platform_admin_product_status_summary_ignores_soft_deleted_products(
  connection: api.IConnection,
) {
  // 1. Join as platform admin to obtain authorized session
  const adminJoinBody = {
    email: `admin+${RandomGenerator.alphaNumeric(8)}@example.com`,
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

  // 2. Create a category tree to mirror realistic catalog setup
  const categoryTreeBody = {
    code: `tree-${RandomGenerator.alphaNumeric(8)}`,
    name: "Main Catalog Tree",
    description: RandomGenerator.paragraph({ sentences: 4 }),
    active: true,
    defaultLocale: "en-US",
  } satisfies IShoppingMallCategoryTree.ICreate;

  const categoryTree: IShoppingMallCategoryTree =
    await api.functional.shoppingMall.platformAdmin.categoryTrees.create(
      connection,
      {
        body: categoryTreeBody,
      },
    );
  typia.assert(categoryTree);

  // 3. Create a brand for products to reference
  const brandBody = {
    name: `Brand ${RandomGenerator.name(1)}`,
    slug: `brand-${RandomGenerator.alphaNumeric(8)}`,
    description: RandomGenerator.paragraph({ sentences: 3 }),
    logo_uri: "https://cdn.example.com/logo.png",
  } satisfies IShoppingMallBrand.ICreate;

  const brand: IShoppingMallBrand =
    await api.functional.shoppingMall.platformAdmin.brands.create(connection, {
      body: brandBody,
    });
  typia.assert(brand);

  // 4. Create multiple products with the same status (e.g., "active").
  const statusValue = "active";
  const productCountToCreate = 3;

  const products: IShoppingMallProduct[] = [];
  for (let i = 0; i < productCountToCreate; ++i) {
    const productBody = {
      shopping_mall_seller_id: typia.random<string & tags.Format<"uuid">>(),
      shopping_mall_brand_id: brand.id,
      code: `prod-${RandomGenerator.alphaNumeric(10)}`,
      name: `Product ${RandomGenerator.name(1)}`,
      short_description: RandomGenerator.paragraph({ sentences: 2 }),
      description: RandomGenerator.paragraph({ sentences: 6 }),
      status: statusValue,
      is_multi_sku: false,
      primary_image_uri: "https://cdn.example.com/product.png",
      additional_data: null,
    } satisfies IShoppingMallProduct.ICreate;

    const created: IShoppingMallProduct =
      await api.functional.shoppingMall.platformAdmin.products.create(
        connection,
        { body: productBody },
      );
    typia.assert(created);
    products.push(created);
  }

  // 5. Call the product status summary endpoint
  const summary: IShoppingMallCatalogStatistics.IProductStatusSummary =
    await api.functional.shoppingMall.platformAdmin.catalog.statistics.productStatusSummary.index(
      connection,
    );
  typia.assert(summary);

  // 6. Validate structural consistency: totalCount equals sum of bucket counts
  const sumOfBuckets = summary.buckets.reduce(
    (acc, bucket) => acc + bucket.productCount,
    0,
  );

  TestValidator.equals(
    "totalCount equals sum of bucket.productCount",
    summary.totalCount,
    sumOfBuckets,
  );

  // 7. Verify that the bucket for our chosen status exists and that its
  //    productCount is at least the number of products we just created.
  const statusBucket = summary.buckets.find(
    (bucket) => bucket.status === statusValue,
  );

  TestValidator.predicate(
    "status bucket for created products exists",
    statusBucket !== undefined,
  );

  if (statusBucket !== undefined) {
    TestValidator.predicate(
      "status bucket count covers created products",
      statusBucket.productCount >= productCountToCreate,
    );
  }
}
