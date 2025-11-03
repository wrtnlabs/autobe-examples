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
 * Validate updating an existing product SKU variant by admin user.
 *
 * This test function performs the following steps:
 *
 * 1. Admin user is registered and authenticated via join operation.
 * 2. A new product is created with a unique code and name.
 * 3. A SKU variant for the created product is created with initial price and
 *    attributes.
 * 4. The SKU variant is updated with new price and updated attributes.
 * 5. The returned SKU from update call is asserted for correct typing and content.
 * 6. Validation asserts ensure the updated SKU code matches, product code matches
 *    the original, and the updated properties (price and attributes JSON)
 *    reflect the changes.
 *
 * This test uses typia.assert for perfect runtime type verification and
 * TestValidator for equality checks. It ensures that admin authorization,
 * product creation, SKU creation, and SKU update endpoints work in a realistic
 * controlled sequence.
 */
export async function test_api_products_skus_update_sku_by_admin(
  connection: api.IConnection,
) {
  // 1. Admin registration and authentication
  const adminEmail = typia.random<string & tags.Format<"email">>();
  const admin: IShoppingMallAdmin.IAuthorized =
    await api.functional.auth.admin.join(connection, {
      body: {
        email: adminEmail,
        password: "securePassword123",
        full_name: RandomGenerator.name(),
      } satisfies IShoppingMallAdmin.IJoin,
    });
  typia.assert(admin);

  // 2. Create a new product
  const productCode = `PRD-${RandomGenerator.alphaNumeric(8)}`;
  const productName = RandomGenerator.name(3);
  const product: IShoppingMallProduct =
    await api.functional.shoppingMall.admin.products.create(connection, {
      body: {
        code: productCode,
        name: productName,
      } satisfies IShoppingMallProduct.ICreate,
    });
  typia.assert(product);
  TestValidator.equals("product code matches", product.code, productCode);
  TestValidator.equals("product name matches", product.name, productName);

  // 3. Create initial SKU variant linked to product
  const initialSkuCode = `SKU-${RandomGenerator.alphaNumeric(8)}`;
  const initialPrice = Number((Math.random() * 1000 + 10).toFixed(2));
  const initialAttributes = JSON.stringify({
    color: RandomGenerator.pick(["red", "blue", "green"] as const),
    size: RandomGenerator.pick(["S", "M", "L", "XL"] as const),
  });

  const sku: IShoppingMallProductSku =
    await api.functional.shoppingMall.admin.products.skus.createSku(
      connection,
      {
        productCode: productCode,
        body: {
          sku_code: initialSkuCode,
          price: initialPrice,
          attributes_json: initialAttributes,
        } satisfies IShoppingMallProductSku.ICreate,
      },
    );
  typia.assert(sku);
  TestValidator.equals("sku code matches", sku.sku_code, initialSkuCode);
  TestValidator.equals(
    "linked product id matches",
    sku.shopping_mall_product_id,
    product.id,
  );
  TestValidator.equals("initial price matches", sku.price, initialPrice);
  TestValidator.equals(
    "initial attributes json matches",
    sku.attributes_json,
    initialAttributes,
  );

  // 4. Update the SKU variant with new details
  const updatedPrice = Number((initialPrice + 100).toFixed(2));
  const updatedAttributes = JSON.stringify({
    color: RandomGenerator.pick(["yellow", "black", "white"] as const),
    size: RandomGenerator.pick(["M", "L", "XL", "XXL"] as const),
    limitedEdition: true,
  });
  const updatedSku: IShoppingMallProductSku =
    await api.functional.shoppingMall.admin.products.skus.updateSku(
      connection,
      {
        productCode: productCode,
        skuCode: initialSkuCode,
        body: {
          price: updatedPrice,
          attributes_json: updatedAttributes,
        } satisfies IShoppingMallProductSku.IUpdate,
      },
    );
  typia.assert(updatedSku);

  // 5. Validate that updated SKU reflects the changes
  TestValidator.equals(
    "updated sku code matches",
    updatedSku.sku_code,
    initialSkuCode,
  );
  TestValidator.equals(
    "updated linked product id matches",
    updatedSku.shopping_mall_product_id,
    product.id,
  );
  TestValidator.equals("updated price matches", updatedSku.price, updatedPrice);
  TestValidator.equals(
    "updated attributes json matches",
    updatedSku.attributes_json,
    updatedAttributes,
  );
}
