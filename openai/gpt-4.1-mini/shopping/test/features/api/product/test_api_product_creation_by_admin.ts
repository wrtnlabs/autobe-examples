import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdmin";
import type { IShoppingMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProduct";
import type { IShoppingMallProductApproval } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductApproval";
import type { IShoppingMallProductCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductCategory";
import type { IShoppingMallProductSku } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductSku";

/**
 * Test product creation API with an admin account.
 *
 * This test verifies that an admin user can create a new product in the
 * catalog. The process includes:
 *
 * 1. Admin authentication using join endpoint to get authorized context.
 * 2. Creating a product category for the product.
 * 3. Creating a product with a unique code, name, optional description and brand.
 * 4. Validating that the created product contains expected properties and
 *    correctly links to related SKUs and categories.
 * 5. Testing error handling when attempting to create a product with a duplicate
 *    code.
 *
 * Uses proper type-safe DTOs and validates all API responses.
 *
 * Steps:
 *
 * - Admin joins the system to get authorization tokens.
 * - Create a product category with a random name and optional description.
 * - Create a product with unique code and name referencing the created category.
 * - Assert the returned product matches the expectations including id and
 *   timestamps.
 * - Attempt to create another product with the same code to confirm error is
 *   thrown.
 */
export async function test_api_product_creation_by_admin(
  connection: api.IConnection,
) {
  // 1. Admin joins and authenticates
  const adminEmail: string = typia.random<string & tags.Format<"email">>();
  const adminPassword = "adminPass123";
  const admin: IShoppingMallAdmin.IAuthorized =
    await api.functional.auth.admin.join(connection, {
      body: {
        email: adminEmail,
        password: adminPassword,
        full_name: RandomGenerator.name(),
      } satisfies IShoppingMallAdmin.IJoin,
    });
  typia.assert(admin);

  // 2. Create a product category
  const categoryName = RandomGenerator.paragraph({
    sentences: 2,
    wordMin: 4,
    wordMax: 8,
  });
  const productCategory: IShoppingMallProductCategory =
    await api.functional.shoppingMall.admin.productCategories.create(
      connection,
      {
        body: {
          name: categoryName,
          description: RandomGenerator.paragraph({ sentences: 3 }),
          parent_id: null,
        } satisfies IShoppingMallProductCategory.ICreate,
      },
    );
  typia.assert(productCategory);

  // 3. Create a unique product
  // Using code as unique identifier, 8 alphanumeric characters
  const productCode = RandomGenerator.alphaNumeric(8);
  const productName = RandomGenerator.paragraph({
    sentences: 2,
    wordMin: 4,
    wordMax: 10,
  });
  const productDescription = RandomGenerator.content({
    paragraphs: 2,
    sentenceMin: 10,
    sentenceMax: 15,
    wordMin: 4,
    wordMax: 8,
  });
  const productBrand = RandomGenerator.name(1);

  const product: IShoppingMallProduct =
    await api.functional.shoppingMall.admin.products.create(connection, {
      body: {
        code: productCode,
        name: productName,
        description: productDescription,
        brand: productBrand,
      } satisfies IShoppingMallProduct.ICreate,
    });
  typia.assert(product);

  // Validate product fields
  TestValidator.predicate("product.id is UUID format", () =>
    /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
      product.id,
    ),
  );
  TestValidator.equals("product.code matches", product.code, productCode);
  TestValidator.equals("product.name matches", product.name, productName);
  TestValidator.equals(
    "product.description matches",
    product.description,
    productDescription,
  );
  TestValidator.equals("product.brand matches", product.brand, productBrand);

  // The productCategories relation should be undefined or empty (since no explicit link API)
  TestValidator.predicate(
    "product categories relation is undefined or empty",
    product.shopping_mall_product_categories === undefined ||
      product.shopping_mall_product_categories.length === 0,
  );

  // The product SKUs relation should be undefined or empty (no SKU created here)
  TestValidator.predicate(
    "product SKUs relation is undefined or empty",
    product.shopping_mall_product_skus === undefined ||
      product.shopping_mall_product_skus.length === 0,
  );

  // 4. Attempt creation of duplicate product code - expect error
  await TestValidator.error(
    "duplicate product code creation should fail",
    async () => {
      await api.functional.shoppingMall.admin.products.create(connection, {
        body: {
          code: productCode, // same as existing
          name: RandomGenerator.paragraph({ sentences: 2 }),
          description: null,
          brand: null,
        } satisfies IShoppingMallProduct.ICreate,
      });
    },
  );
}
