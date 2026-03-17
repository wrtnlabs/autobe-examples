import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIShoppingMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallProduct";
import type { IShoppingMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdmin";
import type { IShoppingMallAdminOfCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdminOfCustomer";
import type { IShoppingMallAdminOfSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdminOfSeller";
import type { IShoppingMallCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCategory";
import type { IShoppingMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomer";
import type { IShoppingMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProduct";
import type { IShoppingMallProductImage } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductImage";
import type { IShoppingMallProductVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductVariant";
import type { IShoppingMallProductVariantOption } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductVariantOption";
import type { IShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSeller";
import type { IShoppingMallSellerApproval } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSellerApproval";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";
import { authorize_seller_join } from "../../../authorize/authorize_seller_join";
import { authorize_seller_login } from "../../../authorize/authorize_seller_login";
import { authorize_seller_refresh } from "../../../authorize/authorize_seller_refresh";
import { generate_random_shopping_mall_admin_categories_create } from "../../../generate/generate_random_shopping_mall_admin_categories_create";
import { generate_random_shopping_mall_seller_products_create } from "../../../generate/generate_random_shopping_mall_seller_products_create";
import { prepare_random_shopping_mall_category } from "../../../prepare/prepare_random_shopping_mall_category";
import { prepare_random_shopping_mall_product } from "../../../prepare/prepare_random_shopping_mall_product";
import { prepare_random_shopping_mall_product_image } from "../../../prepare/prepare_random_shopping_mall_product_image";
import { prepare_random_shopping_mall_product_variant } from "../../../prepare/prepare_random_shopping_mall_product_variant";

export async function test_api_product_search_category_filter_includes_subcategories(
  connection: api.IConnection,
): Promise<void> {
  // =====================================================
  // 1. Setup: Admin account
  // =====================================================
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_admin_join(adminConnection, {});
  // =====================================================
  // 2. Setup: Seller account
  // =====================================================
  const sellerConnection: api.IConnection = { host: connection.host };
  await authorize_seller_join(sellerConnection, {});
  // =====================================================
  // 3. Admin creates top-level category: Electronics
  // =====================================================
  const electronicsCategory =
    await generate_random_shopping_mall_admin_categories_create(
      adminConnection,
      {
        body: {
          name: "Electronics-" + RandomGenerator.alphaNumeric(8),
          description: "Top-level electronics category",
        },
      },
    );
  typia.assert(electronicsCategory);
  // =====================================================
  // 4. Admin creates subcategory: Smartphones under Electronics
  // =====================================================
  const smartphonesCategory =
    await generate_random_shopping_mall_admin_categories_create(
      adminConnection,
      {
        body: {
          parent_id: electronicsCategory.id,
          name: "Smartphones-" + RandomGenerator.alphaNumeric(8),
          description: "Smartphones subcategory under Electronics",
        },
      },
    );
  typia.assert(smartphonesCategory);
  // =====================================================
  // 5. Admin creates an unrelated category: Books (for isolation)
  // =====================================================
  const booksCategory =
    await generate_random_shopping_mall_admin_categories_create(
      adminConnection,
      {
        body: {
          name: "Books-" + RandomGenerator.alphaNumeric(8),
          description: "Books category for isolation test",
        },
      },
    );
  typia.assert(booksCategory);
  // =====================================================
  // 6. Seller creates Product A (assigned to Electronics - top-level)
  // =====================================================
  const productA = await generate_random_shopping_mall_seller_products_create(
    sellerConnection,
    {
      body: {
        categoryId: electronicsCategory.id,
        name: "ProductA-Electronics-" + RandomGenerator.alphaNumeric(8),
        description: "A product in the top-level Electronics category",
        base_price: 100,
      },
    },
  );
  typia.assert(productA);
  // =====================================================
  // 7. Seller creates Product B (assigned to Smartphones - subcategory)
  // =====================================================
  const productB = await generate_random_shopping_mall_seller_products_create(
    sellerConnection,
    {
      body: {
        categoryId: smartphonesCategory.id,
        name: "ProductB-Smartphones-" + RandomGenerator.alphaNumeric(8),
        description: "A product in the Smartphones subcategory",
        base_price: 200,
      },
    },
  );
  typia.assert(productB);
  // =====================================================
  // 8. Seller creates Product C (assigned to Books - different category)
  // =====================================================
  const productC = await generate_random_shopping_mall_seller_products_create(
    sellerConnection,
    {
      body: {
        categoryId: booksCategory.id,
        name: "ProductC-Books-" + RandomGenerator.alphaNumeric(8),
        description: "A product in the unrelated Books category",
        base_price: 50,
      },
    },
  );
  typia.assert(productC);
  // Use a public (unauthenticated) connection for product search
  const publicConnection: api.IConnection = { host: connection.host };
  // =====================================================
  // Test Case 1: Filter by top-level Electronics category
  // Business rule: Should include Product A (direct) + Product B (subcategory)
  // Should NOT include Product C (Books - different category)
  // =====================================================
  const resultByElectronics = await api.functional.shoppingMall.products.index(
    publicConnection,
    {
      body: {
        categoryId: electronicsCategory.id,
      } satisfies IShoppingMallProduct.IRequest,
    },
  );
  typia.assert(resultByElectronics);
  TestValidator.predicate(
    "Product A (Electronics direct) appears when filtering by Electronics",
    () => resultByElectronics.data.some((p) => p.id === productA.id),
  );
  TestValidator.predicate(
    "Product B (Smartphones subcategory) appears when filtering by parent Electronics",
    () => resultByElectronics.data.some((p) => p.id === productB.id),
  );
  TestValidator.predicate(
    "Product C (Books) does NOT appear when filtering by Electronics",
    () => !resultByElectronics.data.some((p) => p.id === productC.id),
  );
  TestValidator.equals(
    "Electronics category filter returns exactly 2 matching records",
    resultByElectronics.pagination.records,
    2,
  );
  // =====================================================
  // Test Case 2: Filter by subcategory (Smartphones)
  // Business rule: Only Product B (direct), NOT Product A (parent category)
  // =====================================================
  const resultBySmartphones = await api.functional.shoppingMall.products.index(
    publicConnection,
    {
      body: {
        categoryId: smartphonesCategory.id,
      } satisfies IShoppingMallProduct.IRequest,
    },
  );
  typia.assert(resultBySmartphones);
  TestValidator.predicate(
    "Product B (Smartphones direct) appears when filtering by Smartphones subcategory",
    () => resultBySmartphones.data.some((p) => p.id === productB.id),
  );
  TestValidator.predicate(
    "Product A (Electronics parent) does NOT appear when filtering by Smartphones subcategory",
    () => !resultBySmartphones.data.some((p) => p.id === productA.id),
  );
  TestValidator.equals(
    "Smartphones subcategory filter returns exactly 1 matching record",
    resultBySmartphones.pagination.records,
    1,
  );
  // =====================================================
  // Test Case 3: Filter by non-existent categoryId
  // Business rule: Should return empty results gracefully (no error)
  // =====================================================
  const nonExistentCategoryId = typia.random<string & tags.Format<"uuid">>();
  const resultByNonExistent = await api.functional.shoppingMall.products.index(
    publicConnection,
    {
      body: {
        categoryId: nonExistentCategoryId,
      } satisfies IShoppingMallProduct.IRequest,
    },
  );
  typia.assert(resultByNonExistent);
  TestValidator.equals(
    "Non-existent category returns empty data array",
    resultByNonExistent.data.length,
    0,
  );
  TestValidator.equals(
    "Non-existent category returns 0 in pagination records",
    resultByNonExistent.pagination.records,
    0,
  );
}
