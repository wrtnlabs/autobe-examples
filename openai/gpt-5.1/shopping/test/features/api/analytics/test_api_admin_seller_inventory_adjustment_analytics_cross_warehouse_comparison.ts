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

export async function test_api_admin_seller_inventory_adjustment_analytics_cross_warehouse_comparison(
  connection: api.IConnection,
) {
  // 1. Create and authenticate an admin
  const adminEmail = typia.random<string & tags.Format<"email">>();
  const adminJoinBody = {
    email: adminEmail,
    password: "Admin!234" as string & tags.Format<"password">,
    ip: null,
    href: "https://admin.example.com/join" as string & tags.Format<"uri">,
    referrer: "https://admin.example.com/landing" as string &
      tags.Format<"uri">,
  } satisfies IShoppingMallAdminJoin.ICreate;

  const adminAuthorized: IShoppingMallAdmin.IAuthorized =
    await api.functional.auth.admin.join(connection, {
      body: adminJoinBody,
    });
  typia.assert(adminAuthorized);

  // Explicit login (also validates login flow and ensures token set)
  const adminLoginBody = {
    email: adminEmail,
    password: "Admin!234" as string & tags.Format<"password">,
    ip: null,
    href: "https://admin.example.com/login" as string & tags.Format<"uri">,
    referrer: "https://admin.example.com/landing" as string &
      tags.Format<"uri">,
  } satisfies IShoppingMallAdminLogin.ICreate;

  const adminLogin: IShoppingMallAdmin.IAuthorized =
    await api.functional.auth.admin.login(connection, {
      body: adminLoginBody,
    });
  typia.assert(adminLogin);

  // 2. Create and authenticate a seller
  const sellerEmail = typia.random<string & tags.Format<"email">>();
  const sellerJoinBody = {
    email: sellerEmail,
    password: "Seller!234" as string & tags.Format<"password">,
    ip: null,
    href: "https://seller.example.com/join" as string & tags.Format<"uri">,
    referrer: "https://seller.example.com/landing" as string &
      tags.Format<"uri">,
  } satisfies IShoppingMallSellerAuthJoin.IRequest;

  const sellerAuthorized: IShoppingMallSeller.IAuthorized =
    await api.functional.auth.seller.join(connection, {
      body: sellerJoinBody,
    });
  typia.assert(sellerAuthorized);

  // Ensure seller is logged in for seller-scoped operations
  const sellerLoginBody = {
    email: sellerEmail,
    password: "Seller!234",
    ip: null,
    href: "https://seller.example.com/login" as string & tags.Format<"uri">,
    referrer: "https://seller.example.com/landing" as string &
      tags.Format<"uri">,
  } satisfies IShoppingMallSellerAuthLogin.IRequest;

  const sellerLogin: IShoppingMallSeller.IAuthorized =
    await api.functional.auth.seller.login(connection, {
      body: sellerLoginBody,
    });
  typia.assert(sellerLogin);

  const sellerId = sellerLogin.id;

  // 3. Create one product for this seller
  const productBody = {
    code: `PROD-${RandomGenerator.alphaNumeric(8)}`,
    title: RandomGenerator.paragraph({ sentences: 3 }),
    summary: RandomGenerator.paragraph({ sentences: 5 }),
    description: RandomGenerator.content({ paragraphs: 2 }),
    brand: "AutoBE Test Brand",
    model_name: "Model-A",
    status: "active",
    primary_image_uri:
      "https://cdn.example.com/images/product-main.jpg" as string &
        tags.Format<"uri">,
    default_locale: "en-US",
  } satisfies IShoppingMallProduct.ICreate;

  const product: IShoppingMallProduct =
    await api.functional.shoppingMall.seller.products.create(connection, {
      body: productBody,
    });
  typia.assert(product);

  // 4. Create one SKU for that product
  const skuBody: IShoppingMallSku.ICreate = {
    code: `SKU-${RandomGenerator.alphaNumeric(8)}` as string &
      tags.MinLength<1> &
      tags.MaxLength<255>,
    barcode: null,
    status: "active" as string & tags.MinLength<1> & tags.MaxLength<64>,
    price: 100,
    original_price: null,
    inventory_quantity: 0 as number & tags.Type<"int32"> & tags.Minimum<0>,
    low_stock_threshold: null,
    shopping_mall_sku_inventory_state_id: typia.random<
      string & tags.Format<"uuid">
    >(),
    attribute_value_ids: [],
    external_ids: [],
  } satisfies IShoppingMallSku.ICreate;

  const sku: IShoppingMallSku =
    await api.functional.shoppingMall.seller.products.skus.create(connection, {
      productId: product.id,
      body: skuBody,
    });
  typia.assert(sku);

  // 5. Create two warehouses for the seller (WH_A and WH_B)
  const warehouseABody = {
    code: `WH-A-${RandomGenerator.alphaNumeric(4)}`,
    name: "Warehouse A",
    description: "Test warehouse A for analytics cross-warehouse comparison",
    is_default_origin: true,
    status: "active",
  } satisfies IShoppingMallSellerWarehouse.ICreate;

  const warehouseA: IShoppingMallSellerWarehouse =
    await api.functional.shoppingMall.seller.sellerWarehouses.create(
      connection,
      {
        body: warehouseABody,
      },
    );
  typia.assert(warehouseA);

  const warehouseBBody = {
    code: `WH-B-${RandomGenerator.alphaNumeric(4)}`,
    name: "Warehouse B",
    description: "Test warehouse B for analytics cross-warehouse comparison",
    is_default_origin: false,
    status: "active",
  } satisfies IShoppingMallSellerWarehouse.ICreate;

  const warehouseB: IShoppingMallSellerWarehouse =
    await api.functional.shoppingMall.seller.sellerWarehouses.create(
      connection,
      {
        body: warehouseBBody,
      },
    );
  typia.assert(warehouseB);

  // 6. Switch back to admin (ensure admin token is active for admin-only operations)
  const adminLoginAgain: IShoppingMallAdmin.IAuthorized =
    await api.functional.auth.admin.login(connection, {
      body: adminLoginBody,
    });
  typia.assert(adminLoginAgain);

  // 7. Create a single inventory adjustment reason (SHRINKAGE)
  const reasonBody = {
    code: `SHRINKAGE-${RandomGenerator.alphaNumeric(6)}`,
    name: "Shrinkage test reason",
    description:
      "Inventory shrinkage due to test scenario adjustments across warehouses.",
    direction: "decrease",
    is_system_managed: false,
  } satisfies IShoppingMallInventoryAdjustmentReason.ICreate;

  const reason: IShoppingMallInventoryAdjustmentReason =
    await api.functional.shoppingMall.admin.inventoryAdjustmentReasons.create(
      connection,
      {
        body: reasonBody,
      },
    );
  typia.assert(reason);

  // 8. Create inventory adjustments:
  //    - WH_A: negative deltas
  //    - WH_B: positive deltas
  const nowIso = new Date().toISOString();

  const adjustmentsForWarehouseA = await ArrayUtil.asyncRepeat(3, async () => {
    const body: IShoppingMallInventoryAdjustment.ICreate = {
      seller_id: sellerId,
      sku_id: sku.id,
      seller_warehouse_id: warehouseA.id,
      inventory_adjustment_reason_id: reason.id,
      direction: "decrease",
      quantity_delta: -5,
      reference_type: "test_case",
      reference_id: `WH_A_${RandomGenerator.alphaNumeric(6)}`,
      note: "Decrement for WH_A in analytics test",
      occurred_at: nowIso as string & tags.Format<"date-time">,
    };

    const adj: IShoppingMallInventoryAdjustment =
      await api.functional.shoppingMall.admin.inventoryAdjustments.create(
        connection,
        {
          body,
        },
      );
    typia.assert(adj);
    return adj;
  });

  const adjustmentsForWarehouseB = await ArrayUtil.asyncRepeat(2, async () => {
    const body: IShoppingMallInventoryAdjustment.ICreate = {
      seller_id: sellerId,
      sku_id: sku.id,
      seller_warehouse_id: warehouseB.id,
      inventory_adjustment_reason_id: reason.id,
      direction: "increase",
      quantity_delta: 7,
      reference_type: "test_case",
      reference_id: `WH_B_${RandomGenerator.alphaNumeric(6)}`,
      note: "Increment for WH_B in analytics test",
      occurred_at: nowIso as string & tags.Format<"date-time">,
    };

    const adj: IShoppingMallInventoryAdjustment =
      await api.functional.shoppingMall.admin.inventoryAdjustments.create(
        connection,
        {
          body,
        },
      );
    typia.assert(adj);
    return adj;
  });

  const expectedCountA = adjustmentsForWarehouseA.length;
  const expectedCountB = adjustmentsForWarehouseB.length;
  const expectedNetA = adjustmentsForWarehouseA.reduce(
    (sum, a) => sum + a.quantity_delta,
    0,
  );
  const expectedNetB = adjustmentsForWarehouseB.reduce(
    (sum, a) => sum + a.quantity_delta,
    0,
  );

  // Sanity check expectations
  TestValidator.predicate(
    "expected net quantity change for WH_A is negative",
    expectedNetA < 0,
  );
  TestValidator.predicate(
    "expected net quantity change for WH_B is positive",
    expectedNetB > 0,
  );

  // 9. Call analytics endpoint with filters on seller, SKU, and reason, grouped by warehouse
  const analyticsRequestBody: IShoppingMallInventoryAdjustment.IRequest = {
    date_range: {
      from: new Date(Date.now() - 60 * 60 * 1000).toISOString() as string &
        tags.Format<"date-time">,
      to: new Date(Date.now() + 60 * 60 * 1000).toISOString() as string &
        tags.Format<"date-time">,
    },
    seller_ids: [sellerId],
    sku_ids: [sku.id],
    seller_warehouse_ids: undefined,
    inventory_adjustment_reason_ids: [reason.id],
    directions: undefined,
    group_by: ["warehouse"],
    metrics: undefined,
    pagination: {
      page: 1 as number & tags.Type<"int32"> & tags.Minimum<1>,
      size: 50 as number & tags.Type<"int32"> & tags.Minimum<1>,
      cursor: undefined,
    },
    sorts: undefined,
  };

  const analyticsPage: IPageIShoppingMallInventoryAdjustment.ISummary =
    await api.functional.shoppingMall.admin.analytics.sellerInventoryAdjustments.index(
      connection,
      { body: analyticsRequestBody },
    );
  typia.assert(analyticsPage);

  // Basic pagination sanity
  TestValidator.predicate(
    "analytics page should contain at least one summary row",
    analyticsPage.data.length > 0,
  );
  TestValidator.predicate(
    "analytics page pagination.records should be positive",
    analyticsPage.pagination.records > 0,
  );

  // Find the summary record for our seller (there may be multiple sellers in other tests)
  const summaryForSeller = analyticsPage.data.find(
    (row) => row.seller.id === sellerId,
  );

  await TestValidator.predicate(
    "summary for target seller should exist",
    async () => {
      return summaryForSeller !== undefined;
    },
  );

  if (!summaryForSeller) return;

  // Validate distinctWarehouseCount is at least 2
  TestValidator.predicate(
    "distinctWarehouseCount should be at least 2 in this scenario",
    summaryForSeller.distinctWarehouseCount >= 2,
  );

  // Find warehouse analytics entries for WH_A and WH_B
  const whASummary = summaryForSeller.topWarehouses.find(
    (w) => w.warehouse.id === warehouseA.id,
  );
  const whBSummary = summaryForSeller.topWarehouses.find(
    (w) => w.warehouse.id === warehouseB.id,
  );

  await TestValidator.predicate(
    "warehouse A analytics summary should exist in topWarehouses",
    async () => whASummary !== undefined,
  );
  await TestValidator.predicate(
    "warehouse B analytics summary should exist in topWarehouses",
    async () => whBSummary !== undefined,
  );

  if (!whASummary || !whBSummary) return;

  // Assert adjustment counts
  TestValidator.equals(
    "WH_A adjustmentCount should match number of created events",
    whASummary.adjustmentCount,
    expectedCountA,
  );
  TestValidator.equals(
    "WH_B adjustmentCount should match number of created events",
    whBSummary.adjustmentCount,
    expectedCountB,
  );

  // Assert net quantity signs
  TestValidator.predicate(
    "WH_A netQuantityChange should be negative",
    whASummary.netQuantityChange < 0,
  );
  TestValidator.predicate(
    "WH_B netQuantityChange should be positive",
    whBSummary.netQuantityChange > 0,
  );
}
