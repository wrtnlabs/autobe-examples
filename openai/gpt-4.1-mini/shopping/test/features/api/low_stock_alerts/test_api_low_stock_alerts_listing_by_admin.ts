import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIShoppingMallLowStockAlert } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallLowStockAlert";
import type { IShoppingMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdmin";
import type { IShoppingMallLowStockAlert } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallLowStockAlert";
import type { IShoppingMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProduct";
import type { IShoppingMallProductApproval } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductApproval";
import type { IShoppingMallProductCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductCategory";
import type { IShoppingMallProductSku } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductSku";

/**
 * Test listing of low stock alerts by an admin user.
 *
 * This test covers: Admin user registration and login, product creation with
 * multiple SKUs, fetching low stock alerts filtered by SKU, pagination and
 * validation of returned alert data, and verifying unauthorized access
 * rejection.
 */
export async function test_api_low_stock_alerts_listing_by_admin(
  connection: api.IConnection,
) {
  // 1. Admin user joins
  const adminJoinParams = {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "P@ssw0rd123!",
      full_name: RandomGenerator.name(),
    } satisfies IShoppingMallAdmin.IJoin,
  };
  const admin: IShoppingMallAdmin.IAuthorized =
    await api.functional.auth.admin.join(connection, adminJoinParams);
  typia.assert(admin);

  // 2. Admin user login
  const adminLoginParams = {
    body: {
      email: admin.email,
      password: "P@ssw0rd123!",
      href: "https://example.com/admin/login",
      referrer: "https://example.com/",
    } satisfies IShoppingMallAdmin.ILogin,
  };
  const authorizedAdmin: IShoppingMallAdmin.IAuthorized =
    await api.functional.auth.admin.login(connection, adminLoginParams);
  typia.assert(authorizedAdmin);

  // 3. Create product
  const productCreateParams = {
    body: {
      code: `PRD-${RandomGenerator.alphaNumeric(8)}`,
      name: RandomGenerator.name(3),
      description: RandomGenerator.content({ paragraphs: 2 }),
      brand: RandomGenerator.name(1),
    } satisfies IShoppingMallProduct.ICreate,
  };
  const product: IShoppingMallProduct =
    await api.functional.shoppingMall.admin.products.create(
      connection,
      productCreateParams,
    );
  typia.assert(product);

  // 4. Create multiple SKUs
  const skuCount = 3;
  const skuIds: string[] = [];
  for (let i = 0; i < skuCount; i++) {
    const skuCreateParams = {
      productCode: product.code,
      body: {
        sku_code: `SKU-${RandomGenerator.alphaNumeric(5)}`,
        price: (typia.random<number & tags.Type<"uint32">>() % 9000) + 1000,
        attributes_json: JSON.stringify({
          color: RandomGenerator.pick([
            "red",
            "blue",
            "green",
            "black",
            "white",
          ] as const),
          size: RandomGenerator.pick(["S", "M", "L", "XL"] as const),
        }),
      } satisfies IShoppingMallProductSku.ICreate,
    };
    const sku: IShoppingMallProductSku =
      await api.functional.shoppingMall.admin.products.skus.createSku(
        connection,
        skuCreateParams,
      );
    typia.assert(sku);
    skuIds.push(sku.id);
  }

  // 5. Fetch low stock alerts filtered by first SKU id
  const lowStockAlertsRequest = {
    body: {
      page: 1,
      limit: 10,
      resolved: false,
      shopping_mall_product_sku_id: skuIds.length > 0 ? skuIds[0] : undefined,
    } satisfies IShoppingMallLowStockAlert.IRequest,
  };
  const alertsResponse: IPageIShoppingMallLowStockAlert.ISummary =
    await api.functional.shoppingMall.admin.lowStockAlerts.index(
      connection,
      lowStockAlertsRequest,
    );
  typia.assert(alertsResponse);

  // 6. Validate pagination structure
  TestValidator.predicate(
    "pagination current page >=1",
    alertsResponse.pagination.current >= 1,
  );
  TestValidator.predicate(
    "pagination limit >0",
    alertsResponse.pagination.limit > 0,
  );
  TestValidator.predicate(
    "pagination pages >=0",
    alertsResponse.pagination.pages >= 0,
  );

  // 7. Validate each alert
  for (const alert of alertsResponse.data) {
    TestValidator.predicate(
      "alert id is UUID",
      /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
        alert.id,
      ),
    );
    TestValidator.predicate(
      "alert SKU id is created SKU",
      skuIds.includes(alert.shopping_mall_product_sku_id),
    );
    TestValidator.predicate("alert is unresolved", alert.resolved === false);
    const alertedAtDate = new Date(alert.alerted_at);
    TestValidator.predicate(
      "alerted_at is ISO date",
      !isNaN(alertedAtDate.getTime()),
    );
  }

  // 8. Unauthorized access test
  const unauthConn: api.IConnection = { ...connection, headers: {} };
  await TestValidator.error("unauthorized cannot list alerts", async () => {
    await api.functional.shoppingMall.admin.lowStockAlerts.index(
      unauthConn,
      lowStockAlertsRequest,
    );
  });
}
