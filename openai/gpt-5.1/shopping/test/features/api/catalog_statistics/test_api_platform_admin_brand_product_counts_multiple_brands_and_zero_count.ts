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
import type { IShoppingMallPlatformAdminLogin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallPlatformAdminLogin";
import type { IShoppingMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProduct";
import type { IShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSeller";
import type { IShoppingMallSellerJoin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSellerJoin";
import type { IShoppingMallSellerLogin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSellerLogin";

/**
 * Validate brand-level product count aggregation for multiple brands, including
 * a brand with zero products, using the platform admin catalog statistics
 * endpoint.
 *
 * Business goals:
 *
 * - Ensure that when multiple brands exist, the statistics endpoint returns
 *   accurate productCount per brand.
 * - Confirm that products associated with Brand A are counted, while Brand B with
 *   no products yields zero count or is omitted consistently.
 * - Verify that both seller-created and platform-admin-created products
 *   associated with Brand A contribute to the same aggregated productCount.
 *
 * High-level flow:
 *
 * 1. Register a platform admin and authenticate to obtain an authorized admin
 *    context.
 * 2. Using the admin context, create two brands: Brand A and Brand B (with
 *    distinct slugs).
 * 3. Still as admin, create a category tree as a realistic catalog prerequisite
 *    (even though the statistics endpoint does not take it as an input, it
 *    simulates real catalog configuration).
 * 4. Register a seller account and authenticate to obtain a seller context.
 * 5. As the seller, create several products that are all associated with Brand A.
 * 6. Optionally, as the platform admin, create an additional product also
 *    associated with Brand A (using the platformAdmin products endpoint) to
 *    ensure that aggregation is independent of creator role.
 * 7. Switch back to platform admin context (if needed) and call the
 *    brandProductCounts statistics endpoint.
 * 8. Assert that:
 *
 *    - The response is a valid IShoppingMallCatalogStatistics.IBrandProductCounts
 *         array.
 *    - There is an entry for Brand A whose productCount is equal to the total number
 *         of products created for Brand A (seller + admin created).
 *    - For Brand B, either:
 *
 *         - An entry exists with productCount === 0, or
 *         - No entry exists at all. The test should explicitly document this behavior
 *                   using assertions so that the contract is clear.
 */
export async function test_api_platform_admin_brand_product_counts_multiple_brands_and_zero_count(
  connection: api.IConnection,
) {
  // 1. Register a platform admin (join) to obtain admin auth context.
  const adminJoinBody = {
    email: typia.random<string & tags.Format<"email">>(),
    name: RandomGenerator.name(),
    password: RandomGenerator.alphaNumeric(12),
    ip: null,
    href: "https://admin.localhost/join",
    referrer: "https://admin.localhost/landing",
  } satisfies IShoppingMallPlatformAdminJoin.IRequest;

  const adminAuthorized: IShoppingMallPlatformAdmin.IAuthorized =
    await api.functional.auth.platformAdmin.join(connection, {
      body: adminJoinBody,
    });
  typia.assert(adminAuthorized);

  const adminEmail: string & tags.Format<"email"> = adminAuthorized.email;
  const adminPassword: string = adminJoinBody.password;

  // 2. (Optional but safe) Login again as platform admin to ensure
  //    token handling works as expected and future API calls are
  //    explicitly under platform admin context.
  const adminLoginBody = {
    email: adminEmail,
    password: adminPassword,
    ip: null,
    href: "https://admin.localhost/login",
    referrer: "https://admin.localhost/landing",
  } satisfies IShoppingMallPlatformAdminLogin.IRequest;

  const adminAfterLogin: IShoppingMallPlatformAdmin.IAuthorized =
    await api.functional.auth.platformAdmin.login(connection, {
      body: adminLoginBody,
    });
  typia.assert(adminAfterLogin);

  // 3. As admin, create two distinct brands: Brand A and Brand B.
  const brandABody = {
    name: `Brand A ${RandomGenerator.alphabets(8)}`,
    slug: `brand-a-${RandomGenerator.alphaNumeric(8)}`,
    description: RandomGenerator.paragraph({ sentences: 3 }),
    logo_uri: undefined,
  } satisfies IShoppingMallBrand.ICreate;

  const brandA: IShoppingMallBrand =
    await api.functional.shoppingMall.platformAdmin.brands.create(connection, {
      body: brandABody,
    });
  typia.assert(brandA);

  const brandBBody = {
    name: `Brand B ${RandomGenerator.alphabets(8)}`,
    slug: `brand-b-${RandomGenerator.alphaNumeric(8)}`,
    description: RandomGenerator.paragraph({ sentences: 2 }),
    logo_uri: undefined,
  } satisfies IShoppingMallBrand.ICreate;

  const brandB: IShoppingMallBrand =
    await api.functional.shoppingMall.platformAdmin.brands.create(connection, {
      body: brandBBody,
    });
  typia.assert(brandB);

  // 4. Create a category tree as catalog prerequisite.
  const categoryTreeBody = {
    code: `main-${RandomGenerator.alphaNumeric(6)}`,
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

  // 5. Register a seller and obtain seller context.
  const sellerJoinBody = {
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(12),
    storeName: `Seller ${RandomGenerator.name(1)}`,
    contactPhone: RandomGenerator.mobile(),
  } satisfies IShoppingMallSellerJoin.IRequest;

  const sellerAuthorized: IShoppingMallSeller.IAuthorized =
    await api.functional.auth.seller.join(connection, {
      body: sellerJoinBody,
    });
  typia.assert(sellerAuthorized);

  const sellerId: string & tags.Format<"uuid"> = sellerAuthorized.id;

  // 6. Seller creates several products associated with Brand A.
  const sellerProductCount = 3;
  const sellerProducts: IShoppingMallProduct[] = [];

  for (let i = 0; i < sellerProductCount; i++) {
    const sellerProductBody = {
      shopping_mall_seller_id: sellerId,
      shopping_mall_brand_id: brandA.id,
      code: `SELLER-PROD-${RandomGenerator.alphaNumeric(10)}` as string &
        tags.MinLength<1>,
      name: `Seller Product ${i + 1} for Brand A`,
      short_description: RandomGenerator.paragraph({ sentences: 2 }),
      description: RandomGenerator.content({ paragraphs: 2 }),
      status: "active" as string & tags.MinLength<1>,
      is_multi_sku: false,
      primary_image_uri: undefined,
      additional_data: null,
    } satisfies IShoppingMallProduct.ICreate;

    const sellerProduct: IShoppingMallProduct =
      await api.functional.shoppingMall.seller.products.create(connection, {
        body: sellerProductBody,
      });
    typia.assert(sellerProduct);
    sellerProducts.push(sellerProduct);
  }

  // 7. As platform admin, create an additional product for Brand A
  //    to ensure cross-actor aggregation.
  const adminProductBody = {
    shopping_mall_seller_id: sellerId,
    shopping_mall_brand_id: brandA.id,
    code: `ADMIN-PROD-${RandomGenerator.alphaNumeric(10)}` as string &
      tags.MinLength<1>,
    name: "Admin Product for Brand A",
    short_description: RandomGenerator.paragraph({ sentences: 2 }),
    description: RandomGenerator.content({ paragraphs: 1 }),
    status: "active" as string & tags.MinLength<1>,
    is_multi_sku: false,
    primary_image_uri: undefined,
    additional_data: null,
  } satisfies IShoppingMallProduct.ICreate;

  const adminProduct: IShoppingMallProduct =
    await api.functional.shoppingMall.platformAdmin.products.create(
      connection,
      {
        body: adminProductBody,
      },
    );
  typia.assert(adminProduct);

  const totalBrandAProductsExpected = sellerProductCount + 1; // seller + admin

  // 8. Ensure we are under platform admin context for statistics
  //    (login again with admin credentials to be explicit).
  const adminLoginForStatsBody = {
    email: adminEmail,
    password: adminPassword,
    ip: null,
    href: "https://admin.localhost/dashboard",
    referrer: "https://admin.localhost/login",
  } satisfies IShoppingMallPlatformAdminLogin.IRequest;

  const adminForStats: IShoppingMallPlatformAdmin.IAuthorized =
    await api.functional.auth.platformAdmin.login(connection, {
      body: adminLoginForStatsBody,
    });
  typia.assert(adminForStats);

  // 9. Call statistics endpoint to retrieve per-brand product counts.
  const stats: IShoppingMallCatalogStatistics.IBrandProductCounts =
    await api.functional.shoppingMall.platformAdmin.catalog.statistics.brandProductCounts.index(
      connection,
    );
  typia.assert(stats);

  // 10. Assertions on Brand A entry.
  const brandAStats = stats.find((entry) => entry.brandId === brandA.id);

  TestValidator.predicate(
    "brandProductCounts should contain an entry for Brand A",
    brandAStats !== undefined,
  );

  if (brandAStats !== undefined) {
    TestValidator.equals(
      "Brand A productCount should equal total created products",
      brandAStats.productCount,
      totalBrandAProductsExpected,
    );
    TestValidator.equals(
      "Brand A stats brandName should match Brand A name",
      brandAStats.brandName,
      brandA.name,
    );
  }

  // 11. Assertions on Brand B behavior (zero products).
  const brandBStats = stats.find((entry) => entry.brandId === brandB.id);

  const brandBHasEntry = brandBStats !== undefined;
  TestValidator.predicate(
    "Brand B either appears with zero count or is omitted",
    !brandBHasEntry ||
      (brandBStats !== undefined && brandBStats.productCount === 0),
  );
}
