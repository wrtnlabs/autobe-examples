import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProduct";
import type { IShoppingMallProductSku } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductSku";
import type { IShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSeller";

export async function test_api_shopping_mall_seller_delete_product_sku_by_seller(
  connection: api.IConnection,
) {
  // Seller registration and authentication
  const sellerEmail = typia.random<string & tags.Format<"email">>();
  const seller: IShoppingMallSeller.IAuthorized =
    await api.functional.auth.seller.join(connection, {
      body: {
        email: sellerEmail,
        password: "validPassword123",
        name: RandomGenerator.name(),
      } satisfies IShoppingMallSeller.ICreate,
    });
  typia.assert(seller);

  // Create a product
  const productCode = `product_${RandomGenerator.alphaNumeric(8)}`;
  const productName = RandomGenerator.name(3);
  const productDescription = RandomGenerator.paragraph({ sentences: 5 });
  const product: IShoppingMallProduct =
    await api.functional.shoppingMall.seller.shoppingMallProducts.create(
      connection,
      {
        body: {
          code: productCode,
          name: productName,
          description: productDescription,
          is_active: true,
        } satisfies IShoppingMallProduct.ICreate,
      },
    );
  typia.assert(product);
  TestValidator.equals("product code matches", product.code, productCode);

  // Create a SKU under the product
  const skuCode = `sku_${RandomGenerator.alphaNumeric(8)}`;
  const skuPrice = Math.floor(Math.random() * 10000) + 1000;
  const skuInventory = Math.floor(Math.random() * 100);
  const skuIsActive = true;
  const sku: IShoppingMallProductSku =
    await api.functional.shoppingMall.seller.shoppingMallProducts.shoppingMallProductSkus.create(
      connection,
      {
        productCode: productCode,
        body: {
          sku_code: skuCode,
          price: skuPrice,
          inventory: skuInventory,
          is_active: skuIsActive,
        } satisfies IShoppingMallProductSku.ICreate,
      },
    );
  typia.assert(sku);
  TestValidator.equals("sku code matches", sku.sku_code, skuCode);

  // Delete the SKU
  await api.functional.shoppingMall.seller.shoppingMallProducts.shoppingMallProductSkus.erase(
    connection,
    {
      productCode: productCode,
      skuCode: skuCode,
    },
  );

  // Verify SKU is deleted - attempt delete again should error
  await TestValidator.error("sku deletion repeated should fail", async () => {
    await api.functional.shoppingMall.seller.shoppingMallProducts.shoppingMallProductSkus.erase(
      connection,
      {
        productCode: productCode,
        skuCode: skuCode,
      },
    );
  });
}
