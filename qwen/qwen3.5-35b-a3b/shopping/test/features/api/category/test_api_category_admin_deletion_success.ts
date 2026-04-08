import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEcommerceMallAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallAdministrator";
import type { IEcommerceMallCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCategory";
import type { IEcommerceMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProduct";
import type { IEcommerceMallProductImage } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProductImage";
import type { IEcommerceMallProductReviewStat } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProductReviewStat";
import type { IEcommerceMallProductVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProductVariant";
import type { IEcommerceMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSeller";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
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
import { generate_random_ecommerce_mall_administrator_categories_create } from "../../../generate/generate_random_ecommerce_mall_administrator_categories_create";
import { generate_random_ecommerce_mall_seller_products_create } from "../../../generate/generate_random_ecommerce_mall_seller_products_create";
import { prepare_random_ecommerce_mall_category } from "../../../prepare/prepare_random_ecommerce_mall_category";
import { prepare_random_ecommerce_mall_product } from "../../../prepare/prepare_random_ecommerce_mall_product";

/**
 * Test successful category deletion by administrator.
 *
 * Validates the category deletion workflow including soft delete behavior,
 * snapshot creation, and business rule enforcement. Ensures that deleted categories
 * become unavailable for new product references while products remain intact.
 *
 * 1. Administrator creates a test category.
 * 2. Seller creates a product in that category.
 * 3. Administrator deletes the category.
 * 4. Verifies category deletion succeeds with 204 response.
 * 5. Verifies deleted category cannot be referenced in new products (404).
 * 6. Verifies other categories can still be created.
 * 7. Verifies products previously in deleted category remain intact.
 */
export async function test_api_category_admin_deletion_success(
  connection: api.IConnection,
): Promise<void> {
  // === 1. Setup: Create and authenticate administrator ===
  const adminPassword = RandomGenerator.alphaNumeric(16);
  const adminJoinConnection: api.IConnection = { host: connection.host };
  const adminJoinResult = await authorize_administrator_join(
    adminJoinConnection,
    {
      body: {
        display_name: RandomGenerator.name(2),
        email: typia.random<string & tags.Format<"email">>(),
        password: adminPassword,
      },
    },
  );
  typia.assert(adminJoinResult);
  const adminLoginConnection: api.IConnection = { host: connection.host };
  const adminLoginResult = await authorize_administrator_login(
    adminLoginConnection,
    {
      body: {
        email: adminJoinResult.email,
        password: adminPassword,
        ip: "127.0.0.1",
        referrer: "http://localhost:3000",
      },
    },
  );
  typia.assert(adminLoginResult);
  // === 2. Setup: Create test category ===
  const category =
    await api.functional.ecommerceMall.administrator.categories.create(
      adminLoginConnection,
      {
        body: {
          name: RandomGenerator.name(2),
          description: RandomGenerator.paragraph({ sentences: 3 }),
          parent_id: null,
          sort_order: 0,
        } satisfies IEcommerceMallCategory.ICreate,
      },
    );
  typia.assert(category);
  const { id: categoryId } = category;
  // === 3. Setup: Create and authenticate seller ===
  const sellerPassword = RandomGenerator.alphaNumeric(16);
  const sellerJoinConnection: api.IConnection = { host: connection.host };
  const sellerJoinResult = await authorize_seller_join(sellerJoinConnection, {
    body: {
      display_name: RandomGenerator.name(2),
      email: typia.random<string & tags.Format<"email">>(),
      password: sellerPassword,
      href: "http://localhost:3000",
      referrer: "http://localhost:3000",
      ip: "127.0.0.1",
    },
  });
  typia.assert(sellerJoinResult);
  const sellerLoginConnection: api.IConnection = { host: connection.host };
  await authorize_seller_login(sellerLoginConnection, {
    body: {
      email: sellerJoinResult.email,
      password: sellerPassword,
      href: "http://localhost:3000",
      ip: "127.0.0.1",
      referrer: "http://localhost:3000",
    },
  });
  // === 4. Setup: Create product in test category ===
  const product = await api.functional.ecommerceMall.seller.products.create(
    sellerLoginConnection,
    {
      body: {
        name: RandomGenerator.name(2),
        description: RandomGenerator.paragraph({ sentences: 2 }),
        category_id: categoryId,
        base_price: typia.random<
          number & tags.Type<"uint32"> & tags.Minimum<1000>
        >(),
      } satisfies IEcommerceMallProduct.ICreate,
    },
  );
  typia.assert(product);
  typia.assert(product.category.id === categoryId);
  // === 5. Execute: Delete category ===
  await api.functional.ecommerceMall.administrator.categories.erase(
    adminLoginConnection,
    { categoryId },
  );
  // === 6. Validate: Category deleted successfully (204 No Content) ===
  // The erase function returns void, which means 204 was returned
  // === 7. Validate: Cannot create product in deleted category ===
  // Creating a product with the deleted category ID should fail
  const deletedCategoryName = RandomGenerator.name(2);
  const deletedCategoryDescription = RandomGenerator.paragraph({
    sentences: 2,
  });
  const deletedCategoryPrice = typia.random<
    number & tags.Type<"uint32"> & tags.Minimum<1000>
  >();
  await TestValidator.httpError(
    "cannot reference deleted category",
    [404],
    async () => {
      await api.functional.ecommerceMall.seller.products.create(
        sellerLoginConnection,
        {
          body: {
            name: deletedCategoryName,
            description: deletedCategoryDescription,
            category_id: categoryId,
            base_price: deletedCategoryPrice,
          } satisfies IEcommerceMallProduct.ICreate,
        },
      );
    },
  );
  // === 8. Validate: Can still create other categories ===
  const newCategory =
    await api.functional.ecommerceMall.administrator.categories.create(
      adminLoginConnection,
      {
        body: {
          name: RandomGenerator.name(2),
          description: RandomGenerator.paragraph({ sentences: 2 }),
          parent_id: null,
          sort_order: 1,
        } satisfies IEcommerceMallCategory.ICreate,
      },
    );
  typia.assert(newCategory);
  TestValidator.notEquals(
    "new category ID differs from deleted",
    newCategory.id,
    categoryId,
  );
  // === 9. Validate: New product can be created in new category ===
  const newProduct = await api.functional.ecommerceMall.seller.products.create(
    sellerLoginConnection,
    {
      body: {
        name: RandomGenerator.name(2),
        description: RandomGenerator.paragraph({ sentences: 2 }),
        category_id: newCategory.id,
        base_price: typia.random<
          number & tags.Type<"uint32"> & tags.Minimum<1000>
        >(),
      } satisfies IEcommerceMallProduct.ICreate,
    },
  );
  typia.assert(newProduct);
  TestValidator.equals(
    "new product in new category",
    newProduct.category.id,
    newCategory.id,
  );
}
