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
 * Validate that platform admin can retrieve brand-level product counts
 * aggregating both seller-created and admin-created products.
 *
 * Business flow:
 *
 * 1. Register a platform admin (join) and obtain an authorized session.
 * 2. As admin, create a category tree (prerequisite catalog structure).
 * 3. As admin, create a brand with a unique slug to be used as aggregation key.
 * 4. Register a seller (join), switching the connection to seller context.
 * 5. As seller, create N active products for the created brand.
 * 6. Log back in as platform admin (login), switching the connection back.
 * 7. As admin, create M more active products for the same brand (via platformAdmin
 *    products API).
 * 8. As admin, call catalog statistics brandProductCounts index endpoint.
 * 9. Assert that the statistics array contains an entry for the brand and that
 *    productCount is at least N + M.
 */
export async function test_api_platform_admin_brand_product_counts_basic_flow(
  connection: api.IConnection,
) {
  // 1. Register platform admin (join) to establish admin auth context
  const adminJoinBody = {
    email: typia.random<string & tags.Format<"email">>(),
    name: RandomGenerator.name(),
    password: RandomGenerator.alphaNumeric(12),
    ip: null,
    href: "https://admin.example.com/join",
    referrer: "https://admin.example.com/",
  } satisfies IShoppingMallPlatformAdminJoin.IRequest;

  const adminAuthorized: IShoppingMallPlatformAdmin.IAuthorized =
    await api.functional.auth.platformAdmin.join(connection, {
      body: adminJoinBody,
    });
  typia.assert(adminAuthorized);

  // 2. As admin, create a category tree
  const categoryTreeBody = {
    code: `tree-${RandomGenerator.alphaNumeric(8)}`,
    name: RandomGenerator.name(),
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

  // 3. As admin, create a brand with unique slug
  const brandSlug = `brand-${RandomGenerator.alphaNumeric(8)}`;
  const brandBody = {
    name: RandomGenerator.name(2),
    slug: brandSlug,
    description: RandomGenerator.paragraph({ sentences: 3 }),
    logo_uri: "https://cdn.example.com/logo.png" as string & tags.Format<"uri">,
  } satisfies IShoppingMallBrand.ICreate;

  const brand: IShoppingMallBrand =
    await api.functional.shoppingMall.platformAdmin.brands.create(connection, {
      body: brandBody,
    });
  typia.assert(brand);

  // 4. Register a seller (join) - this switches Authorization to seller
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

  // 5. As seller, create N active products for the created brand
  const sellerProductCount = 2;
  const sellerProducts: IShoppingMallProduct[] = [];

  for (let i = 0; i < sellerProductCount; i++) {
    const productBody = {
      shopping_mall_seller_id: sellerId,
      shopping_mall_brand_id: brand.id,
      code: `SELLER-${RandomGenerator.alphaNumeric(10)}` as string &
        tags.MinLength<1>,
      name: RandomGenerator.name(3) as string & tags.MinLength<1>,
      short_description: RandomGenerator.paragraph({ sentences: 2 }),
      description: RandomGenerator.content({ paragraphs: 2 }),
      status: "active" as string & tags.MinLength<1>,
      is_multi_sku: false,
      primary_image_uri: "https://cdn.example.com/product.png" as string &
        tags.Format<"uri">,
      additional_data: null,
    } satisfies IShoppingMallProduct.ICreate;

    const product: IShoppingMallProduct =
      await api.functional.shoppingMall.seller.products.create(connection, {
        body: productBody,
      });
    typia.assert(product);
    sellerProducts.push(product);
  }

  // 6. Log back in as platform admin to restore admin Authorization context
  const adminLoginBody = {
    email: adminJoinBody.email,
    password: adminJoinBody.password,
    ip: null,
    href: "https://admin.example.com/login",
    referrer: "https://admin.example.com/",
  } satisfies IShoppingMallPlatformAdminLogin.IRequest;

  const adminAfterLogin: IShoppingMallPlatformAdmin.IAuthorized =
    await api.functional.auth.platformAdmin.login(connection, {
      body: adminLoginBody,
    });
  typia.assert(adminAfterLogin);

  // 7. As admin, create M more active products for the same brand using platformAdmin products API
  const adminProductCount = 3;
  const adminProducts: IShoppingMallProduct[] = [];

  for (let i = 0; i < adminProductCount; i++) {
    const adminProductBody = {
      shopping_mall_seller_id: sellerId,
      shopping_mall_brand_id: brand.id,
      code: `ADMIN-${RandomGenerator.alphaNumeric(10)}` as string &
        tags.MinLength<1>,
      name: RandomGenerator.name(3) as string & tags.MinLength<1>,
      short_description: RandomGenerator.paragraph({ sentences: 2 }),
      description: RandomGenerator.content({ paragraphs: 2 }),
      status: "active" as string & tags.MinLength<1>,
      is_multi_sku: false,
      primary_image_uri: "https://cdn.example.com/product-admin.png" as string &
        tags.Format<"uri">,
      additional_data: null,
    } satisfies IShoppingMallProduct.ICreate;

    const product: IShoppingMallProduct =
      await api.functional.shoppingMall.platformAdmin.products.create(
        connection,
        { body: adminProductBody },
      );
    typia.assert(product);
    adminProducts.push(product);
  }

  const totalExpectedCount = sellerProductCount + adminProductCount;

  // 8. As admin, call catalog statistics brandProductCounts index endpoint
  const stats: IShoppingMallCatalogStatistics.IBrandProductCounts =
    await api.functional.shoppingMall.platformAdmin.catalog.statistics.brandProductCounts.index(
      connection,
    );
  typia.assert(stats);

  // 9. Validate that stats is an array and contains entry for the created brand
  TestValidator.predicate(
    "brand product counts response must be a non-empty array",
    Array.isArray(stats) && stats.length >= 1,
  );

  const brandEntry = stats.find((entry) => entry.brandId === brand.id);

  TestValidator.predicate(
    "brand entry for created brand should exist in statistics",
    () => brandEntry !== undefined,
  );

  if (brandEntry) {
    const expectedMinCount = totalExpectedCount;

    TestValidator.predicate(
      "brand productCount should be >= total created products for that brand",
      brandEntry.productCount >= expectedMinCount,
    );

    TestValidator.equals(
      "brandName in statistics should match created brand name",
      brandEntry.brandName,
      brand.name,
    );
  }
}
