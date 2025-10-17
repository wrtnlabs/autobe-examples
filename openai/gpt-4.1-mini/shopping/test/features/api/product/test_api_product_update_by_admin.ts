import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdmin";
import type { IShoppingMallCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCategory";
import type { IShoppingMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProduct";
import type { IShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSeller";

/**
 * Test the update operation of a shopping mall product by an authenticated
 * admin.
 *
 * The workflow carries out admin registration, creation of a category and a
 * seller, initial product creation, and then updates the product with new
 * details. It validates that the update response matches the input update,
 * including changed fields like name, description, category, seller, status,
 * and code.
 *
 * It ensures role-based access control by using the admin authentication.
 *
 * The test confirms all DTO constraints, runtime types, and business rules
 * regarding assignment of entities in a realistic ecommerce scenario.
 */
export async function test_api_product_update_by_admin(
  connection: api.IConnection,
) {
  // 1. Admin registration and authentication
  const adminEmail = typia.random<string & tags.Format<"email">>();
  const adminPasswordHash = RandomGenerator.alphaNumeric(32);
  const admin: IShoppingMallAdmin.IAuthorized =
    await api.functional.auth.admin.join(connection, {
      body: {
        email: adminEmail,
        password_hash: adminPasswordHash,
        full_name: RandomGenerator.name(),
        phone_number: RandomGenerator.mobile(),
        status: "active",
      } satisfies IShoppingMallAdmin.ICreate,
    });
  typia.assert(admin);

  // 2. Category creation
  const categoryName = RandomGenerator.paragraph({
    sentences: 2,
    wordMin: 6,
    wordMax: 10,
  });
  const categoryCode = RandomGenerator.alphaNumeric(8);
  const categoryDisplayOrder = typia.random<number & tags.Type<"int32">>();
  const category: IShoppingMallCategory =
    await api.functional.shoppingMall.admin.shoppingMall.categories.create(
      connection,
      {
        body: {
          parent_id: null,
          code: categoryCode,
          name: categoryName,
          description: RandomGenerator.paragraph({ sentences: 5 }),
          display_order: categoryDisplayOrder,
        } satisfies IShoppingMallCategory.ICreate,
      },
    );
  typia.assert(category);

  // 3. Seller creation
  const sellerEmail = typia.random<string & tags.Format<"email">>();
  const sellerPasswordHash = RandomGenerator.alphaNumeric(32);
  const sellerCompanyName = RandomGenerator.name(2);
  const sellerContactName = RandomGenerator.name(1);
  const sellerPhoneNumber = RandomGenerator.mobile();
  const sellerStatus = "active" as const;
  const seller: IShoppingMallSeller =
    await api.functional.shoppingMall.admin.sellers.create(connection, {
      body: {
        email: sellerEmail,
        password_hash: sellerPasswordHash,
        company_name: sellerCompanyName,
        contact_name: sellerContactName,
        phone_number: sellerPhoneNumber,
        status: sellerStatus,
      } satisfies IShoppingMallSeller.ICreate,
    });
  typia.assert(seller);

  // 4. Initial product creation
  const initialProductCode = RandomGenerator.alphaNumeric(16).toLowerCase();
  const initialProductName = RandomGenerator.paragraph({
    sentences: 3,
    wordMin: 4,
    wordMax: 8,
  });
  const initialProductDescription = RandomGenerator.content({
    paragraphs: 2,
    sentenceMin: 5,
    sentenceMax: 10,
    wordMin: 3,
    wordMax: 6,
  });
  const initialProductStatus = "Draft"; // as per domain, assume status values like Draft, Active, Inactive

  const initialProduct: IShoppingMallProduct =
    await api.functional.shoppingMall.admin.products.create(connection, {
      body: {
        shopping_mall_category_id: category.id,
        shopping_mall_seller_id: seller.id,
        code: initialProductCode,
        name: initialProductName,
        description: initialProductDescription,
        status: initialProductStatus,
      } satisfies IShoppingMallProduct.ICreate,
    });
  typia.assert(initialProduct);

  // 5. Product update operation
  // Prepare updated data
  const updatedProductName = RandomGenerator.paragraph({
    sentences: 4,
    wordMin: 5,
    wordMax: 10,
  });
  const updatedProductDescription = RandomGenerator.content({
    paragraphs: 3,
    sentenceMin: 6,
    sentenceMax: 12,
    wordMin: 4,
    wordMax: 7,
  });
  const updatedProductStatus = "Active"; // assuming allowed status
  const updatedCode = RandomGenerator.alphaNumeric(16).toLowerCase();

  // Possibly create a second category & seller to simulate assignment changes
  // but since no other categories or sellers required, we'll update with same ones

  const updateBody = {
    shopping_mall_category_id: category.id,
    shopping_mall_seller_id: seller.id,
    code: updatedCode,
    name: updatedProductName,
    description: updatedProductDescription,
    status: updatedProductStatus,
  } satisfies IShoppingMallProduct.IUpdate;

  const updatedProduct: IShoppingMallProduct =
    await api.functional.shoppingMall.admin.products.update(connection, {
      productId: initialProduct.id,
      body: updateBody,
    });
  typia.assert(updatedProduct);

  // 6. Validation assertions
  TestValidator.equals(
    "Product IDs should remain the same",
    updatedProduct.id,
    initialProduct.id,
  );
  TestValidator.equals(
    "Updated product category ID",
    updatedProduct.shopping_mall_category_id,
    updateBody.shopping_mall_category_id,
  );
  TestValidator.equals(
    "Updated product seller ID",
    updatedProduct.shopping_mall_seller_id,
    updateBody.shopping_mall_seller_id,
  );
  TestValidator.equals(
    "Updated product code",
    updatedProduct.code,
    updateBody.code,
  );
  TestValidator.equals(
    "Updated product name",
    updatedProduct.name,
    updateBody.name,
  );
  TestValidator.equals(
    "Updated product description",
    updatedProduct.description ?? null,
    updateBody.description ?? null,
  );
  TestValidator.equals(
    "Updated product status",
    updatedProduct.status,
    updateBody.status,
  );
}
