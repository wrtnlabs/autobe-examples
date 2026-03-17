import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIShoppingMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallProduct";
import type { IShoppingMallAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdministrator";
import type { IShoppingMallAdministratorPasswordReset } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdministratorPasswordReset";
import type { IShoppingMallCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCategory";
import type { IShoppingMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomer";
import type { IShoppingMallInventoryRecord } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallInventoryRecord";
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
import { generate_random_shopping_mall_seller_variants_inventory_adjust } from "../../../generate/generate_random_shopping_mall_seller_variants_inventory_adjust";
import { prepare_random_shopping_mall_category } from "../../../prepare/prepare_random_shopping_mall_category";
import { prepare_random_shopping_mall_inventory_record } from "../../../prepare/prepare_random_shopping_mall_inventory_record";
import { prepare_random_shopping_mall_product } from "../../../prepare/prepare_random_shopping_mall_product";

export async function test_api_product_search_category_filter_with_subcategories(
  connection: api.IConnection,
): Promise<void> {
  // 1. Administrator setup
  const adminConnection: api.IConnection = { host: connection.host };
  const adminAuth = await authorize_administrator_join(adminConnection, {});
  typia.assert(adminAuth);
  // 2. Create parent category
  const parentCategory =
    await generate_random_shopping_mall_administrator_categories_create(
      adminConnection,
      {
        body: {
          name: `Electronics_${RandomGenerator.alphabets(8)}`,
          description: "Parent category for electronics",
        },
      },
    );
  typia.assert(parentCategory);
  // 3. Create subcategories under parent
  const subcategory1 =
    await generate_random_shopping_mall_administrator_categories_subcategories_create(
      adminConnection,
      {
        params: { categoryId: parentCategory.id },
        body: {
          name: `Phones_${RandomGenerator.alphabets(8)}`,
          description: "Mobile phones subcategory",
        },
      },
    );
  typia.assert(subcategory1);
  const subcategory2 =
    await generate_random_shopping_mall_administrator_categories_subcategories_create(
      adminConnection,
      {
        params: { categoryId: parentCategory.id },
        body: {
          name: `Tablets_${RandomGenerator.alphabets(8)}`,
          description: "Tablets subcategory",
        },
      },
    );
  typia.assert(subcategory2);
  // 4. Seller setup
  const sellerConnection: api.IConnection = { host: connection.host };
  const sellerAuth = await authorize_seller_join(sellerConnection, {});
  typia.assert(sellerAuth);
  // 5. Create product in parent category
  const productInParent =
    await generate_random_shopping_mall_seller_seller_products_create(
      sellerConnection,
      {
        body: {
          name: `Parent_Category_Product_${RandomGenerator.alphabets(6)}`,
          description: RandomGenerator.paragraph({ sentences: 3 }),
          categoryId: parentCategory.id,
          basePrice: typia.random<number & tags.Minimum<100>>(),
        },
      },
    );
  typia.assert(productInParent);
  // 6. Create product in first subcategory
  const productInSubcategory1 =
    await generate_random_shopping_mall_seller_seller_products_create(
      sellerConnection,
      {
        body: {
          name: `Phones_Product_${RandomGenerator.alphabets(6)}`,
          description: RandomGenerator.paragraph({ sentences: 3 }),
          categoryId: subcategory1.id,
          basePrice: typia.random<number & tags.Minimum<100>>(),
        },
      },
    );
  typia.assert(productInSubcategory1);
  // 7. Create product in second subcategory
  const productInSubcategory2 =
    await generate_random_shopping_mall_seller_seller_products_create(
      sellerConnection,
      {
        body: {
          name: `Tablets_Product_${RandomGenerator.alphabets(6)}`,
          description: RandomGenerator.paragraph({ sentences: 3 }),
          categoryId: subcategory2.id,
          basePrice: typia.random<number & tags.Minimum<100>>(),
        },
      },
    );
  typia.assert(productInSubcategory2);
  // 8. Add inventory to all product variants to ensure products are searchable
  const allProducts = [
    productInParent,
    productInSubcategory1,
    productInSubcategory2,
  ];
  await ArrayUtil.asyncForEach(allProducts, async (product) => {
    await ArrayUtil.asyncForEach(product.variants, async (variant) => {
      await generate_random_shopping_mall_seller_variants_inventory_adjust(
        sellerConnection,
        {
          params: { variantId: variant.id },
          body: {
            quantity_change: 100,
            reason: "Initial stock for testing",
          },
        },
      );
    });
  });
  // 9. Search by parent category - should include all products from parent and subcategories
  const parentSearchResult = await api.functional.shoppingMall.products.index(
    connection,
    {
      body: {
        categoryId: parentCategory.id,
      } satisfies IShoppingMallProduct.IRequest,
    },
  );
  typia.assert(parentSearchResult);
  const parentSearchIds = parentSearchResult.data.map((p) => p.id);
  TestValidator.predicate(
    "Parent category search includes parent category product",
    parentSearchIds.includes(productInParent.id),
  );
  TestValidator.predicate(
    "Parent category search includes subcategory1 product",
    parentSearchIds.includes(productInSubcategory1.id),
  );
  TestValidator.predicate(
    "Parent category search includes subcategory2 product",
    parentSearchIds.includes(productInSubcategory2.id),
  );
  // 10. Search by subcategory1 - should only include subcategory1 product
  const subcategory1SearchResult =
    await api.functional.shoppingMall.products.index(connection, {
      body: {
        categoryId: subcategory1.id,
      } satisfies IShoppingMallProduct.IRequest,
    });
  typia.assert(subcategory1SearchResult);
  const subcategory1SearchIds = subcategory1SearchResult.data.map((p) => p.id);
  TestValidator.predicate(
    "Subcategory1 search includes subcategory1 product",
    subcategory1SearchIds.includes(productInSubcategory1.id),
  );
  TestValidator.predicate(
    "Subcategory1 search excludes parent category product",
    !subcategory1SearchIds.includes(productInParent.id),
  );
  TestValidator.predicate(
    "Subcategory1 search excludes subcategory2 product",
    !subcategory1SearchIds.includes(productInSubcategory2.id),
  );
  // 11. Search by subcategory2 - should only include subcategory2 product
  const subcategory2SearchResult =
    await api.functional.shoppingMall.products.index(connection, {
      body: {
        categoryId: subcategory2.id,
      } satisfies IShoppingMallProduct.IRequest,
    });
  typia.assert(subcategory2SearchResult);
  const subcategory2SearchIds = subcategory2SearchResult.data.map((p) => p.id);
  TestValidator.predicate(
    "Subcategory2 search includes subcategory2 product",
    subcategory2SearchIds.includes(productInSubcategory2.id),
  );
  TestValidator.predicate(
    "Subcategory2 search excludes parent category product",
    !subcategory2SearchIds.includes(productInParent.id),
  );
  TestValidator.predicate(
    "Subcategory2 search excludes subcategory1 product",
    !subcategory2SearchIds.includes(productInSubcategory1.id),
  );
}
