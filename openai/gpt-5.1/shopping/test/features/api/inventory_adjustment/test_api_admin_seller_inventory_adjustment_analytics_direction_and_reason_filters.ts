import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAnalyticsDateRange } from "@ORGANIZATION/PROJECT-api/lib/structures/IAnalyticsDateRange";
import type { IAnalyticsPagination } from "@ORGANIZATION/PROJECT-api/lib/structures/IAnalyticsPagination";
import type { IAnalyticsSort } from "@ORGANIZATION/PROJECT-api/lib/structures/IAnalyticsSort";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIShoppingMallInventoryAdjustment } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallInventoryAdjustment";
import type { IShoppingMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdmin";
import type { IShoppingMallAdminJoin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdminJoin";
import type { IShoppingMallAdminLogin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdminLogin";
import type { IShoppingMallAnalyticsPeriod } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAnalyticsPeriod";
import type { IShoppingMallInventoryAdjustment } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallInventoryAdjustment";
import type { IShoppingMallInventoryAdjustmentReason } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallInventoryAdjustmentReason";
import type { IShoppingMallInventoryAdjustmentReasonAnalytics } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallInventoryAdjustmentReasonAnalytics";
import type { IShoppingMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProduct";
import type { IShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSeller";
import type { IShoppingMallSellerAuthJoin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSellerAuthJoin";
import type { IShoppingMallSellerAuthLogin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSellerAuthLogin";
import type { IShoppingMallSellerProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSellerProfile";
import type { IShoppingMallSellerWarehouse } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSellerWarehouse";
import type { IShoppingMallSku } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSku";
import type { IShoppingMallSkuExternalId } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSkuExternalId";
import type { IShoppingMallSkuInventoryAdjustmentAnalytics } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSkuInventoryAdjustmentAnalytics";
import type { IShoppingMallSkuInventoryState } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSkuInventoryState";
import type { IShoppingMallWarehouseInventoryAdjustmentAnalytics } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallWarehouseInventoryAdjustmentAnalytics";

/**
 * Validate direction and reason filters in seller inventory adjustment
 * analytics.
 *
 * Business flow:
 *
 * 1. Create a seller account and authenticate as that seller.
 * 2. Under that seller, create a product, a SKU, and a warehouse.
 * 3. Create an admin account and authenticate as admin.
 * 4. As admin, create two inventory adjustment reasons:
 *
 *    - DAMAGE with direction="decrease".
 *    - CORRECTION with direction="increase".
 * 5. As admin, create several inventory adjustments for the seller/sku/warehouse:
 *
 *    - Multiple DAMAGE adjustments with negative quantity_delta values.
 *    - Multiple CORRECTION adjustments with positive quantity_delta values.
 *    - All occurred_at timestamps inside a common date range window.
 * 6. Call the analytics endpoint with filters:
 *
 *    - Directions = ["decrease"],
 *    - Inventory_adjustment_reason_ids = [DAMAGE.id],
 *    - Group_by = ["reason"]. Assert that:
 *    - Analytics returns at least one row.
 *    - All returned summaries have non-positive netQuantityChange, matching focus on
 *         decrease events.
 * 7. Call again with:
 *
 *    - Directions = ["increase"],
 *    - Inventory_adjustment_reason_ids = [CORRECTION.id],
 *    - Group_by = ["reason"]. Assert that all summaries have non-negative
 *         netQuantityChange.
 * 8. Optionally call with only reason filter (no directions) using DAMAGE reason
 *    and confirm summaries for that reason are non-positive in
 *    netQuantityChange.
 */
export async function test_api_admin_seller_inventory_adjustment_analytics_direction_and_reason_filters(
  connection: api.IConnection,
) {
  // 1. Create a seller account (join)
  const sellerJoinBody = {
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphabets(12),
    ip: null,
    href: "https://seller.example.com/join",
    referrer: "https://seller.example.com/landing",
  } satisfies IShoppingMallSellerAuthJoin.IRequest;

  const sellerAuthorized = await api.functional.auth.seller.join(connection, {
    body: sellerJoinBody,
  });
  typia.assert<IShoppingMallSeller.IAuthorized>(sellerAuthorized);

  const sellerId = sellerAuthorized.id;

  // 2. As seller, create product
  const productBody = {
    code: RandomGenerator.alphaNumeric(8),
    title: RandomGenerator.paragraph({ sentences: 3 }),
    summary: RandomGenerator.paragraph({ sentences: 5 }),
    description: RandomGenerator.content({ paragraphs: 2 }),
    brand: null,
    model_name: null,
    status: "active",
    primary_image_uri: null,
    default_locale: "en-US",
  } satisfies IShoppingMallProduct.ICreate;

  const product = await api.functional.shoppingMall.seller.products.create(
    connection,
    {
      body: productBody,
    },
  );
  typia.assert<IShoppingMallProduct>(product);

  // 3. As seller, create warehouse
  const warehouseBody = {
    code: `WH-${RandomGenerator.alphaNumeric(6)}`,
    name: "Test Warehouse",
    description: RandomGenerator.paragraph({ sentences: 4 }),
    is_default_origin: true,
    status: "active",
  } satisfies IShoppingMallSellerWarehouse.ICreate;

  const warehouse =
    await api.functional.shoppingMall.seller.sellerWarehouses.create(
      connection,
      {
        body: warehouseBody,
      },
    );
  typia.assert<IShoppingMallSellerWarehouse>(warehouse);

  // 4. As seller, create SKU for the product
  const skuBody = {
    code: `SKU-${RandomGenerator.alphaNumeric(6)}`,
    barcode: null,
    status: "active",
    price: 100,
    original_price: null,
    inventory_quantity: 100,
    low_stock_threshold: null,
    shopping_mall_sku_inventory_state_id: typia.random<
      string & tags.Format<"uuid">
    >(),
    attribute_value_ids: [],
    external_ids: [],
  } satisfies IShoppingMallSku.ICreate;

  const sku = await api.functional.shoppingMall.seller.products.skus.create(
    connection,
    {
      productId: product.id,
      body: skuBody,
    },
  );
  typia.assert<IShoppingMallSku>(sku);

  // 5. Create admin and authenticate as admin
  const adminEmail = typia.random<string & tags.Format<"email">>();
  const adminPassword = RandomGenerator.alphabets(12);

  const adminJoinBody = {
    email: adminEmail,
    password: adminPassword,
    ip: null,
    href: "https://admin.example.com/join",
    referrer: "https://admin.example.com/landing",
  } satisfies IShoppingMallAdminJoin.ICreate;

  const adminAuthorized = await api.functional.auth.admin.join(connection, {
    body: adminJoinBody,
  });
  typia.assert<IShoppingMallAdmin.IAuthorized>(adminAuthorized);

  const adminLoginBody = {
    email: adminEmail,
    password: adminPassword,
    ip: null,
    href: "https://admin.example.com/login",
    referrer: "https://admin.example.com/landing",
  } satisfies IShoppingMallAdminLogin.ICreate;

  const adminLogin = await api.functional.auth.admin.login(connection, {
    body: adminLoginBody,
  });
  typia.assert<IShoppingMallAdmin.IAuthorized>(adminLogin);

  // 6. As admin, create DAMAGE and CORRECTION inventory adjustment reasons
  const damageReasonBody = {
    code: `DAMAGE-${RandomGenerator.alphaNumeric(6)}`,
    name: "Damage",
    description: "Stock damaged during handling",
    direction: "decrease",
    is_system_managed: false,
  } satisfies IShoppingMallInventoryAdjustmentReason.ICreate;

  const damageReason =
    await api.functional.shoppingMall.admin.inventoryAdjustmentReasons.create(
      connection,
      {
        body: damageReasonBody,
      },
    );
  typia.assert<IShoppingMallInventoryAdjustmentReason>(damageReason);

  const correctionReasonBody = {
    code: `CORRECTION-${RandomGenerator.alphaNumeric(6)}`,
    name: "Correction",
    description: "Manual stock correction",
    direction: "increase",
    is_system_managed: false,
  } satisfies IShoppingMallInventoryAdjustmentReason.ICreate;

  const correctionReason =
    await api.functional.shoppingMall.admin.inventoryAdjustmentReasons.create(
      connection,
      {
        body: correctionReasonBody,
      },
    );
  typia.assert<IShoppingMallInventoryAdjustmentReason>(correctionReason);

  // 7. Prepare a common date range for occurred_at
  const now = new Date();
  const fromDate = new Date(now.getTime() - 1000 * 60 * 60); // 1 hour ago
  const toDate = new Date(now.getTime() + 1000 * 60 * 60); // 1 hour later

  const occurredAt1 = fromDate.toISOString();
  const occurredAt2 = new Date(
    fromDate.getTime() + 1000 * 60 * 10,
  ).toISOString();
  const occurredAt3 = new Date(
    fromDate.getTime() + 1000 * 60 * 20,
  ).toISOString();

  // 8. Create DAMAGE (decrease) adjustments
  const damageDeltas = [-3, -2];

  for (const [index, delta] of damageDeltas.entries()) {
    const occurred_at = index === 0 ? occurredAt1 : occurredAt2;

    const body = {
      seller_id: sellerId,
      sku_id: sku.id,
      seller_warehouse_id: warehouse.id,
      inventory_adjustment_reason_id: damageReason.id,
      direction: "decrease",
      quantity_delta: delta,
      reference_type: "test_damage",
      reference_id: `D-${index}`,
      note: "Damage adjustment",
      occurred_at,
    } satisfies IShoppingMallInventoryAdjustment.ICreate;

    const created =
      await api.functional.shoppingMall.admin.inventoryAdjustments.create(
        connection,
        {
          body,
        },
      );
    typia.assert<IShoppingMallInventoryAdjustment>(created);
  }

  // 9. Create CORRECTION (increase) adjustments
  const correctionDeltas = [5, 7];

  for (const [index, delta] of correctionDeltas.entries()) {
    const occurred_at = index === 0 ? occurredAt2 : occurredAt3;

    const body = {
      seller_id: sellerId,
      sku_id: sku.id,
      seller_warehouse_id: warehouse.id,
      inventory_adjustment_reason_id: correctionReason.id,
      direction: "increase",
      quantity_delta: delta,
      reference_type: "test_correction",
      reference_id: `C-${index}`,
      note: "Correction adjustment",
      occurred_at,
    } satisfies IShoppingMallInventoryAdjustment.ICreate;

    const created =
      await api.functional.shoppingMall.admin.inventoryAdjustments.create(
        connection,
        {
          body,
        },
      );
    typia.assert<IShoppingMallInventoryAdjustment>(created);
  }

  // Helper to build date_range and pagination
  const dateRange: IAnalyticsDateRange = {
    from: fromDate.toISOString(),
    to: toDate.toISOString(),
  };

  const pagination: IAnalyticsPagination = {
    page: 1,
    size: 50,
    cursor: undefined,
  };

  const emptySorts: IAnalyticsSort[] = [];

  // 10. Query analytics filtered to DAMAGE + decrease
  const damageRequestBody = {
    date_range: dateRange,
    seller_ids: [sellerId],
    sku_ids: [sku.id],
    seller_warehouse_ids: [warehouse.id],
    inventory_adjustment_reason_ids: [damageReason.id],
    directions: ["decrease"],
    group_by: ["reason"],
    metrics: [],
    pagination,
    sorts: emptySorts,
  } satisfies IShoppingMallInventoryAdjustment.IRequest;

  const damageAnalyticsPage =
    await api.functional.shoppingMall.admin.analytics.sellerInventoryAdjustments.index(
      connection,
      {
        body: damageRequestBody,
      },
    );
  typia.assert<IPageIShoppingMallInventoryAdjustment.ISummary>(
    damageAnalyticsPage,
  );

  TestValidator.predicate(
    "damage analytics has at least one row",
    damageAnalyticsPage.data.length > 0,
  );

  for (const summary of damageAnalyticsPage.data) {
    typia.assert<IShoppingMallInventoryAdjustment.ISummary>(summary);
    TestValidator.predicate(
      "damage analytics summary netQuantityChange should be <= 0",
      summary.netQuantityChange <= 0,
    );
  }

  // 11. Query analytics filtered to CORRECTION + increase
  const correctionRequestBody = {
    date_range: dateRange,
    seller_ids: [sellerId],
    sku_ids: [sku.id],
    seller_warehouse_ids: [warehouse.id],
    inventory_adjustment_reason_ids: [correctionReason.id],
    directions: ["increase"],
    group_by: ["reason"],
    metrics: [],
    pagination,
    sorts: emptySorts,
  } satisfies IShoppingMallInventoryAdjustment.IRequest;

  const correctionAnalyticsPage =
    await api.functional.shoppingMall.admin.analytics.sellerInventoryAdjustments.index(
      connection,
      {
        body: correctionRequestBody,
      },
    );
  typia.assert<IPageIShoppingMallInventoryAdjustment.ISummary>(
    correctionAnalyticsPage,
  );

  TestValidator.predicate(
    "correction analytics has at least one row",
    correctionAnalyticsPage.data.length > 0,
  );

  for (const summary of correctionAnalyticsPage.data) {
    typia.assert<IShoppingMallInventoryAdjustment.ISummary>(summary);
    TestValidator.predicate(
      "correction analytics summary netQuantityChange should be >= 0",
      summary.netQuantityChange >= 0,
    );
  }

  // 12. Optional: reason-only filter for DAMAGE (no direction filter)
  const reasonOnlyRequestBody = {
    date_range: dateRange,
    seller_ids: [sellerId],
    sku_ids: [sku.id],
    seller_warehouse_ids: [warehouse.id],
    inventory_adjustment_reason_ids: [damageReason.id],
    directions: undefined,
    group_by: ["reason"],
    metrics: [],
    pagination,
    sorts: emptySorts,
  } satisfies IShoppingMallInventoryAdjustment.IRequest;

  const reasonOnlyAnalyticsPage =
    await api.functional.shoppingMall.admin.analytics.sellerInventoryAdjustments.index(
      connection,
      {
        body: reasonOnlyRequestBody,
      },
    );
  typia.assert<IPageIShoppingMallInventoryAdjustment.ISummary>(
    reasonOnlyAnalyticsPage,
  );

  TestValidator.predicate(
    "reason-only analytics has at least one row",
    reasonOnlyAnalyticsPage.data.length > 0,
  );

  for (const summary of reasonOnlyAnalyticsPage.data) {
    typia.assert<IShoppingMallInventoryAdjustment.ISummary>(summary);
    TestValidator.predicate(
      "reason-only damage analytics summary netQuantityChange should be <= 0",
      summary.netQuantityChange <= 0,
    );
  }
}
