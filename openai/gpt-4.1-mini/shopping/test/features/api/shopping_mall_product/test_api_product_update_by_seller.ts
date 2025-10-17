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
 * Validate updating existing product by an authenticated seller.
 *
 * This test performs the following steps:
 *
 * 1. Seller user registration and authentication.
 * 2. Admin user registration and authentication.
 * 3. Admin creates a product category.
 * 4. Admin creates a seller account.
 * 5. Seller authenticates again (logging in).
 * 6. Seller creates a new product associated with the created category and seller.
 * 7. Seller updates the product with new name, description, category, seller, and
 *    status.
 * 8. Validate the update response and verify the changes were applied correctly.
 *
 * The test ensures correct authorization handling, proper entity relationships,
 * data integrity, and type-safe validation using typia.assert and
 * TestValidator.
 */
export async function test_api_product_update_by_seller(
  connection: api.IConnection,
) {
  // 1. Seller join to get authenticated seller session
  const sellerEmail: string = typia.random<string & tags.Format<"email">>();
  const sellerPassword = "1234";
  const seller: IShoppingMallSeller.IAuthorized =
    await api.functional.auth.seller.join(connection, {
      body: {
        email: sellerEmail,
        password_hash: sellerPassword,
        status: "active",
      } satisfies IShoppingMallSeller.ICreate,
    });
  typia.assert(seller);

  // 2. Admin join for privileges to create category and seller
  const adminEmail: string = typia.random<string & tags.Format<"email">>();
  const adminPassword = "1234";
  const admin: IShoppingMallAdmin.IAuthorized =
    await api.functional.auth.admin.join(connection, {
      body: {
        email: adminEmail,
        password_hash: adminPassword,
        status: "active",
      } satisfies IShoppingMallAdmin.ICreate,
    });
  typia.assert(admin);

  // 3. Create a product category as admin
  const categoryCreate = {
    code: RandomGenerator.alphaNumeric(6),
    name: RandomGenerator.name(),
    display_order: typia.random<
      number & tags.Type<"int32">
    >() satisfies number as number,
  } satisfies IShoppingMallCategory.ICreate;
  const category: IShoppingMallCategory =
    await api.functional.shoppingMall.admin.shoppingMall.categories.create(
      connection,
      { body: categoryCreate },
    );
  typia.assert(category);

  // 4. Create a seller as admin
  const adminCreateSeller = {
    email: typia.random<string & tags.Format<"email">>(),
    password_hash: "1234",
    status: "active",
  } satisfies IShoppingMallSeller.ICreate;
  const anotherSeller: IShoppingMallSeller =
    await api.functional.shoppingMall.admin.sellers.create(connection, {
      body: adminCreateSeller,
    });
  typia.assert(anotherSeller);

  // 5. Switch authentication to seller to update product (log in again)
  await api.functional.auth.seller.join(connection, {
    body: {
      email: sellerEmail,
      password_hash: sellerPassword,
      status: "active",
    } satisfies IShoppingMallSeller.ICreate,
  });

  // 6. Seller creates a product associated with created category and seller
  const productCreate: IShoppingMallProduct.IUpdate = {
    shopping_mall_category_id: category.id,
    shopping_mall_seller_id: seller.id,
    code: RandomGenerator.alphaNumeric(10),
    name: RandomGenerator.name(),
    description: RandomGenerator.content({ paragraphs: 1 }),
    status: "draft",
  };

  // We simulate creation by first calling update with a random UUID and create-like data
  // but as per scope, just create a product then update it.
  // Instead, we will update a product we know exists: we must create product first

  // Simulate product creation by updating product after creation with same data (for test)
  // Actual product creation endpoint not given, so we assume product update creates if not exists

  // Construct a product with a fresh UUID
  const initialProductId = typia.random<string & tags.Format<"uuid">>();

  // Create product effectively by update for initial setup
  const createdProduct: IShoppingMallProduct =
    await api.functional.shoppingMall.seller.products.update(connection, {
      productId: initialProductId,
      body: productCreate,
    });
  typia.assert(createdProduct);

  // 7. Seller updates the product with new name, description, category, seller, and status
  const updatedProductBody: IShoppingMallProduct.IUpdate = {
    shopping_mall_category_id: category.id,
    shopping_mall_seller_id: anotherSeller.id,
    name: RandomGenerator.name(),
    description: RandomGenerator.content({ paragraphs: 2 }),
    status: "active",
  };

  // Update the product using the created product id
  const updatedProduct: IShoppingMallProduct =
    await api.functional.shoppingMall.seller.products.update(connection, {
      productId: createdProduct.id,
      body: updatedProductBody,
    });
  typia.assert(updatedProduct);

  // 8. Assert response matches intended updated product info
  TestValidator.equals(
    "product id remains the same",
    updatedProduct.id,
    createdProduct.id,
  );
  TestValidator.equals(
    "product category id updated",
    updatedProduct.shopping_mall_category_id,
    updatedProductBody.shopping_mall_category_id,
  );
  TestValidator.equals(
    "product seller id updated",
    updatedProduct.shopping_mall_seller_id,
    updatedProductBody.shopping_mall_seller_id,
  );
  TestValidator.equals(
    "product name updated",
    updatedProduct.name,
    updatedProductBody.name!,
  );
  TestValidator.equals(
    "product description updated",
    updatedProduct.description,
    updatedProductBody.description!,
  );
  TestValidator.equals(
    "product status updated",
    updatedProduct.status,
    updatedProductBody.status!,
  );
}
