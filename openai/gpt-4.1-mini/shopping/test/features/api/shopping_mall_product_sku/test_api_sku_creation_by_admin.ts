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

export async function test_api_sku_creation_by_admin(
  connection: api.IConnection,
) {
  // 1. Admin joins and authenticates
  const adminEmail: string = typia.random<string & tags.Format<"email">>();
  const admin: IShoppingMallAdmin.IAuthorized =
    await api.functional.auth.admin.join(connection, {
      body: {
        email: adminEmail,
        password: "strongPassword123!",
        full_name: RandomGenerator.name(2),
      } satisfies IShoppingMallAdmin.IJoin,
    });
  typia.assert(admin);

  // 2. Create a new product to associate SKUs with
  const productCode: string = `PRD-${RandomGenerator.alphaNumeric(8).toUpperCase()}`;
  const productCreateBody = {
    code: productCode,
    name: `Product ${RandomGenerator.name(3)}`,
    description: RandomGenerator.paragraph({ sentences: 5 }),
    brand: RandomGenerator.name(1),
  } satisfies IShoppingMallProduct.ICreate;

  const product: IShoppingMallProduct =
    await api.functional.shoppingMall.admin.products.create(connection, {
      body: productCreateBody,
    });
  typia.assert(product);
  TestValidator.equals(
    "created product code matches",
    product.code,
    productCode,
  );

  // 3. Create a new SKU for the product
  const skuCode: string = `SKU-${RandomGenerator.alphaNumeric(6).toUpperCase()}`;
  const price = Math.floor(Math.random() * 900) + 100; // realistic price between 100 and 999
  const attributes = {
    color: RandomGenerator.pick([
      "red",
      "blue",
      "green",
      "black",
      "white",
    ] as const),
    size: RandomGenerator.pick(["S", "M", "L", "XL"] as const),
    material: RandomGenerator.name(1),
  };
  const skuCreateBody = {
    sku_code: skuCode,
    price: price,
    attributes_json: JSON.stringify(attributes),
  } satisfies IShoppingMallProductSku.ICreate;

  const sku: IShoppingMallProductSku =
    await api.functional.shoppingMall.admin.products.skus.createSku(
      connection,
      { productCode: productCode, body: skuCreateBody },
    );
  typia.assert(sku);
  TestValidator.equals("created sku sku_code matches", sku.sku_code, skuCode);
  TestValidator.equals("created sku price matches", sku.price, price);
  TestValidator.equals(
    "created sku's product id matches",
    sku.shopping_mall_product_id,
    product.id,
  );

  // 4. Error test for duplicate SKU code under same product
  await TestValidator.error(
    "duplicate sku code creation must fail",
    async () => {
      await api.functional.shoppingMall.admin.products.skus.createSku(
        connection,
        {
          productCode: productCode,
          body: skuCreateBody,
        },
      );
    },
  );

  // 5. Error test for invalid attributes_json (malformed JSON)
  const invalidAttributesBody = {
    sku_code: `SKU-${RandomGenerator.alphaNumeric(6).toUpperCase()}`,
    price: 200,
    attributes_json: "{invalid_json}",
  } satisfies IShoppingMallProductSku.ICreate;

  await TestValidator.error("invalid attributes_json must fail", async () => {
    await api.functional.shoppingMall.admin.products.skus.createSku(
      connection,
      {
        productCode: productCode,
        body: invalidAttributesBody,
      },
    );
  });

  // 6. Error test for missing required sku_code
  // Note: Since sku_code is required and no optional, but we cannot omit required fields,
  // skip this test (as it would cause compile error). Thus, omitted.
}
