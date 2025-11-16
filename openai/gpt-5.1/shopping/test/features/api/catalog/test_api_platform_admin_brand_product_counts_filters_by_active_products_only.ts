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
 * Validate that brand-level product count statistics include only active
 * products.
 *
 * ## Business intent
 *
 * Platform admins rely on the brandProductCounts analytics endpoint to see how
 * many products a brand actually has live in the catalog. Draft, inactive, or
 * otherwise non-countable products must not inflate these counts. This test
 * sets up a controlled dataset where a single brand owns a small set of
 * products with mixed lifecycle statuses, then verifies that the aggregated
 * productCount for that brand matches only the active (countable) products.
 *
 * ## High-level flow
 *
 * 1. Register a platform admin and obtain an authorized session.
 * 2. As platform admin, create a category tree (for realism, even if the
 *    aggregation does not depend on it directly).
 * 3. As platform admin, create a brand that will act as the aggregation key.
 * 4. Register a seller and obtain a seller session.
 * 5. As seller, create multiple products for the same brand with mixed statuses,
 *    e.g. one `active` product and one `draft` product.
 * 6. Optionally, as platform admin, create an additional product for the same
 *    brand with a non-active status (e.g. `inactive`) to ensure that products
 *    created via different actor flows are all subject to the same counting
 *    rules.
 * 7. As platform admin, call the brandProductCounts statistics endpoint.
 * 8. Find the row corresponding to the created brand and assert that its
 *    productCount equals the number of active products created in steps 5 and
 *    6, and does not include draft/inactive products.
 *
 * ## Implementation notes
 *
 * - Authentication: Use the provided /auth/platformAdmin/join and
 *   /auth/seller/join endpoints to create accounts; the join endpoints already
 *   return authorized sessions and set Authorization header via the SDK, so
 *   separate login calls are not strictly required unless we explicitly want to
 *   test login flows. For this scenario, using join alone is sufficient for
 *   each actor and keeps the test concise.
 * - Data generation: Use RandomGenerator and typia.random with appropriate tags
 *   (e.g., email, uri) to generate realistic values. For product status, choose
 *   explicit string literals like "active", "draft", and "inactive" to make
 *   expectations deterministic.
 * - Counting logic: Track how many products we create per status for the test
 *   brand in local variables so that we have an exact expectedActiveCount to
 *   compare with the response. In this test, we will create exactly two active
 *   products and two non-active products to make assertions simple and stable.
 * - Matching the brand: The statistics rows include brandId, brandCode,
 *   brandName, and productCount. We will match on brandId (UUID string) that
 *   comes from the IShoppingMallBrand response, and also optionally compare
 *   brandName for extra safety.
 * - Error handling: We do not intentionally trigger any error responses or type
 *   validation failures; all created DTOs must fully satisfy their schemas and
 *   business expectations.
 */
