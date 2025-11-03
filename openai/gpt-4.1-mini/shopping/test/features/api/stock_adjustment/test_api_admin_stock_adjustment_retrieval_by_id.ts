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
import type { IShoppingMallUserRole } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallUserRole";

export async function test_api_admin_stock_adjustment_retrieval_by_id(
  connection: api.IConnection,
) {
  // 1. Admin join and authenticate
  const adminEmail = typia.random<string & tags.Format<"email">>();
  const admin: IShoppingMallAdmin.IAuthorized =
    await api.functional.auth.admin.join(connection, {
      body: {
        email: adminEmail,
        password: "Password123!",
        full_name: RandomGenerator.name(),
      } satisfies IShoppingMallAdmin.IJoin,
    });
  typia.assert(admin);

  // 2. Create user role for the admin
  const userRoleRequestBody = {
    user_id: admin.id,
    role_name: "admin",
  } satisfies IShoppingMallUserRole.ICreate;
  const userRole: IShoppingMallUserRole =
    await api.functional.shoppingMall.admin.userRoles.create(connection, {
      body: userRoleRequestBody,
    });
  typia.assert(userRole);

  // 3. Create a product
  const productCreateBody = {
    code: RandomGenerator.alphaNumeric(12),
    name: RandomGenerator.name(),
    description: RandomGenerator.paragraph({
      sentences: 4,
      wordMin: 3,
      wordMax: 7,
    }),
    brand: RandomGenerator.name(),
  } satisfies IShoppingMallProduct.ICreate;
  const product: IShoppingMallProduct =
    await api.functional.shoppingMall.admin.products.create(connection, {
      body: productCreateBody,
    });
  typia.assert(product);

  // 4. Create a SKU for the product
  const skuCreateBody = {
    sku_code: RandomGenerator.alphaNumeric(10),
    price: typia.random<number & tags.Type<"int32"> & tags.Minimum<1>>(),
    attributes_json: JSON.stringify({ color: "Red", size: "M" }),
  } satisfies IShoppingMallProductSku.ICreate;
  const productSku: IShoppingMallProductSku =
    await api.functional.shoppingMall.admin.products.skus.createSku(
      connection,
      {
        productCode: product.code,
        body: skuCreateBody,
      },
    );
  typia.assert(productSku);

  // 5. Create a stock adjustment record
  const stockAdjustmentCreateBody = {
    shopping_mall_product_sku_id: productSku.id,
    adjustment_type: "addition",
    quantity: typia.random<number & tags.Type<"int32"> & tags.Minimum<1>>(),
    actor_type: "admin",
    actor_id: admin.id,
  } satisfies IShoppingMallStockAdjustment.ICreate;
  const stockAdjustment: IShoppingMallStockAdjustment =
    await api.functional.shoppingMall.admin.stockAdjustments.create(
      connection,
      {
        body: stockAdjustmentCreateBody,
      },
    );
  typia.assert(stockAdjustment);

  // 6. Retrieve the stock adjustment record by ID
  const retrievedStockAdjustment: IShoppingMallStockAdjustment =
    await api.functional.shoppingMall.admin.stockAdjustments.at(connection, {
      id: stockAdjustment.id,
    });
  typia.assert(retrievedStockAdjustment);

  // 7. Verify that the retrieved stock adjustment details match the created stock adjustment
  TestValidator.equals(
    "stock adjustment id matches",
    retrievedStockAdjustment.id,
    stockAdjustment.id,
  );
  TestValidator.equals(
    "stock adjustment SKU id matches",
    retrievedStockAdjustment.shopping_mall_product_sku_id,
    stockAdjustment.shopping_mall_product_sku_id,
  );
  TestValidator.equals(
    "stock adjustment type matches",
    retrievedStockAdjustment.adjustment_type,
    stockAdjustment.adjustment_type,
  );
  TestValidator.equals(
    "stock adjustment quantity matches",
    retrievedStockAdjustment.quantity,
    stockAdjustment.quantity,
  );
  TestValidator.equals(
    "stock adjustment actor type matches",
    retrievedStockAdjustment.actor_type,
    stockAdjustment.actor_type,
  );
  TestValidator.equals(
    "stock adjustment actor id matches",
    retrievedStockAdjustment.actor_id,
    stockAdjustment.actor_id,
  );

  // 8. Confirm created_at timestamps exist and are ISO date strings
  TestValidator.predicate(
    "stock adjustment created_at is defined",
    typeof retrievedStockAdjustment.created_at === "string" &&
      retrievedStockAdjustment.created_at.length > 0,
  );
}
