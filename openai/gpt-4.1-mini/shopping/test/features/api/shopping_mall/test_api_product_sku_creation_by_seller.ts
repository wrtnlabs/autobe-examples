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

/**
 * Test the creation of a new SKU variant for a specific product by an
 * authenticated seller.
 *
 * This test performs the full workflow:
 *
 * 1. Seller joins the system (authentication) with valid data
 * 2. Seller creates a product with unique code and descriptive data
 * 3. Seller creates a SKU variant for the created product with unique sku_code,
 *    price, and attribute JSON
 * 4. Asserts that the SKU is created correctly with expected attribute values
 *
 * It validates proper linkage between SKU and product, data integrity, and
 * authorization correctness. Ensures no type errors, all properties are
 * correctly handled, and API calls succeed.
 *
 * @param connection - The API connection instance
 */
export async function test_api_product_sku_creation_by_seller(
  connection: api.IConnection,
) {
  // 1. Seller joins and authenticates
  const sellerEmail: string = typia.random<string & tags.Format<"email">>();
  const sellerPassword = "securePassword123";
  const sellerStoreName = RandomGenerator.name(2);

  const joinedSeller: IShoppingMallSeller.IAuthorized =
    await api.functional.auth.seller.join(connection, {
      body: {
        email: sellerEmail,
        password: sellerPassword,
        store_name: sellerStoreName,
      } satisfies IShoppingMallSeller.ICreate,
    });
  typia.assert(joinedSeller);

  // 2. Seller creates a product with unique code
  const productCode = RandomGenerator.alphaNumeric(10).toUpperCase(); // Use uppercase code
  const productName = RandomGenerator.name(3);
  const productDescription = RandomGenerator.paragraph({ sentences: 5 });

  const createdProduct: IShoppingMallProduct =
    await api.functional.shoppingMall.seller.products.create(connection, {
      body: {
        code: productCode,
        name: productName,
        description: productDescription,
        brand: null, // Explicitly null since optional
      } satisfies IShoppingMallProduct.ICreate,
    });
  typia.assert(createdProduct);

  // 3. Seller creates a SKU variant for the created product
  const skuCode = RandomGenerator.alphaNumeric(12).toUpperCase();
  const skuPrice = Math.floor(Math.random() * 10000) + 1000; // Price between 1000 and 10999
  const skuAttributes = {
    color: RandomGenerator.pick([
      "Red",
      "Green",
      "Blue",
      "Black",
      "White",
    ] as const),
    size: RandomGenerator.pick(["S", "M", "L", "XL"] as const),
    material: RandomGenerator.pick([
      "Cotton",
      "Polyester",
      "Wool",
      "Silk",
    ] as const),
  };

  const skuAttributesJson = JSON.stringify(skuAttributes);

  const createdSku: IShoppingMallProductSku =
    await api.functional.shoppingMall.seller.products.skus.createSku(
      connection,
      {
        productCode: createdProduct.code,
        body: {
          sku_code: skuCode,
          price: skuPrice,
          attributes_json: skuAttributesJson,
        } satisfies IShoppingMallProductSku.ICreate,
      },
    );
  typia.assert(createdSku);

  // 4. Assert the SKU values
  TestValidator.equals(
    "SKU's productCode matches product code",
    createdSku.shopping_mall_product_id,
    createdProduct.id,
  );
  TestValidator.equals("SKU code matches input", createdSku.sku_code, skuCode);
  TestValidator.equals("SKU price matches input", createdSku.price, skuPrice);
  // Attributes JSON should match exactly
  TestValidator.equals(
    "SKU attributes JSON matches input",
    createdSku.attributes_json,
    skuAttributesJson,
  );
}
