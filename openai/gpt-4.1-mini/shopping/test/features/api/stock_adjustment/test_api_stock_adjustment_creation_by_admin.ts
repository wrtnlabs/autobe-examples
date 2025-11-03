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
import type { IShoppingMallStockAdjustment } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallStockAdjustment";

export async function test_api_stock_adjustment_creation_by_admin(
  connection: api.IConnection,
) {
  // 1. Admin authentication by registering a new admin user
  const adminEmail: string = typia.random<string & tags.Format<"email">>();
  const admin: IShoppingMallAdmin.IAuthorized =
    await api.functional.auth.admin.join(connection, {
      body: {
        email: adminEmail,
        password: "AdminPass123!",
        full_name: RandomGenerator.name(),
      } satisfies IShoppingMallAdmin.IJoin,
    });
  typia.assert(admin);

  // 2. Create a new product for the stock adjustment SKU
  const productCode: string = RandomGenerator.alphaNumeric(10);
  const product: IShoppingMallProduct =
    await api.functional.shoppingMall.admin.products.create(connection, {
      body: {
        code: productCode,
        name: RandomGenerator.name(),
        description: RandomGenerator.paragraph({ sentences: 5 }),
        brand: RandomGenerator.name(1),
      } satisfies IShoppingMallProduct.ICreate,
    });
  typia.assert(product);
  TestValidator.equals("product code matches", product.code, productCode);

  // 3. Create SKU for the created product
  const skuCode: string = RandomGenerator.alphaNumeric(8);
  const skuAttributes = JSON.stringify({
    color: RandomGenerator.pick([
      "red",
      "blue",
      "green",
      "black",
      "white",
    ] as const),
    size: RandomGenerator.pick(["S", "M", "L", "XL"] as const),
  });
  const sku: IShoppingMallProductSku =
    await api.functional.shoppingMall.admin.products.skus.createSku(
      connection,
      {
        productCode: productCode,
        body: {
          sku_code: skuCode,
          price: typia.random<number & tags.Type<"int32"> & tags.Minimum<1>>(),
          attributes_json: skuAttributes,
        } satisfies IShoppingMallProductSku.ICreate,
      },
    );
  typia.assert(sku);
  TestValidator.equals("SKU code matches", sku.sku_code, skuCode);
  TestValidator.equals(
    "SKU belongs to correct product",
    sku.shopping_mall_product_id,
    product.id,
  );

  // 4. Create a stock adjustment record by the admin user
  const adjustmentType = RandomGenerator.pick([
    "addition",
    "subtraction",
    "reservation",
    "release",
  ] as const);
  const quantity = RandomGenerator.pick([1, 5, 10, 20]);
  const stockAdjustmentInput = {
    shopping_mall_product_sku_id: sku.id,
    adjustment_type: adjustmentType,
    quantity: quantity,
    actor_type: "admin" as const,
    actor_id: admin.id,
  } satisfies IShoppingMallStockAdjustment.ICreate;

  const stockAdjustment: IShoppingMallStockAdjustment =
    await api.functional.shoppingMall.admin.stockAdjustments.create(
      connection,
      {
        body: stockAdjustmentInput,
      },
    );
  typia.assert(stockAdjustment);

  TestValidator.equals(
    "stock adjustment SKU ID",
    stockAdjustment.shopping_mall_product_sku_id,
    sku.id,
  );
  TestValidator.equals(
    "stock adjustment type",
    stockAdjustment.adjustment_type,
    adjustmentType,
  );
  TestValidator.equals(
    "stock adjustment quantity",
    stockAdjustment.quantity,
    quantity,
  );
  TestValidator.equals(
    "stock adjustment actor type",
    stockAdjustment.actor_type,
    "admin",
  );
  TestValidator.equals(
    "stock adjustment actor ID",
    stockAdjustment.actor_id,
    admin.id,
  );
  TestValidator.predicate(
    "stock adjustment ID is UUID format",
    typeof stockAdjustment.id === "string" &&
      /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
        stockAdjustment.id,
      ),
  );
}