export async function test_api_platform_admin_brand_product_counts_filters_by_active_products_only(
  connection: api.IConnection,
) {
  // 1. Register platform admin (also authenticates and sets Authorization header)
  const platformAdminJoinBody = {
    email: typia.random<string & tags.Format<"email">>(),
    name: RandomGenerator.name(),
    password: RandomGenerator.alphaNumeric(12),
    ip: null,
    href: "https://admin.test.local/join",
    referrer: "https://admin.test.local/landing",
  } satisfies IShoppingMallPlatformAdminJoin.IRequest;

  const platformAdmin: IShoppingMallPlatformAdmin.IAuthorized =
    await api.functional.auth.platformAdmin.join(connection, {
      body: platformAdminJoinBody,
    });
  typia.assert(platformAdmin);

  // 2. Create a category tree for realism
  const categoryTreeBody = {
    code: `tree-${RandomGenerator.alphaNumeric(8)}`,
    name: "Main Catalog Tree",
    description: RandomGenerator.paragraph({ sentences: 5 }),
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

  // 3. Create a brand that will be the aggregation target
  const brandBody = {
    name: `Brand-${RandomGenerator.alphabets(6)}`,
    slug: `brand-${RandomGenerator.alphaNumeric(10)}`,
    description: RandomGenerator.paragraph({ sentences: 3 }),
    logo_uri: "https://cdn.test.local/logo.png",
  } satisfies IShoppingMallBrand.ICreate;

  const brand: IShoppingMallBrand =
    await api.functional.shoppingMall.platformAdmin.brands.create(connection, {
      body: brandBody,
    });
  typia.assert(brand);

  // 4. Register a seller (authorized session)
  const sellerJoinBody = {
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(12),
    storeName: `Store-${RandomGenerator.alphabets(6)}`,
    contactPhone: RandomGenerator.mobile(),
  } satisfies IShoppingMallSellerJoin.IRequest;

  const sellerAuthorized: IShoppingMallSeller.IAuthorized =
    await api.functional.auth.seller.join(connection, {
      body: sellerJoinBody,
    });
  typia.assert(sellerAuthorized);

  const sellerId = sellerAuthorized.id;

  // 5. As seller, create multiple products for the same brand with mixed statuses
  // First, ensure connection is authenticated as seller by logging in explicitly
  const sellerLoginBody = {
    email: sellerJoinBody.email,
    password: sellerJoinBody.password,
    ip: null,
    href: "https://seller.test.local/login",
    referrer: "https://seller.test.local/landing",
  } satisfies IShoppingMallSellerLogin.IRequest;

  const sellerLogin: IShoppingMallSeller.IAuthorized =
    await api.functional.auth.seller.login(connection, {
      body: sellerLoginBody,
    });
  typia.assert(sellerLogin);

  // Active product 1 (seller-owned)
  const sellerActiveProductBody1 = {
    shopping_mall_seller_id: sellerId,
    shopping_mall_brand_id: brand.id,
    code: `prod-active-1-${RandomGenerator.alphaNumeric(6)}`,
    name: "Active Product 1",
    short_description: RandomGenerator.paragraph({ sentences: 3 }),
    description: RandomGenerator.content({ paragraphs: 2 }),
    status: "active",
    is_multi_sku: false,
    primary_image_uri: "https://cdn.test.local/product1.png",
    additional_data: null,
  } satisfies IShoppingMallProduct.ICreate;

  const sellerActiveProduct1: IShoppingMallProduct =
    await api.functional.shoppingMall.seller.products.create(connection, {
      body: sellerActiveProductBody1,
    });
  typia.assert(sellerActiveProduct1);

  // Non-active (draft) product (seller-owned)
  const sellerDraftProductBody = {
    shopping_mall_seller_id: sellerId,
    shopping_mall_brand_id: brand.id,
    code: `prod-draft-1-${RandomGenerator.alphaNumeric(6)}`,
    name: "Draft Product 1",
    short_description: RandomGenerator.paragraph({ sentences: 2 }),
    description: RandomGenerator.content({ paragraphs: 1 }),
    status: "draft",
    is_multi_sku: false,
    primary_image_uri: "https://cdn.test.local/product2.png",
    additional_data: null,
  } satisfies IShoppingMallProduct.ICreate;

  const sellerDraftProduct: IShoppingMallProduct =
    await api.functional.shoppingMall.seller.products.create(connection, {
      body: sellerDraftProductBody,
    });
  typia.assert(sellerDraftProduct);

  // Active product 2 (seller-owned)
  const sellerActiveProductBody2 = {
    shopping_mall_seller_id: sellerId,
    shopping_mall_brand_id: brand.id,
    code: `prod-active-2-${RandomGenerator.alphaNumeric(6)}`,
    name: "Active Product 2",
    short_description: RandomGenerator.paragraph({ sentences: 3 }),
    description: RandomGenerator.content({ paragraphs: 2 }),
    status: "active",
    is_multi_sku: true,
    primary_image_uri: "https://cdn.test.local/product3.png",
    additional_data: null,
  } satisfies IShoppingMallProduct.ICreate;

  const sellerActiveProduct2: IShoppingMallProduct =
    await api.functional.shoppingMall.seller.products.create(connection, {
      body: sellerActiveProductBody2,
    });
  typia.assert(sellerActiveProduct2);

  // 6. Optionally, as platform admin, create a non-active product for same brand
  // Switch back to platform admin by logging in as admin
  const adminLoginBody = {
    email: platformAdminJoinBody.email,
    password: platformAdminJoinBody.password,
    ip: null,
    href: "https://admin.test.local/login",
    referrer: "https://admin.test.local/landing",
  } satisfies IShoppingMallPlatformAdminLogin.IRequest;

  const adminLogin: IShoppingMallPlatformAdmin.IAuthorized =
    await api.functional.auth.platformAdmin.login(connection, {
      body: adminLoginBody,
    });
  typia.assert(adminLogin);

  // Admin creates a non-active product for the same brand
  const adminNonActiveProductBody = {
    shopping_mall_seller_id: sellerId,
    shopping_mall_brand_id: brand.id,
    code: `prod-inactive-1-${RandomGenerator.alphaNumeric(6)}`,
    name: "Inactive Product 1",
    short_description: RandomGenerator.paragraph({ sentences: 2 }),
    description: RandomGenerator.content({ paragraphs: 1 }),
    status: "inactive",
    is_multi_sku: false,
    primary_image_uri: "https://cdn.test.local/product4.png",
    additional_data: null,
  } satisfies IShoppingMallProduct.ICreate;

  const adminNonActiveProduct: IShoppingMallProduct =
    await api.functional.shoppingMall.platformAdmin.products.create(
      connection,
      {
        body: adminNonActiveProductBody,
      },
    );
  typia.assert(adminNonActiveProduct);

  // We have now:
  // - 2 active products for the brand (sellerActiveProduct1, sellerActiveProduct2)
  // - 2 non-active products (sellerDraftProduct with status "draft", adminNonActiveProduct with status "inactive")
  const expectedActiveCount = 2;

  // 7. As platform admin, call the brandProductCounts statistics endpoint
  const stats: IShoppingMallCatalogStatistics.IBrandProductCounts =
    await api.functional.shoppingMall.platformAdmin.catalog.statistics.brandProductCounts.index(
      connection,
    );
  typia.assert(stats);

  // 8. Find the row for our brand and validate productCount
  const brandStats = stats.find((row) => row.brandId === brand.id);

  // Ensure that some statistics row exists for our brand
  TestValidator.predicate(
    "statistics must contain a row for the created brand",
    !!brandStats,
  );

  if (!brandStats) return;

  // Additional sanity checks on brand identity in the stats
  TestValidator.equals(
    "brand name in stats should match created brand name",
    brandStats.brandName,
    brand.name,
  );

  // Core assertion: productCount equals only the number of active products
  TestValidator.equals(
    "brand productCount counts only active products",
    brandStats.productCount,
    expectedActiveCount,
  );
}
