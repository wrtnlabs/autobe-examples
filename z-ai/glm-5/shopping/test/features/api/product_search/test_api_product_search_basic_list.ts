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

/**
 * Test basic product search functionality without any filters.
 *
 * Setup: Create an approved seller with multiple products across different
 * categories, each product having at least one variant with stock.
 *
 * Execute: Call the product search endpoint with no filters (default parameters).
 *
 * Validate: Response returns a paginated list of products with correct
 * structure (id, name, base_price, category, seller, primary_image, created_at).
 * Verify products are sorted by created_at descending by default.
 */
export async function test_api_product_search_basic_list(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create administrator for category creation
  const adminConnection: api.IConnection = { host: connection.host };
  const admin = await authorize_administrator_join(adminConnection, {});
  typia.assert(admin);
  // 2. Create parent category and subcategory
  const parentCategory =
    await generate_random_shopping_mall_administrator_categories_create(
      adminConnection,
      {
        body: {
          name: `Electronics_${RandomGenerator.alphabets(8)}`,
          description: "Electronic devices and accessories",
        },
      },
    );
  typia.assert(parentCategory);
  const subcategory =
    await generate_random_shopping_mall_administrator_categories_subcategories_create(
      adminConnection,
      {
        params: { categoryId: parentCategory.id },
        body: {
          name: `Smartphones_${RandomGenerator.alphabets(8)}`,
          description: "Mobile phones and smartphones",
        },
      },
    );
  typia.assert(subcategory);
  // 3. Create another parent category for variety
  const secondCategory =
    await generate_random_shopping_mall_administrator_categories_create(
      adminConnection,
      {
        body: {
          name: `Clothing_${RandomGenerator.alphabets(8)}`,
          description: "Apparel and fashion items",
        },
      },
    );
  typia.assert(secondCategory);
  // 4. Create seller account
  const sellerConnection: api.IConnection = { host: connection.host };
  const seller = await authorize_seller_join(sellerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      shopName: `TestShop_${RandomGenerator.alphabets(6)}`,
      shopDescription: "Test shop for product search",
      href: "https://test.example.com",
      referrer: "https://test.example.com",
    },
  });
  typia.assert(seller);
  // 5. Create products in different categories
  const product1 =
    await generate_random_shopping_mall_seller_seller_products_create(
      sellerConnection,
      {
        body: {
          name: `Product_Electronics_${RandomGenerator.alphabets(8)}`,
          description: RandomGenerator.content({ paragraphs: 2 }),
          categoryId: subcategory.id,
          basePrice: typia.random<
            number & tags.Minimum<100> & tags.Maximum<10000>
          >(),
        },
      },
    );
  typia.assert(product1);
  const product2 =
    await generate_random_shopping_mall_seller_seller_products_create(
      sellerConnection,
      {
        body: {
          name: `Product_Clothing_${RandomGenerator.alphabets(8)}`,
          description: RandomGenerator.content({ paragraphs: 2 }),
          categoryId: secondCategory.id,
          basePrice: typia.random<
            number & tags.Minimum<50> & tags.Maximum<5000>
          >(),
        },
      },
    );
  typia.assert(product2);
  // 6. Add inventory to product variants (use first variant from each product)
  const variant1 = product1.variants[0];
  if (variant1) {
    const inventory1 =
      await generate_random_shopping_mall_seller_variants_inventory_adjust(
        sellerConnection,
        {
          params: { variantId: variant1.id },
          body: {
            quantity_change: typia.random<
              number & tags.Type<"int32"> & tags.Minimum<10> & tags.Maximum<100>
            >(),
            reason: "Initial stock for testing",
          },
        },
      );
    typia.assert(inventory1);
  }
  const variant2 = product2.variants[0];
  if (variant2) {
    const inventory2 =
      await generate_random_shopping_mall_seller_variants_inventory_adjust(
        sellerConnection,
        {
          params: { variantId: variant2.id },
          body: {
            quantity_change: typia.random<
              number & tags.Type<"int32"> & tags.Minimum<10> & tags.Maximum<100>
            >(),
            reason: "Initial stock for testing",
          },
        },
      );
    typia.assert(inventory2);
  }
  // 7. Execute product search with no filters (default parameters)
  const searchResult = await api.functional.shoppingMall.products.index(
    connection,
    {
      body: {} satisfies IShoppingMallProduct.IRequest,
    },
  );
  typia.assert(searchResult);
  // 8. Validate pagination structure
  TestValidator.predicate(
    "pagination exists",
    () =>
      searchResult.pagination !== null && searchResult.pagination !== undefined,
  );
  TestValidator.predicate(
    "pagination has current page",
    () => searchResult.pagination.current >= 1,
  );
  TestValidator.predicate(
    "pagination has limit",
    () => searchResult.pagination.limit > 0,
  );
  TestValidator.predicate(
    "pagination has records",
    () => searchResult.pagination.records >= 0,
  );
  TestValidator.predicate(
    "pagination has pages",
    () => searchResult.pagination.pages >= 0,
  );
  // 9. Validate data array structure
  TestValidator.predicate("data is array", () =>
    Array.isArray(searchResult.data),
  );
  // 10. Validate each product has required fields
  for (const product of searchResult.data) {
    typia.assert<IShoppingMallProduct.ISummary>(product);
    // Validate category summary
    typia.assert<IShoppingMallCategory.ISummary>(product.category);
    // Validate seller summary
    typia.assert<IShoppingMallSeller.ISummary>(product.seller);
  }
  // 11. Verify products are sorted by created_at descending (default)
  if (searchResult.data.length >= 2) {
    for (let i = 0; i < searchResult.data.length - 1; i++) {
      const currentDate = new Date(searchResult.data[i].created_at);
      const nextDate = new Date(searchResult.data[i + 1].created_at);
      TestValidator.predicate(
        `product ${i} created_at >= product ${i + 1} created_at (descending order)`,
        () => currentDate >= nextDate,
      );
    }
  }
  // 12. Verify our created products appear in results (if data available)
  if (searchResult.data.length > 0) {
    const productIds = searchResult.data.map((p) => p.id);
    TestValidator.predicate(
      "created products appear in search results",
      () =>
        productIds.includes(product1.id) || productIds.includes(product2.id),
    );
  }
}
