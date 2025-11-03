import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IShoppingAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingAdmin";
import type { IShoppingAttributeDimension } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingAttributeDimension";
import type { IShoppingAttributeValue } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingAttributeValue";
import type { IShoppingAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingAuthorizationToken";
import type { IShoppingCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingCategory";
import type { IShoppingProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingProduct";
import type { IShoppingProductAttribute } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingProductAttribute";
import type { IShoppingProductImage } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingProductImage";
import type { IShoppingSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingSeller";
import type { IShoppingSku } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingSku";
import type { IShoppingSkuImage } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingSkuImage";
import type { IShoppingSkuVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingSkuVariant";
import type { IShoppingTag } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingTag";

/**
 * Test that an admin can soft delete (archive) a SKU under a given product.
 *
 * Steps:
 *
 * 1. Create a new admin account (auth + token management handled automatically)
 * 2. Create a new product as admin
 * 3. Create a SKU for the product
 * 4. Ensure the SKU is present pre-delete in the returned product.skus[]
 * 5. Soft delete the SKU
 *
 * Note: There is no product retrieval or SKU listing endpoint available in this
 * API scope after deletion, so post-delete verification is structurally
 * impossible in this limited test setup. Negative/non-admin role cases cannot
 * be tested without further endpoints.
 */
export async function test_api_sku_soft_delete_by_admin(
  connection: api.IConnection,
) {
  // 1. Create a new admin account
  const email = `${RandomGenerator.alphabets(8)}@platform-admin.com`;
  const password = RandomGenerator.alphaNumeric(12);
  const adminOutput = await api.functional.auth.admin.join(connection, {
    body: {
      email,
      password,
      name: RandomGenerator.name(),
      role: "superadmin", // using realistic role
      status: "active",
    } satisfies IShoppingAdmin.IJoin,
  });
  typia.assert(adminOutput);

  // 2. Create a new product
  const productCode = RandomGenerator.alphaNumeric(10);
  const productCreateBody = {
    code: productCode,
    name: RandomGenerator.paragraph({ sentences: 3 }),
    description: RandomGenerator.content({
      paragraphs: 1,
      sentenceMin: 10,
      sentenceMax: 20,
    }),
    main_image_uri: `https://images.example.com/product/${productCode}.jpg`,
    status: "active",
    business_status: "in_review",
  } satisfies IShoppingProduct.ICreate;
  const product = await api.functional.shopping.admin.products.create(
    connection,
    { body: productCreateBody },
  );
  typia.assert(product);
  TestValidator.equals(
    "created product code matches",
    product.code,
    productCode,
  );

  // prepare dummy attribute value for SKU creation
  const dummyAttributeValueId = typia.random<string & tags.Format<"uuid">>();

  // 3. Create a SKU for the product
  const skuCode = RandomGenerator.alphaNumeric(12);
  const skuCreateBody = {
    sku_code: skuCode,
    price: 9999,
    is_active: true,
    status: "in_stock",
    variant_attribute_value_ids: [dummyAttributeValueId],
  } satisfies IShoppingSku.ICreate;
  const sku = await api.functional.shopping.admin.products.skus.create(
    connection,
    { productCode: productCode, body: skuCreateBody },
  );
  typia.assert(sku);
  TestValidator.equals("created SKU sku_code matches", sku.sku_code, skuCode);

  // 4. Confirm SKU is in the created product's SKUs
  TestValidator.predicate(
    "SKU created is present in product.skus[]",
    !!product.skus.find((s) => s.sku_code === skuCode),
  );

  // 5. Soft delete the SKU
  await api.functional.shopping.admin.products.skus.erase(connection, {
    productCode: productCode,
    skuCode,
  });
}
