import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallLowStockAlert } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallLowStockAlert";
import type { IShoppingMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProduct";
import type { IShoppingMallProductApproval } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductApproval";
import type { IShoppingMallProductCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductCategory";
import type { IShoppingMallProductSku } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductSku";
import type { IShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSeller";
import type { IShoppingMallSellerProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSellerProfile";
import type { IShoppingMallSellerSession } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSellerSession";

export async function test_api_low_stock_alert_retrieval(
  connection: api.IConnection,
) {
  // 1. Seller joins and authenticates
  const sellerEmail = typia.random<string & tags.Format<"email">>();
  const seller: IShoppingMallSeller.IAuthorized =
    await api.functional.auth.seller.join(connection, {
      body: {
        email: sellerEmail,
        password: "SecurePa$word123",
        store_name: RandomGenerator.name(2),
      } satisfies IShoppingMallSeller.ICreate,
    });
  typia.assert(seller);

  // 2. Seller creates a Product
  const productCode = "P" + RandomGenerator.alphaNumeric(10);
  const productName = RandomGenerator.name(3);
  const productDescription = RandomGenerator.paragraph({
    sentences: 6,
    wordMin: 4,
    wordMax: 8,
  });
  const productBrand = RandomGenerator.name(1);

  const product: IShoppingMallProduct =
    await api.functional.shoppingMall.seller.products.create(connection, {
      body: {
        code: productCode,
        name: productName,
        description: productDescription,
        brand: productBrand,
      } satisfies IShoppingMallProduct.ICreate,
    });
  typia.assert(product);

  // 3. Seller creates a SKU for the product
  const skuCode = "SKU-" + RandomGenerator.alphaNumeric(6).toUpperCase();
  const skuPrice = Math.round(
    RandomGenerator.alphaNumeric(4).length * 10 + 100,
  ); // At least 100
  const skuAttributes = JSON.stringify({
    color: RandomGenerator.pick(["red", "blue", "green"] as const),
    size: RandomGenerator.pick(["S", "M", "L"] as const),
  });

  const productSku: IShoppingMallProductSku =
    await api.functional.shoppingMall.seller.products.skus.createSku(
      connection,
      {
        productCode: productCode,
        body: {
          sku_code: skuCode,
          price: skuPrice,
          attributes_json: skuAttributes,
        } satisfies IShoppingMallProductSku.ICreate,
      },
    );
  typia.assert(productSku);

  // 4. Retrieve Low Stock Alert by targeting SKU id
  // Since we don't have an API to create alerts, we assume alerts exist for sku.
  // Thus, we retrieve a plausible existing alert by calling at with a valid UUID.
  // Here, we simulate an ID for testing consistency.
  const alertId = typia.random<string & tags.Format<"uuid">>();

  const alert: IShoppingMallLowStockAlert =
    await api.functional.shoppingMall.lowStockAlerts.at(connection, {
      id: alertId,
    });
  typia.assert(alert);

  // 5. Validate the Low Stock Alert fields
  TestValidator.predicate(
    "Alert id matches UUID format",
    /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
      alert.id,
    ),
  );
  TestValidator.equals(
    "Alert SKU id matches product SKU id",
    alert.shopping_mall_product_sku_id,
    productSku.id,
  );
  TestValidator.predicate(
    "Alert timestamp is valid ISO string",
    !isNaN(Date.parse(alert.alerted_at)),
  );
  TestValidator.predicate(
    "Alert resolution status is boolean",
    typeof alert.resolved === "boolean",
  );

  // Resolved at must be null or a valid ISO date string
  if (alert.resolved) {
    TestValidator.predicate(
      "Alert resolved_at is defined and valid date",
      alert.resolved_at !== null &&
        alert.resolved_at !== undefined &&
        !isNaN(Date.parse(alert.resolved_at)),
    );
  } else {
    TestValidator.equals(
      "Alert unresolved resolved_at is null",
      alert.resolved_at,
      null,
    );
  }
}
