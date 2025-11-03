import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIShoppingMallStockAdjustment } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallStockAdjustment";
import type { IShoppingMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdmin";
import type { IShoppingMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProduct";
import type { IShoppingMallProductApproval } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductApproval";
import type { IShoppingMallProductCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductCategory";
import type { IShoppingMallProductSku } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductSku";
import type { IShoppingMallStockAdjustment } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallStockAdjustment";
import type { IShoppingMallUserRole } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallUserRole";

export async function test_api_stock_adjustments_index_by_admin(
  connection: api.IConnection,
) {
  // 1. Admin user joins (signs up) and authenticates
  const adminJoinBody = {
    email: typia.random<string & tags.Format<"email">>(),
    password: "P@ssw0rd1234",
    full_name: typia.random<string>(),
  } satisfies IShoppingMallAdmin.IJoin;
  const admin: IShoppingMallAdmin.IAuthorized =
    await api.functional.auth.admin.join(connection, {
      body: adminJoinBody,
    });
  typia.assert(admin);

  // 2. Create user role for the admin user
  const roleCreationBody = {
    user_id: admin.id,
    role_name: "admin",
  } satisfies IShoppingMallUserRole.ICreate;
  const userRole: IShoppingMallUserRole =
    await api.functional.shoppingMall.admin.userRoles.create(connection, {
      body: roleCreationBody,
    });
  typia.assert(userRole);

  // 3. Create a product to have SKUs
  const productCreateBody = {
    code: `PRD-${RandomGenerator.alphaNumeric(6).toUpperCase()}`,
    name: RandomGenerator.name(3),
    description: RandomGenerator.paragraph({ sentences: 6 }),
    brand: "TestBrand",
  } satisfies IShoppingMallProduct.ICreate;
  const product: IShoppingMallProduct =
    await api.functional.shoppingMall.admin.products.create(connection, {
      body: productCreateBody,
    });
  typia.assert(product);

  // 4. Create SKUs linked to product
  const skuCreateBody1 = {
    sku_code: `${product.code}-SKU1`,
    price: typia.random<number & tags.Minimum<1>>(),
    attributes_json: JSON.stringify({ color: "red", size: "M" }),
  } satisfies IShoppingMallProductSku.ICreate;

  const skuCreateBody2 = {
    sku_code: `${product.code}-SKU2`,
    price: typia.random<number & tags.Minimum<1>>(),
    attributes_json: JSON.stringify({ color: "blue", size: "L" }),
  } satisfies IShoppingMallProductSku.ICreate;

  const sku1: IShoppingMallProductSku =
    await api.functional.shoppingMall.admin.products.skus.createSku(
      connection,
      {
        productCode: product.code,
        body: skuCreateBody1,
      },
    );
  typia.assert(sku1);

  const sku2: IShoppingMallProductSku =
    await api.functional.shoppingMall.admin.products.skus.createSku(
      connection,
      {
        productCode: product.code,
        body: skuCreateBody2,
      },
    );
  typia.assert(sku2);

  // 5. Query stock adjustments with pagination and filters
  // Use filtering by sku ID, actor type, adjustment type, sorting, pagination

  const stockAdjustmentRequest = {
    shopping_mall_product_sku_id: sku1.id,
    adjustment_type: RandomGenerator.pick([
      "addition",
      "subtraction",
      "reservation",
      "release",
    ] as const),
    actor_type: "admin",
    page: 1,
    limit: 10,
    sort_by: "created_at",
    sort_order: "desc",
  } satisfies IShoppingMallStockAdjustment.IRequest;

  const stockAdjustmentsPage: IPageIShoppingMallStockAdjustment.ISummary =
    await api.functional.shoppingMall.admin.stockAdjustments.index(connection, {
      body: stockAdjustmentRequest,
    });

  typia.assert(stockAdjustmentsPage);

  // 6. Validate response structure and content

  TestValidator.predicate(
    "pagination is set properly",
    stockAdjustmentsPage.pagination.current === 1 &&
      stockAdjustmentsPage.pagination.limit === 10,
  );

  TestValidator.predicate(
    "no more items than limit",
    stockAdjustmentsPage.data.length <= 10,
  );

  if (stockAdjustmentsPage.data.length > 0) {
    for (const item of stockAdjustmentsPage.data) {
      typia.assert(item);

      TestValidator.equals(
        "sku id matches filter",
        item.shopping_mall_product_sku_id,
        sku1.id,
      );

      TestValidator.predicate(
        "adjustment type is valid",
        ["addition", "subtraction", "reservation", "release"].includes(
          item.adjustment_type,
        ),
      );

      TestValidator.equals("actor type is admin", item.actor_type, "admin");

      typia.assert(item.productSku);
    }
  }
}
