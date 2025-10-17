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
 * This test verifies the process of creating a new product by an admin user.
 *
 * Business steps:
 *
 * 1. Admin user registers via the /auth/admin/join endpoint.
 * 2. Admin creates a product category with code, name, description, and display
 *    order.
 * 3. Admin creates a seller account with required details.
 * 4. Admin creates a product linked to the created category and seller using a
 *    unique code.
 *
 * Each step validates the response data types, uniqueness, and linkage
 * constraints. Tests the default 'active' or 'status' assignments where
 * applicable. Verifies timestamps and nullable fields appropriately.
 *
 * This comprehensive workflow ensures the integrity of the product creation API
 * for admin roles.
 */
export async function test_api_product_creation_admin_role(
  connection: api.IConnection,
) {
  // 1. Admin user signs up
  const adminEmail: string = typia.random<string & tags.Format<"email">>();
  const passwordHash = RandomGenerator.alphaNumeric(64);
  const adminCreateBody = {
    email: adminEmail,
    password_hash: passwordHash,
    status: "active",
    full_name: null,
    phone_number: null,
  } satisfies IShoppingMallAdmin.ICreate;

  const adminAuthorized: IShoppingMallAdmin.IAuthorized =
    await api.functional.auth.admin.join(connection, { body: adminCreateBody });
  typia.assert(adminAuthorized);
  TestValidator.equals(
    "admin email matches input",
    adminAuthorized.email,
    adminEmail,
  );
  TestValidator.equals(
    "admin status is active",
    adminAuthorized.status,
    "active",
  );
  TestValidator.predicate(
    "admin id is valid uuid",
    /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
      adminAuthorized.id,
    ),
  );

  // 2. Create product category
  const categoryCode = RandomGenerator.alphaNumeric(10);
  const categoryName = RandomGenerator.name(2);
  const categoryDescription = RandomGenerator.paragraph({ sentences: 5 });
  const categoryDisplayOrder = typia.random<number & tags.Type<"int32">>();
  const categoryCreateBody = {
    code: categoryCode,
    name: categoryName,
    description: categoryDescription,
    display_order: categoryDisplayOrder satisfies number as number,
    parent_id: null,
  } satisfies IShoppingMallCategory.ICreate;

  const category: IShoppingMallCategory =
    await api.functional.shoppingMall.admin.shoppingMall.categories.create(
      connection,
      { body: categoryCreateBody },
    );
  typia.assert(category);
  TestValidator.equals(
    "category code matches input",
    category.code,
    categoryCode,
  );
  TestValidator.equals(
    "category name matches input",
    category.name,
    categoryName,
  );
  TestValidator.equals(
    "category description matches input",
    category.description,
    categoryDescription,
  );
  TestValidator.equals(
    "category display order matches input",
    category.display_order,
    categoryDisplayOrder,
  );
  TestValidator.equals("category parent id is null", category.parent_id, null);

  // 3. Create seller account
  const sellerEmail = typia.random<string & tags.Format<"email">>();
  const sellerPasswordHash = RandomGenerator.alphaNumeric(64);
  const sellerCompanyName = RandomGenerator.name(2);
  const sellerContactName = RandomGenerator.name(1);
  const sellerPhoneNumber = RandomGenerator.mobile();
  const sellerStatus = "active";

  const sellerCreateBody = {
    email: sellerEmail,
    password_hash: sellerPasswordHash,
    company_name: sellerCompanyName,
    contact_name: sellerContactName,
    phone_number: sellerPhoneNumber,
    status: sellerStatus,
  } satisfies IShoppingMallSeller.ICreate;

  const seller: IShoppingMallSeller =
    await api.functional.shoppingMall.admin.sellers.create(connection, {
      body: sellerCreateBody,
    });
  typia.assert(seller);
  TestValidator.equals("seller email matches input", seller.email, sellerEmail);
  TestValidator.equals(
    "seller company name matches input",
    seller.company_name,
    sellerCompanyName,
  );
  TestValidator.equals(
    "seller contact name matches input",
    seller.contact_name,
    sellerContactName,
  );
  TestValidator.equals(
    "seller phone number matches input",
    seller.phone_number,
    sellerPhoneNumber,
  );
  TestValidator.equals(
    "seller status matches input",
    seller.status,
    sellerStatus,
  );

  // 4. Create product linked to category and seller
  const productCode = RandomGenerator.alphaNumeric(12);
  const productName = RandomGenerator.name(3);
  const productDescription = RandomGenerator.paragraph({ sentences: 8 });
  const productStatus = "Draft";

  const productCreateBody = {
    shopping_mall_category_id: category.id,
    shopping_mall_seller_id: seller.id,
    code: productCode,
    name: productName,
    description: productDescription,
    status: productStatus,
  } satisfies IShoppingMallProduct.ICreate;

  const product: IShoppingMallProduct =
    await api.functional.shoppingMall.admin.products.create(connection, {
      body: productCreateBody,
    });
  typia.assert(product);
  TestValidator.equals(
    "product category id matches category",
    product.shopping_mall_category_id,
    category.id,
  );
  TestValidator.equals(
    "product seller id matches seller",
    product.shopping_mall_seller_id,
    seller.id,
  );
  TestValidator.equals("product code matches input", product.code, productCode);
  TestValidator.equals("product name matches input", product.name, productName);
  TestValidator.equals(
    "product description matches input",
    product.description,
    productDescription,
  );
  TestValidator.equals(
    "product status matches input",
    product.status,
    productStatus,
  );
  TestValidator.predicate(
    "product id is valid uuid",
    /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
      product.id,
    ),
  );
  TestValidator.predicate(
    "product created_at is ISO date-time",
    typeof product.created_at === "string" &&
      !isNaN(Date.parse(product.created_at)),
  );
  TestValidator.predicate(
    "product updated_at is ISO date-time",
    typeof product.updated_at === "string" &&
      !isNaN(Date.parse(product.updated_at)),
  );
  TestValidator.predicate(
    "product deleted_at is null or undefined",
    product.deleted_at === null || product.deleted_at === undefined,
  );
}
