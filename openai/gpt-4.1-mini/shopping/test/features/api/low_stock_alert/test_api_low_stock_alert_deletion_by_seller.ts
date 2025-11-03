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

export async function test_api_low_stock_alert_deletion_by_seller(
  connection: api.IConnection,
) {
  // 1. Seller Registration
  const sellerEmail: string & tags.Format<"email"> = typia.random<
    string & tags.Format<"email">
  >();
  const seller: IShoppingMallSeller.IAuthorized =
    await api.functional.auth.seller.join(connection, {
      body: {
        email: sellerEmail,
        password: "1234",
        store_name: RandomGenerator.name(2),
      } satisfies IShoppingMallSeller.ICreate,
    });
  typia.assert(seller);

  // 2. Admin Registration
  const adminEmail: string & tags.Format<"email"> = typia.random<
    string & tags.Format<"email">
  >();
  const admin: IShoppingMallAdmin.IAuthorized =
    await api.functional.auth.admin.join(connection, {
      body: {
        email: adminEmail,
        password: "1234",
        full_name: RandomGenerator.name(2),
      } satisfies IShoppingMallAdmin.IJoin,
    });
  typia.assert(admin);

  // 3. Seller Login (re-authenticate seller with issued token)
  await api.functional.auth.seller.login(connection, {
    body: {
      email: sellerEmail,
      password: "1234",
      ip: null,
      href: "https://example-store.com/login",
      referrer: "https://example.com/home",
    } satisfies IShoppingMallSeller.ILogin,
  });

  // 4. Admin Login (re-authenticate admin with issued token)
  await api.functional.auth.admin.login(connection, {
    body: {
      email: adminEmail,
      password: "1234",
      ip: null,
      href: "https://example-admin.com/login",
      referrer: "https://example.com/admin",
    } satisfies IShoppingMallAdmin.ILogin,
  });

  // 5. Create Product as Seller
  const productCode = RandomGenerator.alphaNumeric(10);
  const product: IShoppingMallProduct =
    await api.functional.shoppingMall.seller.products.create(connection, {
      body: {
        code: productCode,
        name: RandomGenerator.paragraph({
          sentences: 3,
          wordMin: 5,
          wordMax: 10,
        }),
        description: RandomGenerator.content({
          paragraphs: 1,
          sentenceMin: 5,
          sentenceMax: 8,
          wordMin: 5,
          wordMax: 10,
        }),
        brand: RandomGenerator.name(1),
      } satisfies IShoppingMallProduct.ICreate,
    });
  typia.assert(product);

  // 6. Create SKU for the product
  // Price between 100 and 5000
  const skuPrice = Math.floor(100 + Math.random() * (5000 - 100 + 1));
  const skuCode = RandomGenerator.alphaNumeric(15);
  const sku: IShoppingMallProductSku =
    await api.functional.shoppingMall.seller.products.skus.createSku(
      connection,
      {
        productCode: productCode,
        body: {
          sku_code: skuCode,
          price: skuPrice,
          attributes_json: JSON.stringify({ color: "red", size: "M" }),
        } satisfies IShoppingMallProductSku.ICreate,
      },
    );
  typia.assert(sku);

  // 7. Create Low Stock Alert as Admin for SKU
  const alertCreatedAt = new Date().toISOString();
  const alert: IShoppingMallLowStockAlert =
    await api.functional.shoppingMall.admin.lowStockAlerts.create(connection, {
      body: {
        shopping_mall_product_sku_id: sku.id,
        alerted_at: alertCreatedAt,
        resolved: false,
        resolved_at: null,
      } satisfies IShoppingMallLowStockAlert.ICreate,
    });
  typia.assert(alert);

  // 8. Seller Deletes the Low Stock Alert
  await api.functional.shoppingMall.seller.lowStockAlerts.erase(connection, {
    id: alert.id,
  });

  // No API to re-fetch the alert, so attempt to re-delete to confirm deletion
  await TestValidator.error("deletion should be permanent", async () => {
    await api.functional.shoppingMall.seller.lowStockAlerts.erase(connection, {
      id: alert.id,
    });
  });

  // Additionally, test unauthorized user (different seller) cannot delete alert
  // For this, we register another seller
  const otherSellerEmail = typia.random<string & tags.Format<"email">>();
  await api.functional.auth.seller.join(connection, {
    body: {
      email: otherSellerEmail,
      password: "1234",
      store_name: RandomGenerator.name(2),
    } satisfies IShoppingMallSeller.ICreate,
  });

  // Re-authenticate as the other seller
  await api.functional.auth.seller.login(connection, {
    body: {
      email: otherSellerEmail,
      password: "1234",
      ip: null,
      href: "https://example-store.com/login",
      referrer: "https://example.com/home",
    } satisfies IShoppingMallSeller.ILogin,
  });

  // The other seller tries to delete the alert, expect error
  await TestValidator.error("unauthorized deletion attempt", async () => {
    await api.functional.shoppingMall.seller.lowStockAlerts.erase(connection, {
      id: alert.id,
    });
  });
}
