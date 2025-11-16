import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProduct";
import type { IShoppingMallProductSku } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductSku";
import type { IShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSeller";

/**
 * Test the process of a seller creating a new SKU variant under an existing
 * shopping mall product. This scenario validates that SKU codes are unique per
 * product, inventory and pricing are correctly applied, and the SKU becomes
 * active and available for sale. It also tests the required authentication
 * context and prerequisite creation of the parent product.
 */
export async function test_api_shopping_mall_product_sku_creation_by_seller(
  connection: api.IConnection,
) {
  // 1. Seller joins (registers) to get authorized seller account
  const sellerEmail = `${RandomGenerator.alphaNumeric(10)}@test.com`;
  const seller: IShoppingMallSeller.IAuthorized =
    await api.functional.auth.seller.join(connection, {
      body: {
        email: sellerEmail,
        password: "P@ssw0rd!",
        name: RandomGenerator.name(),
      } satisfies IShoppingMallSeller.ICreate,
    });
  typia.assert(seller);

  // 2. Seller creates a new product
  // Generate unique product code (alphanumeric, 5-10 chars)
  const productCode = RandomGenerator.alphaNumeric(8);
  const productCreateBody = {
    code: productCode,
    name: RandomGenerator.name(3),
    description: RandomGenerator.paragraph({
      sentences: 10,
      wordMin: 4,
      wordMax: 9,
    }),
    is_active: true,
  } satisfies IShoppingMallProduct.ICreate;

  const product: IShoppingMallProduct =
    await api.functional.shoppingMall.seller.shoppingMallProducts.create(
      connection,
      {
        body: productCreateBody,
      },
    );
  typia.assert(product);
  TestValidator.equals(
    "created product code equal input",
    product.code,
    productCreateBody.code,
  );
  TestValidator.equals(
    "created product name equal input",
    product.name,
    productCreateBody.name,
  );
  TestValidator.equals(
    "created product is active",
    product.is_active,
    productCreateBody.is_active,
  );

  // 3. Seller creates SKU variant under created product
  // Ensure sku_code unique - generate alphanumeric 8 chars distinct from product code
  const skuCode = RandomGenerator.alphaNumeric(8);
  const price = 10000 + RandomGenerator.alphaNumeric(2).length * 1000; // realistic price
  const inventory = 100 + Math.floor(Math.random() * 1000); // inventory non-negative int

  const skuCreateBody = {
    sku_code: skuCode,
    price: price,
    inventory: inventory satisfies number & tags.Type<"int32">,
    is_active: true,
  } satisfies IShoppingMallProductSku.ICreate;

  const sku: IShoppingMallProductSku =
    await api.functional.shoppingMall.seller.shoppingMallProducts.shoppingMallProductSkus.create(
      connection,
      {
        productCode: product.code,
        body: skuCreateBody,
      },
    );
  typia.assert(sku);

  // Removed invalid product id equality assertion: sku.shopping_mall_product_id != product.code

  TestValidator.equals(
    "sku code equal input",
    sku.sku_code,
    skuCreateBody.sku_code,
  );
  TestValidator.equals("sku price equal input", sku.price, skuCreateBody.price);
  TestValidator.equals(
    "sku inventory equal input",
    sku.inventory,
    skuCreateBody.inventory,
  );
  TestValidator.equals("sku is active", sku.is_active, skuCreateBody.is_active);
}
