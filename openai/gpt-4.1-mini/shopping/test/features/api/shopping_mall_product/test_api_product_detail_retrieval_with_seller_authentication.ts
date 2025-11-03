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

export async function test_api_product_detail_retrieval_with_seller_authentication(
  connection: api.IConnection,
) {
  // 1. Register a new seller via /auth/seller/join
  const sellerEmail = typia.random<string & tags.Format<"email">>();
  const sellerPassword = "StrongP@ssword123";
  const storeName =
    "Sample Store " + RandomGenerator.paragraph({ sentences: 2 });

  const seller: IShoppingMallSeller.IAuthorized =
    await api.functional.auth.seller.join(connection, {
      body: {
        email: sellerEmail,
        password: sellerPassword,
        store_name: storeName,
      } satisfies IShoppingMallSeller.ICreate,
    });
  typia.assert(seller);

  // 2. Create a new product via /shoppingMall/seller/products
  const productCode = RandomGenerator.alphaNumeric(10);
  const productName = RandomGenerator.paragraph({ sentences: 3 });
  const productDescription = RandomGenerator.content({ paragraphs: 2 });
  const productBrand = RandomGenerator.name();

  const newProduct: IShoppingMallProduct =
    await api.functional.shoppingMall.seller.products.create(connection, {
      body: {
        code: productCode,
        name: productName,
        description: productDescription,
        brand: productBrand,
      } satisfies IShoppingMallProduct.ICreate,
    });
  typia.assert(newProduct);

  // 3. Retrieve product detail via GET /shoppingMall/seller/products/{productCode}
  const retrievedProduct: IShoppingMallProduct =
    await api.functional.shoppingMall.seller.products.at(connection, {
      productCode: newProduct.code,
    });
  typia.assert(retrievedProduct);

  // 4. Validate retrieved product fields
  TestValidator.equals(
    "retrieved product code matches",
    retrievedProduct.code,
    newProduct.code,
  );
  TestValidator.equals(
    "retrieved product name matches",
    retrievedProduct.name,
    newProduct.name,
  );
  TestValidator.equals(
    "retrieved product description matches",
    retrievedProduct.description,
    newProduct.description,
  );
  TestValidator.equals(
    "retrieved product brand matches",
    retrievedProduct.brand,
    newProduct.brand,
  );
}
