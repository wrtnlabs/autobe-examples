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
 * Test the creation of a new SKU variant for a specific product by an
 * authenticated admin user.
 *
 * This test performs the following steps:
 *
 * 1. Admin user joins and authenticates into the system.
 * 2. Admin creates a new product to which the SKU will be assigned.
 * 3. Admin creates a SKU variant for the specified product with price, SKU code,
 *    and variant attributes.
 *
 * Each step validates the response type using typia.assert. The test ensures
 * that the SKU is created successfully with correct data integrity and
 * permissions.
 */
export async function test_api_product_sku_creation_by_admin(
  connection: api.IConnection,
) {
  // 1. Admin join and authentication
  const adminEmail: string = typia.random<string & tags.Format<"email">>();

  const admin: IShoppingMallAdmin.IAuthorized =
    await api.functional.auth.admin.join(connection, {
      body: {
        email: adminEmail,
        password: "SecureP@ssw0rd1", // strong password example
        full_name: RandomGenerator.name(),
      } satisfies IShoppingMallAdmin.IJoin,
    });
  typia.assert(admin);

  // 2. Admin creates a new product
  const newProductCreate: IShoppingMallProduct.ICreate = {
    code: `prod-${RandomGenerator.alphaNumeric(8)}`,
    name: RandomGenerator.paragraph({ sentences: 3, wordMin: 5, wordMax: 10 }),
    description: RandomGenerator.content({
      paragraphs: 1,
      sentenceMin: 5,
      sentenceMax: 10,
    }),
    brand: `Brand ${RandomGenerator.name(1)}`,
  } satisfies IShoppingMallProduct.ICreate;

  const createdProduct: IShoppingMallProduct =
    await api.functional.shoppingMall.admin.products.create(connection, {
      body: newProductCreate,
    });
  typia.assert(createdProduct);

  // 3. Admin creates a SKU variant for the product
  const skuCreate: IShoppingMallProductSku.ICreate = {
    sku_code: `sku-${RandomGenerator.alphaNumeric(6)}`,
    price: Number((Math.random() * 1000 + 10).toFixed(2)), // price between 10.00 and 1010.00
    attributes_json: JSON.stringify({
      color: RandomGenerator.pick([
        "red",
        "blue",
        "green",
        "black",
        "white",
      ] as const),
      size: RandomGenerator.pick(["S", "M", "L", "XL"] as const),
      material: RandomGenerator.pick(["cotton", "polyester", "wool"] as const),
    }),
  } satisfies IShoppingMallProductSku.ICreate;

  const createdSKU: IShoppingMallProductSku =
    await api.functional.shoppingMall.admin.products.skus.createSku(
      connection,
      {
        productCode: createdProduct.code,
        body: skuCreate,
      },
    );
  typia.assert(createdSKU);

  // Validate properties for newly created SKU
  TestValidator.equals(
    "Product code matches",
    createdSKU.shopping_mall_product_id,
    createdProduct.id,
  );
  TestValidator.equals(
    "SKU code matches",
    createdSKU.sku_code,
    skuCreate.sku_code,
  );
  TestValidator.equals("Price matches", createdSKU.price, skuCreate.price);
  TestValidator.equals(
    "Attributes JSON matches",
    createdSKU.attributes_json,
    skuCreate.attributes_json,
  );
}
