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

export async function test_api_product_update_by_admin(
  connection: api.IConnection,
) {
  // Step 1: Admin user registration (join)
  const adminEmail = typia.random<string & tags.Format<"email">>();
  const adminPassword = "Admin!234";
  const adminFullName = RandomGenerator.name();

  const admin: IShoppingMallAdmin.IAuthorized =
    await api.functional.auth.admin.join(connection, {
      body: {
        email: adminEmail,
        password: adminPassword,
        full_name: adminFullName,
      } satisfies IShoppingMallAdmin.IJoin,
    });
  typia.assert(admin);

  // Step 2: Create a product
  // Use a unique product code
  const productCode = `P-${RandomGenerator.alphaNumeric(8)}`;

  const productCreateBody = {
    code: productCode,
    name: RandomGenerator.name(),
    description: RandomGenerator.paragraph({ sentences: 5 }),
    brand: RandomGenerator.name(),
  } satisfies IShoppingMallProduct.ICreate;

  const createdProduct: IShoppingMallProduct =
    await api.functional.shoppingMall.admin.products.create(connection, {
      body: productCreateBody,
    });
  typia.assert(createdProduct);

  TestValidator.equals(
    "product code after creation",
    createdProduct.code,
    productCreateBody.code,
  );
  TestValidator.equals(
    "product name after creation",
    createdProduct.name,
    productCreateBody.name,
  );
  TestValidator.equals(
    "product description after creation",
    createdProduct.description ?? null,
    productCreateBody.description ?? null,
  );
  TestValidator.equals(
    "product brand after creation",
    createdProduct.brand ?? null,
    productCreateBody.brand ?? null,
  );

  // Step 3: Update product by productCode
  const updateBody = {
    name: RandomGenerator.name(),
    description: RandomGenerator.paragraph({ sentences: 3 }),
    brand: RandomGenerator.name(),
  } satisfies IShoppingMallProduct.IUpdate;

  const updatedProduct: IShoppingMallProduct =
    await api.functional.shoppingMall.admin.products.update(connection, {
      productCode: productCode,
      body: updateBody,
    });
  typia.assert(updatedProduct);

  TestValidator.equals(
    "product code remains unchanged after update",
    updatedProduct.code,
    productCode,
  );
  TestValidator.equals(
    "product name after update",
    updatedProduct.name,
    updateBody.name,
  );
  TestValidator.equals(
    "product description after update",
    updatedProduct.description ?? null,
    updateBody.description ?? null,
  );
  TestValidator.equals(
    "product brand after update",
    updatedProduct.brand ?? null,
    updateBody.brand ?? null,
  );
}
