import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomer";
import type { IShoppingMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProduct";
import type { IShoppingMallProductApproval } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductApproval";
import type { IShoppingMallProductCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductCategory";
import type { IShoppingMallProductSku } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductSku";
import type { IShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSeller";
import type { IShoppingMallSellerProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSellerProfile";
import type { IShoppingMallSellerSession } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSellerSession";
import type { IShoppingMallSkuInventory } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSkuInventory";

/**
 * Validate the retrieval of SKU inventory information by an authenticated
 * customer.
 *
 * This test performs the following steps:
 *
 * 1. Registers and logs in a seller user.
 * 2. Seller creates a product with a unique product code.
 * 3. Seller creates a SKU for the product.
 * 4. Registers and logs in a customer user.
 * 5. Attempts to retrieve SKU inventory record by a random ID and expects failure.
 * 6. This test omits positive SKU inventory retrieval due to lack of inventory
 *    creation API.
 */
export async function test_api_sku_inventory_retrieval_by_customer(
  connection: api.IConnection,
) {
  // 1. Seller Registration
  const sellerEmail = typia.random<string & tags.Format<"email">>();
  const seller: IShoppingMallSeller.IAuthorized =
    await api.functional.auth.seller.join(connection, {
      body: {
        email: sellerEmail,
        password: "StrongPassword123!",
        store_name: RandomGenerator.name(),
      } satisfies IShoppingMallSeller.ICreate,
    });
  typia.assert(seller);

  // 2. Seller Product Creation
  const productCode = RandomGenerator.alphaNumeric(8);
  const product: IShoppingMallProduct =
    await api.functional.shoppingMall.seller.products.create(connection, {
      body: {
        code: productCode,
        name: RandomGenerator.paragraph({
          sentences: 3,
          wordMin: 5,
          wordMax: 10,
        }),
        description: RandomGenerator.content({ paragraphs: 2 }),
        brand: null,
      } satisfies IShoppingMallProduct.ICreate,
    });
  typia.assert(product);

  // 3. Seller SKU Creation
  const skuBody = {
    sku_code: RandomGenerator.alphaNumeric(12).toUpperCase(),
    price: Math.floor(Math.random() * 10000) + 1000, // Price between 1000 and 11000
    attributes_json: JSON.stringify({ color: "red", size: "M" }),
  } satisfies IShoppingMallProductSku.ICreate;

  const sku: IShoppingMallProductSku =
    await api.functional.shoppingMall.seller.products.skus.createSku(
      connection,
      {
        productCode: productCode,
        body: skuBody,
      },
    );
  typia.assert(sku);

  // 4. Customer Registration
  const customerEmail = typia.random<string & tags.Format<"email">>();
  const customer: IShoppingMallCustomer.IAuthorized =
    await api.functional.auth.customer.join(connection, {
      body: {
        email: customerEmail,
        password: "StrongPassword123!",
        nickname: RandomGenerator.name(),
      } satisfies IShoppingMallCustomer.ICreate,
    });
  typia.assert(customer);

  // 5. Customer Login (to simulate user switch)
  await api.functional.auth.customer.login(connection, {
    body: {
      email: customerEmail,
      password: "StrongPassword123!",
      ip: null,
      href: "http://localhost/login",
      referrer: "http://localhost",
    } satisfies IShoppingMallCustomer.ILogin,
  });

  // 6. Test invalid SKU inventory ID retrieval
  await TestValidator.error(
    "retrieval with invalid SKU inventory ID fails",
    async () => {
      await api.functional.shoppingMall.customer.skuInventories.at(connection, {
        id: typia.random<string & tags.Format<"uuid">>(),
      });
    },
  );
}
