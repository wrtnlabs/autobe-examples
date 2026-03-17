import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIShoppingMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallProduct";
import type { IShoppingMallAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdministrator";
import type { IShoppingMallCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCategory";
import type { IShoppingMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProduct";
import type { IShoppingMallProductImage } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductImage";
import type { IShoppingMallProductVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductVariant";
import type { IShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSeller";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_administrator_join } from "../../../authorize/authorize_administrator_join";
import { authorize_administrator_login } from "../../../authorize/authorize_administrator_login";
import { authorize_administrator_refresh } from "../../../authorize/authorize_administrator_refresh";
import { authorize_seller_join } from "../../../authorize/authorize_seller_join";
import { authorize_seller_login } from "../../../authorize/authorize_seller_login";
import { authorize_seller_refresh } from "../../../authorize/authorize_seller_refresh";
import { generate_random_shopping_mall_administrator_categories_create } from "../../../generate/generate_random_shopping_mall_administrator_categories_create";
import { generate_random_shopping_mall_administrator_categories_subcategories_create } from "../../../generate/generate_random_shopping_mall_administrator_categories_subcategories_create";
import { generate_random_shopping_mall_seller_seller_products_create } from "../../../generate/generate_random_shopping_mall_seller_seller_products_create";
import { prepare_random_shopping_mall_category } from "../../../prepare/prepare_random_shopping_mall_category";
import { prepare_random_shopping_mall_product } from "../../../prepare/prepare_random_shopping_mall_product";

/**
 * Test category hierarchy filtering in product search.
 *
 * Validates that:
 * - Parent category filter includes products from parent AND all subcategories
 * - Subcategory filter includes only products in that specific subcategory
 * - Category hierarchy query correctly expands parent_id to include child categories
 */
export async function test_api_product_search_category_hierarchy_filter(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create administrator account and authenticate
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_administrator_join(adminConnection, {});
  // 2. Create parent category 'Electronics'
  const parentCategory =
    await generate_random_shopping_mall_administrator_categories_create(
      adminConnection,
      {
        body: {
          name: `Electronics_${RandomGenerator.alphaNumeric(8)}`,
          description: "Electronic devices and accessories",
        },
      },
    );
  typia.assert(parentCategory);
  // 3. Create subcategory 'Smartphones' under Electronics
  const subcategory1 =
    await generate_random_shopping_mall_administrator_categories_subcategories_create(
      adminConnection,
      {
        params: { categoryId: parentCategory.id },
        body: {
          name: `Smartphones_${RandomGenerator.alphaNumeric(8)}`,
          description: "Mobile phones and smartphones",
        },
      },
    );
  typia.assert(subcategory1);
  // 4. Create subcategory 'Tablets' under Electronics
  const subcategory2 =
    await generate_random_shopping_mall_administrator_categories_subcategories_create(
      adminConnection,
      {
        params: { categoryId: parentCategory.id },
        body: {
          name: `Tablets_${RandomGenerator.alphaNumeric(8)}`,
          description: "Tablet computers",
        },
      },
    );
  typia.assert(subcategory2);
  // 5. Create seller account (approved by default in test environment)
  const sellerConnection: api.IConnection = { host: connection.host };
  const sellerAuth = await authorize_seller_join(sellerConnection, {});
  typia.assert(sellerAuth);
  // 6. Create Product A in parent category 'Electronics'
  const productA =
    await generate_random_shopping_mall_seller_seller_products_create(
      sellerConnection,
      {
        body: {
          name: `Product_A_Electronics_${RandomGenerator.alphaNumeric(8)}`,
          description: RandomGenerator.paragraph({ sentences: 3 }),
          categoryId: parentCategory.id,
          basePrice: typia.random<
            number & tags.Minimum<100> & tags.Maximum<10000>
          >(),
        },
      },
    );
  typia.assert(productA);
  // 7. Create Product B in subcategory 'Smartphones'
  const productB =
    await generate_random_shopping_mall_seller_seller_products_create(
      sellerConnection,
      {
        body: {
          name: `Product_B_Smartphones_${RandomGenerator.alphaNumeric(8)}`,
          description: RandomGenerator.paragraph({ sentences: 3 }),
          categoryId: subcategory1.id,
          basePrice: typia.random<
            number & tags.Minimum<100> & tags.Maximum<10000>
          >(),
        },
      },
    );
  typia.assert(productB);
  // 8. Create Product C in subcategory 'Tablets'
  const productC =
    await generate_random_shopping_mall_seller_seller_products_create(
      sellerConnection,
      {
        body: {
          name: `Product_C_Tablets_${RandomGenerator.alphaNumeric(8)}`,
          description: RandomGenerator.paragraph({ sentences: 3 }),
          categoryId: subcategory2.id,
          basePrice: typia.random<
            number & tags.Minimum<100> & tags.Maximum<10000>
          >(),
        },
      },
    );
  typia.assert(productC);
  // 9. Test: Search with parent category filter - should return all 3 products
  const parentCategorySearch =
    await api.functional.shoppingMall.products.search.index(connection, {
      body: {
        categoryId: parentCategory.id,
        limit: 100,
      } satisfies IShoppingMallProduct.IRequest,
    });
  typia.assert(parentCategorySearch);
  // Validate: All 3 products appear in results
  const parentCategoryProductIds = parentCategorySearch.data.map((p) => p.id);
  TestValidator.predicate(
    "parent category search includes product from parent category",
    parentCategoryProductIds.includes(productA.id),
  );
  TestValidator.predicate(
    "parent category search includes product from first subcategory",
    parentCategoryProductIds.includes(productB.id),
  );
  TestValidator.predicate(
    "parent category search includes product from second subcategory",
    parentCategoryProductIds.includes(productC.id),
  );
  // 10. Test: Search with subcategory 'Smartphones' filter - should return only Product B
  const subcategorySearch1 =
    await api.functional.shoppingMall.products.search.index(connection, {
      body: {
        categoryId: subcategory1.id,
        limit: 100,
      } satisfies IShoppingMallProduct.IRequest,
    });
  typia.assert(subcategorySearch1);
  // Validate: Only Product B appears
  const subcategory1ProductIds = subcategorySearch1.data.map((p) => p.id);
  TestValidator.predicate(
    "subcategory search includes product from subcategory",
    subcategory1ProductIds.includes(productB.id),
  );
  TestValidator.predicate(
    "subcategory search excludes product from parent category",
    !subcategory1ProductIds.includes(productA.id),
  );
  TestValidator.predicate(
    "subcategory search excludes product from sibling subcategory",
    !subcategory1ProductIds.includes(productC.id),
  );
  // 11. Test: Search with subcategory 'Tablets' filter - should return only Product C
  const subcategorySearch2 =
    await api.functional.shoppingMall.products.search.index(connection, {
      body: {
        categoryId: subcategory2.id,
        limit: 100,
      } satisfies IShoppingMallProduct.IRequest,
    });
  typia.assert(subcategorySearch2);
  // Validate: Only Product C appears
  const subcategory2ProductIds = subcategorySearch2.data.map((p) => p.id);
  TestValidator.predicate(
    "subcategory search includes product from subcategory",
    subcategory2ProductIds.includes(productC.id),
  );
  TestValidator.predicate(
    "subcategory search excludes product from parent category",
    !subcategory2ProductIds.includes(productA.id),
  );
  TestValidator.predicate(
    "subcategory search excludes product from sibling subcategory",
    !subcategory2ProductIds.includes(productB.id),
  );
  // 12. Validate parent reference for products in subcategories
  const productBFromResults = parentCategorySearch.data.find(
    (p) => p.id === productB.id,
  );
  const productCFromResults = parentCategorySearch.data.find(
    (p) => p.id === productC.id,
  );
  if (
    productBFromResults !== undefined &&
    productBFromResults.category.parent !== null
  ) {
    TestValidator.equals(
      "product B category parent reference",
      productBFromResults.category.parent.id,
      parentCategory.id,
    );
  }
  if (
    productCFromResults !== undefined &&
    productCFromResults.category.parent !== null
  ) {
    TestValidator.equals(
      "product C category parent reference",
      productCFromResults.category.parent.id,
      parentCategory.id,
    );
  }
}
