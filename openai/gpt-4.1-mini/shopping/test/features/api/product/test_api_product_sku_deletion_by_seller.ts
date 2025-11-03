import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProduct";
import type { IShoppingMallProductApproval } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductApproval";
import type { IShoppingMallProductCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductCategory";
import type { IShoppingMallProductSku } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductSku";
import type { IShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSeller";
import type { IShoppingMallSellerProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSellerProfile";
import type { IShoppingMallSellerSession } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSellerSession";

export async function test_api_product_sku_deletion_by_seller(
  connection: api.IConnection,
) {
  // Step 1: Seller registration
  const sellerEmail: string = typia.random<string & tags.Format<"email">>();
  const sellerPassword = "S3cureP@ssw0rd";
  const seller: IShoppingMallSeller.IAuthorized =
    await api.functional.auth.seller.join(connection, {
      body: {
        email: sellerEmail,
        password: sellerPassword,
        store_name: RandomGenerator.paragraph({
          sentences: 2,
          wordMin: 5,
          wordMax: 10,
        }),
      } satisfies IShoppingMallSeller.ICreate,
    });
  typia.assert(seller);

  // Step 2: Product creation
  const createProductBody = {
    code: `P${RandomGenerator.alphaNumeric(8)}`,
    name: RandomGenerator.paragraph({ sentences: 2, wordMin: 3, wordMax: 8 }),
    description: RandomGenerator.content({
      paragraphs: 1,
      sentenceMin: 5,
      sentenceMax: 10,
      wordMin: 4,
      wordMax: 10,
    }),
    brand: RandomGenerator.name(2),
  } satisfies IShoppingMallProduct.ICreate;
  const product: IShoppingMallProduct =
    await api.functional.shoppingMall.seller.products.create(connection, {
      body: createProductBody,
    });
  typia.assert(product);

  // Step 3: SKU variant creation
  const createSkuBody = {
    sku_code: `S${RandomGenerator.alphaNumeric(6)}`,
    price: Math.floor(1000 + Math.random() * 9000),
    attributes_json: JSON.stringify({
      color: RandomGenerator.pick(["red", "green", "blue"] as const),
      size: RandomGenerator.pick(["S", "M", "L", "XL"] as const),
    }),
  } satisfies IShoppingMallProductSku.ICreate;

  const sku: IShoppingMallProductSku =
    await api.functional.shoppingMall.seller.products.skus.createSku(
      connection,
      {
        productCode: product.code,
        body: createSkuBody,
      },
    );
  typia.assert(sku);

  // Step 4: SKU variant deletion
  await api.functional.shoppingMall.seller.products.skus.erase(connection, {
    productCode: product.code,
    skuCode: sku.sku_code,
  });

  // No response from erase endpoint; subsequent accesses to deleted sku could be tested here if API supported
}
