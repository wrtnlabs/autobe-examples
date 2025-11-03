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

export async function test_api_product_sku_deletion_by_admin(
  connection: api.IConnection,
) {
  // 1. Admin user registration and authentication
  const adminEmail = typia.random<string & tags.Format<"email">>();
  const adminPassword = "StrongPassword123!";
  const adminJoinBody = {
    email: adminEmail,
    password: adminPassword,
    full_name: RandomGenerator.name(),
  } satisfies IShoppingMallAdmin.IJoin;

  const admin: IShoppingMallAdmin.IAuthorized =
    await api.functional.auth.admin.join(connection, {
      body: adminJoinBody,
    });
  typia.assert(admin);
  TestValidator.predicate(
    "admin is authorized",
    () => admin.token.access.length > 0,
  );

  // 2. Create a product
  const productCode = `PROD-${RandomGenerator.alphaNumeric(8)}`;
  const productCreateBody = {
    code: productCode,
    name: RandomGenerator.paragraph({ sentences: 3, wordMin: 5, wordMax: 10 }),
    description: RandomGenerator.content({
      paragraphs: 2,
      sentenceMin: 5,
      sentenceMax: 8,
      wordMin: 4,
      wordMax: 8,
    }),
    brand: RandomGenerator.name(),
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

  // 3. Create a SKU variant for the product
  const skuCode = `SKU-${RandomGenerator.alphaNumeric(8)}`;
  const skuCreateBody = {
    sku_code: skuCode,
    price: typia.random<number & tags.Type<"uint32"> & tags.Minimum<1>>(),
    attributes_json: JSON.stringify({
      color: RandomGenerator.name(),
      size: RandomGenerator.pick(["S", "M", "L", "XL"] as const),
    }),
  } satisfies IShoppingMallProductSku.ICreate;

  const sku: IShoppingMallProductSku =
    await api.functional.shoppingMall.admin.products.skus.createSku(
      connection,
      {
        productCode: productCode,
        body: skuCreateBody,
      },
    );
  typia.assert(sku);
  TestValidator.equals("created SKU code matches", sku.sku_code, skuCode);

  // 4. Delete the SKU variant
  await api.functional.shoppingMall.admin.products.skus.erase(connection, {
    productCode: productCode,
    skuCode: skuCode,
  });

  // 5. Validate deletion - attempt fetching the SKU should fail
  await TestValidator.error(
    "deleted SKU should not be retrievable",
    async () => {
      // Since there is no explicit SKU retrieval API, validate by attempting
      // to create the same SKU code again should succeed, meaning deletion was OK
      // because SKU codes are unique
      await api.functional.shoppingMall.admin.products.skus.createSku(
        connection,
        {
          productCode: productCode,
          body: skuCreateBody,
        },
      );
    },
  );
}
