import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIShoppingInventoryAlert } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingInventoryAlert";
import type { IShoppingAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingAdmin";
import type { IShoppingAttributeDimension } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingAttributeDimension";
import type { IShoppingAttributeValue } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingAttributeValue";
import type { IShoppingAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingAuthorizationToken";
import type { IShoppingCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingCategory";
import type { IShoppingInventoryAlert } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingInventoryAlert";
import type { IShoppingProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingProduct";
import type { IShoppingProductAttribute } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingProductAttribute";
import type { IShoppingProductImage } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingProductImage";
import type { IShoppingSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingSeller";
import type { IShoppingSku } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingSku";
import type { IShoppingSkuImage } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingSkuImage";
import type { IShoppingSkuVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingSkuVariant";
import type { IShoppingTag } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingTag";

/**
 * Test the complete admin inventory alert search and validation flow for a
 * single SKU.
 *
 * 1. Register new admin account (unique email, valid password, active status).
 * 2. Admin creates a test product (unique code).
 * 3. Admin registers a SKU for that product (unique SKU code, minimal attribute).
 * 4. Search inventory alerts for the SKU with different filters and pages.
 * 5. Validate alert structure, fields, pagination, and filtering correctness.
 */
export async function test_api_inventory_alert_search_admin_complete_flow(
  connection: api.IConnection,
) {
  // 1. Register admin
  const adminEmail = typia.random<string & tags.Format<"email">>();
  const admin: IShoppingAdmin.IAuthorized =
    await api.functional.auth.admin.join(connection, {
      body: {
        email: adminEmail,
        password: RandomGenerator.alphaNumeric(12),
        name: RandomGenerator.name(),
        role: "operator",
        status: "active",
      } satisfies IShoppingAdmin.IJoin,
    });
  typia.assert(admin);

  // 2. Create product
  const productCode = RandomGenerator.alphaNumeric(10);
  const product: IShoppingProduct =
    await api.functional.shopping.admin.products.create(connection, {
      body: {
        code: productCode,
        name: RandomGenerator.name(2),
        description: RandomGenerator.paragraph({ sentences: 8 }),
        main_image_uri:
          "https://cdn.example.com/" + RandomGenerator.alphaNumeric(8) + ".jpg",
        status: "active",
        business_status: "approved",
      } satisfies IShoppingProduct.ICreate,
    });
  typia.assert(product);

  // 3. Create SKU (use dummy variant attribute, as no attribute sys provided)
  const skuCode = RandomGenerator.alphaNumeric(12);
  // Typically, you'd select valid variant attribute value IDs from the system, but none given, so use placeholder
  const skuReq: IShoppingSku.ICreate = {
    sku_code: skuCode,
    price: 10000,
    is_active: true,
    barcode: RandomGenerator.alphaNumeric(8),
    status: "in_stock",
    variant_attribute_value_ids: [RandomGenerator.alphaNumeric(10)],
  };
  const sku: IShoppingSku =
    await api.functional.shopping.admin.products.skus.create(connection, {
      productCode: product.code,
      body: skuReq,
    });
  typia.assert(sku);

  // 4. Inventory alerts query - full set
  const allAlerts: IPageIShoppingInventoryAlert =
    await api.functional.shopping.admin.inventory.alerts.index(connection, {
      skuCode: sku.sku_code,
      body: {
        page: 1,
        limit: 100,
        sort_by: "triggered_at",
        sort_order: "desc",
      } satisfies IShoppingInventoryAlert.IRequest,
    });
  typia.assert(allAlerts);
  TestValidator.predicate(
    "alerts count is >= 0",
    typeof allAlerts.pagination.records === "number" &&
      allAlerts.pagination.records >= 0,
  );

  // 5. If any alerts, validate filtering by type and resolved state
  if (allAlerts.data.length > 0) {
    const alertTypes = [
      "low_stock",
      "out_of_stock",
      "anomaly",
      "manual",
    ] as const;
    for (const alertType of alertTypes) {
      const filtered: IPageIShoppingInventoryAlert =
        await api.functional.shopping.admin.inventory.alerts.index(connection, {
          skuCode: sku.sku_code,
          body: {
            alert_type: alertType,
            page: 1,
            limit: 10,
            sort_by: "triggered_at",
            sort_order: "desc",
          } satisfies IShoppingInventoryAlert.IRequest,
        });
      typia.assert(filtered);
      for (const alert of filtered.data) {
        TestValidator.equals(
          `alert_type matches filter (${alertType})`,
          alert.alert_type,
          alertType,
        );
      }
    }
    // Range filter: resolved true and false (both cases covered)
    for (const resolved of [true, false]) {
      const filtered: IPageIShoppingInventoryAlert =
        await api.functional.shopping.admin.inventory.alerts.index(connection, {
          skuCode: sku.sku_code,
          body: {
            resolved,
            page: 1,
            limit: 10,
            sort_by: "triggered_at",
            sort_order: "desc",
          } satisfies IShoppingInventoryAlert.IRequest,
        });
      typia.assert(filtered);
      for (const alert of filtered.data) {
        TestValidator.equals(
          `resolved matches filter`,
          alert.resolved,
          resolved,
        );
      }
    }
  }

  // 6. Pagination correctness (page 1 and page 2 compare)
  if (allAlerts.pagination.records > allAlerts.pagination.limit) {
    const page2: IPageIShoppingInventoryAlert =
      await api.functional.shopping.admin.inventory.alerts.index(connection, {
        skuCode: sku.sku_code,
        body: {
          page: 2,
          limit: allAlerts.pagination.limit,
          sort_by: "triggered_at",
          sort_order: "desc",
        } satisfies IShoppingInventoryAlert.IRequest,
      });
    typia.assert(page2);
    TestValidator.equals(
      "pagination records consistent",
      page2.pagination.records,
      allAlerts.pagination.records,
    );
    TestValidator.notEquals(
      "page 2 data differs from page 1",
      page2.data,
      allAlerts.data,
    );
  }

  // 7. Validate essential alert fields structure (type, ID, timestamps)
  for (const alert of allAlerts.data) {
    TestValidator.predicate(
      "alert id is uuid",
      typeof alert.id === "string" &&
        /^([0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12})$/i.test(
          alert.id,
        ),
    );
    TestValidator.predicate(
      "triggered_at is ISO date",
      typeof alert.triggered_at === "string" &&
        !isNaN(Date.parse(alert.triggered_at)),
    );
    TestValidator.predicate(
      "alert_type allowed",
      ["low_stock", "out_of_stock", "anomaly", "manual"].includes(
        alert.alert_type,
      ),
    );
    TestValidator.predicate(
      "resolved boolean",
      typeof alert.resolved === "boolean",
    );
    if (alert.resolved) {
      TestValidator.predicate(
        "resolved_at date if resolved",
        typeof alert.resolved_at === "string" &&
          !isNaN(Date.parse(alert.resolved_at!)),
      );
    }
  }
}
