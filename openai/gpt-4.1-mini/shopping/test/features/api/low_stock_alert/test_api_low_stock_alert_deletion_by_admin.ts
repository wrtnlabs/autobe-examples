import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdmin";
import type { IShoppingMallLowStockAlert } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallLowStockAlert";
import type { IShoppingMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProduct";
import type { IShoppingMallProductApproval } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductApproval";
import type { IShoppingMallProductCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductCategory";
import type { IShoppingMallProductSku } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductSku";
import type { IShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSeller";
import type { IShoppingMallSellerProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSellerProfile";
import type { IShoppingMallSellerSession } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSellerSession";

export async function test_api_low_stock_alert_deletion_by_admin(
  connection: api.IConnection,
) {
  // 1. Register admin user
  const adminEmail = typia.random<string & tags.Format<"email">>();
  const admin: IShoppingMallAdmin.IAuthorized =
    await api.functional.auth.admin.join(connection, {
      body: {
        email: adminEmail,
        password: "AdminPass123!",
        full_name: RandomGenerator.name(2),
      } satisfies IShoppingMallAdmin.IJoin,
    });
  typia.assert(admin);

  // 2. Register seller user
  const sellerEmail = typia.random<string & tags.Format<"email">>();
  const seller: IShoppingMallSeller.IAuthorized =
    await api.functional.auth.seller.join(connection, {
      body: {
        email: sellerEmail,
        password: "SellerPass123!",
        store_name: RandomGenerator.name(1),
      } satisfies IShoppingMallSeller.ICreate,
    });
  typia.assert(seller);

  // 3. Switch to seller login
  await api.functional.auth.seller.login(connection, {
    body: {
      email: sellerEmail,
      password: "SellerPass123!",
      ip: null,
      href: "https://example.com/login",
      referrer: "https://example.com/",
    } satisfies IShoppingMallSeller.ILogin,
  });

  // 4. Seller creates product
  const productCreateBody = {
    code: `PRD-${RandomGenerator.alphaNumeric(8)}`,
    name: RandomGenerator.name(2),
    description: null,
    brand: null,
  } satisfies IShoppingMallProduct.ICreate;

  const product: IShoppingMallProduct =
    await api.functional.shoppingMall.seller.products.create(connection, {
      body: productCreateBody,
    });
  typia.assert(product);

  // 5. Seller creates SKU for product
  const skuCreateBody: IShoppingMallProductSku.ICreate = {
    sku_code: `SKU-${RandomGenerator.alphaNumeric(10)}`,
    price: 1000 + Math.floor(Math.random() * 9000),
    attributes_json: null,
  };

  const sku: IShoppingMallProductSku =
    await api.functional.shoppingMall.seller.products.skus.createSku(
      connection,
      {
        productCode: product.code,
        body: skuCreateBody,
      },
    );
  typia.assert(sku);

  // 6. Switch to admin login
  await api.functional.auth.admin.login(connection, {
    body: {
      email: adminEmail,
      password: "AdminPass123!",
      ip: null,
      href: "https://example.com/admin/login",
      referrer: "https://example.com/admin",
    } satisfies IShoppingMallAdmin.ILogin,
  });

  // 7. Create low stock alert for SKU
  const nowIso = new Date().toISOString();
  const alertCreateBody = {
    shopping_mall_product_sku_id: sku.id,
    alerted_at: nowIso,
    resolved: false,
    resolved_at: null,
  } satisfies IShoppingMallLowStockAlert.ICreate;

  const alert: IShoppingMallLowStockAlert =
    await api.functional.shoppingMall.admin.lowStockAlerts.create(connection, {
      body: alertCreateBody,
    });
  typia.assert(alert);

  // 8. Delete the low stock alert by admin
  await api.functional.shoppingMall.admin.lowStockAlerts.erase(connection, {
    id: alert.id,
  });

  // Since the erase returns void, all we can do is to assert no exceptions
  TestValidator.predicate(
    "low stock alert deletion succeeded without throwing",
    true,
  );
}
