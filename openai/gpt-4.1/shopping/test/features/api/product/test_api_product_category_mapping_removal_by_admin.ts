import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdmin";
import type { IShoppingMallCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCategory";
import type { IShoppingMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProduct";
import type { IShoppingMallProductsCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductsCategory";
import type { IShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSeller";

/**
 * Validate that admins can remove product-category mappings for any product via
 * admin endpoint. Steps:
 *
 * 1. Register a new admin to establish authorization.
 * 2. Create a new product as the admin.
 * 3. Assign (map) a random category to the product as admin.
 * 4. Remove (delete) the product-category mapping via the admin endpoint.
 * 5. Optionally, check idempotency and permission boundaries.
 */
export async function test_api_product_category_mapping_removal_by_admin(
  connection: api.IConnection,
) {
  // 1. Register and login as admin
  const adminEmail = typia.random<string & tags.Format<"email">>();
  const adminPassword = RandomGenerator.alphaNumeric(12);
  const admin = await api.functional.auth.admin.join(connection, {
    body: {
      email: adminEmail,
      password: adminPassword,
      name: RandomGenerator.name(),
    } satisfies IShoppingMallAdmin.ICreate,
  });
  typia.assert(admin);

  // 2. Create a product as admin
  const product = await api.functional.shoppingMall.products.create(
    connection,
    {
      body: {
        title: RandomGenerator.paragraph({ sentences: 3 }),
        description: RandomGenerator.content({ paragraphs: 2 }),
        default_price: 10000,
        business_status: "published",
      } satisfies IShoppingMallProduct.ICreate,
    },
  );
  typia.assert(product);

  // 3. Assign a product-category mapping (simulate random category id)
  const categoryId = typia.random<string & tags.Format<"uuid">>();
  const mapping =
    await api.functional.shoppingMall.admin.products.categories.create(
      connection,
      {
        productId: product.id,
        body: {
          shopping_mall_category_id: categoryId,
        } satisfies IShoppingMallProductsCategory.ICreate,
      },
    );
  typia.assert(mapping);

  // 4. Remove the mapping using admin endpoint
  await api.functional.shoppingMall.admin.products.categories.erase(
    connection,
    {
      productId: product.id,
      productCategoryId: mapping.id,
    },
  );

  // No specific status or fetch to verify deletion, but a second deletion attempt should fail (unauthorized/not-found)
  await TestValidator.error(
    "DELETE product-category mapping should fail after deletion",
    async () => {
      await api.functional.shoppingMall.admin.products.categories.erase(
        connection,
        {
          productId: product.id,
          productCategoryId: mapping.id,
        },
      );
    },
  );
}
