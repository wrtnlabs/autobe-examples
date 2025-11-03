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

export async function test_api_product_detail_retrieval_by_admin(
  connection: api.IConnection,
) {
  // 1. Admin joins and authenticates
  const adminEmail: string = typia.random<string & tags.Format<"email">>();
  const admin: IShoppingMallAdmin.IAuthorized =
    await api.functional.auth.admin.join(connection, {
      body: {
        email: adminEmail,
        password: "StrongPassword1!",
        full_name: RandomGenerator.name(3),
      } satisfies IShoppingMallAdmin.IJoin,
    });
  typia.assert(admin);

  // 2. Create a shopping mall product
  const productCreateBody = {
    code: RandomGenerator.alphaNumeric(12),
    name: RandomGenerator.name(3),
    description: RandomGenerator.paragraph({
      sentences: 5,
      wordMin: 4,
      wordMax: 8,
    }),
    brand: RandomGenerator.name(2),
  } satisfies IShoppingMallProduct.ICreate;

  const createdProduct: IShoppingMallProduct =
    await api.functional.shoppingMall.admin.products.create(connection, {
      body: productCreateBody,
    });
  typia.assert(createdProduct);

  // 3. Retrieve detailed product information by code
  const retrievedProduct: IShoppingMallProduct =
    await api.functional.shoppingMall.admin.products.at(connection, {
      productCode: createdProduct.code,
    });
  typia.assert(retrievedProduct);

  // 4. Validate that retrieved product matches created product
  TestValidator.equals(
    "product id matches",
    retrievedProduct.id,
    createdProduct.id,
  );
  TestValidator.equals(
    "product code matches",
    retrievedProduct.code,
    createdProduct.code,
  );
  TestValidator.equals(
    "product name matches",
    retrievedProduct.name,
    createdProduct.name,
  );
  TestValidator.equals(
    "product description matches",
    retrievedProduct.description,
    createdProduct.description,
  );
  TestValidator.equals(
    "product brand matches",
    retrievedProduct.brand,
    createdProduct.brand,
  );
}
