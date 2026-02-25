import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIShoppingMallOrderShipmentAuditLog } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallOrderShipmentAuditLog";
import type { IShoppingMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdmin";
import type { IShoppingMallCartItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCartItem";
import type { IShoppingMallCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCategory";
import type { IShoppingMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomer";
import type { IShoppingMallOrder } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrder";
import type { IShoppingMallOrderAddress } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrderAddress";
import type { IShoppingMallOrderItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrderItem";
import type { IShoppingMallOrderItemVariantOption } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrderItemVariantOption";
import type { IShoppingMallOrderShipment } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrderShipment";
import type { IShoppingMallOrderShipmentAuditLog } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrderShipmentAuditLog";
import type { IShoppingMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProduct";
import type { IShoppingMallProductImage } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductImage";
import type { IShoppingMallProductInventoryHistory } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductInventoryHistory";
import type { IShoppingMallProductVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductVariant";
import type { IShoppingMallProductVariantOption } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductVariantOption";
import type { IShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSeller";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";
import { authorize_customer_join } from "../../../authorize/authorize_customer_join";
import { authorize_customer_login } from "../../../authorize/authorize_customer_login";
import { authorize_customer_refresh } from "../../../authorize/authorize_customer_refresh";
import { authorize_seller_join } from "../../../authorize/authorize_seller_join";
import { authorize_seller_login } from "../../../authorize/authorize_seller_login";
import { authorize_seller_refresh } from "../../../authorize/authorize_seller_refresh";
import { generate_random_shopping_mall_customer_cart_create } from "../../../generate/generate_random_shopping_mall_customer_cart_create";
import { generate_random_shopping_mall_customer_orders_create } from "../../../generate/generate_random_shopping_mall_customer_orders_create";
import { generate_random_shopping_mall_seller_products_create } from "../../../generate/generate_random_shopping_mall_seller_products_create";
import { generate_random_shopping_mall_seller_products_variants_create } from "../../../generate/generate_random_shopping_mall_seller_products_variants_create";
import { generate_random_shopping_mall_seller_sellers_me_shipments_create } from "../../../generate/generate_random_shopping_mall_seller_sellers_me_shipments_create";
import { generate_random_shopping_mall_seller_sellers_me_variants_inventory_add_add_inventory } from "../../../generate/generate_random_shopping_mall_seller_sellers_me_variants_inventory_add_add_inventory";
import { prepare_random_shopping_mall_cart_item } from "../../../prepare/prepare_random_shopping_mall_cart_item";
import { prepare_random_shopping_mall_order } from "../../../prepare/prepare_random_shopping_mall_order";
import { prepare_random_shopping_mall_order_shipment } from "../../../prepare/prepare_random_shopping_mall_order_shipment";
import { prepare_random_shopping_mall_product } from "../../../prepare/prepare_random_shopping_mall_product";
import { prepare_random_shopping_mall_product_inventory_history } from "../../../prepare/prepare_random_shopping_mall_product_inventory_history";
import { prepare_random_shopping_mall_product_variant } from "../../../prepare/prepare_random_shopping_mall_product_variant";
import { prepare_random_shopping_mall_product_variant_option } from "../../../prepare/prepare_random_shopping_mall_product_variant_option";

export async function test_api_shipment_audit_logs_filter_by_date_range(
  connection: api.IConnection,
): Promise<void> {
  // ===========================================
  // Setup: Create actors
  // ===========================================
  // Admin connection
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_admin_join(adminConnection, {});
  // Seller connection (pending status initially)
  const sellerConnection: api.IConnection = { host: connection.host };
  const sellerAuth = await authorize_seller_join(sellerConnection, {
    body: {
      shop_name: RandomGenerator.name(),
    },
  });
  // Admin approves the seller
  await api.functional.shoppingMall.admin.sellers.approve(adminConnection, {
    sellerId: sellerAuth.id,
  });
  // Customer connection
  const customerConnection: api.IConnection = { host: connection.host };
  await authorize_customer_join(customerConnection, {});
  // ===========================================
  // Setup: Create test data
  // ===========================================
  // Seller creates a product
  const product = await generate_random_shopping_mall_seller_products_create(
    sellerConnection,
    {},
  );
  typia.assert(product);
  // Seller adds a variant to the product
  const variant =
    await generate_random_shopping_mall_seller_products_variants_create(
      sellerConnection,
      {
        params: { productId: product.id },
      },
    );
  typia.assert(variant);
  // Seller adds inventory to the variant
  await generate_random_shopping_mall_seller_sellers_me_variants_inventory_add_add_inventory(
    sellerConnection,
    {
      params: { variantId: variant.id },
      body: {
        quantity: 100,
        reason: "Initial stock for test",
      },
    },
  );
  // Customer adds variant to cart
  await generate_random_shopping_mall_customer_cart_create(customerConnection, {
    body: {
      variantId: variant.id,
      quantity: 2,
    },
  });
  // Customer places an order
  const order = await generate_random_shopping_mall_customer_orders_create(
    customerConnection,
    {},
  );
  typia.assert(order);
  // Extract paid order item IDs for shipment
  const paidOrderItemIds = order.orderItems
    .filter((item) => item.status === "paid")
    .map((item) => item.id);
  // ===========================================
  // Create shipment (generates audit log entry)
  // ===========================================
  const shipment =
    await generate_random_shopping_mall_seller_sellers_me_shipments_create(
      sellerConnection,
      {
        body: {
          orderItemIds: paidOrderItemIds,
          carrierName: "FedEx",
          trackingNumber: RandomGenerator.alphaNumeric(12),
        },
      },
    );
  typia.assert(shipment);
  // ===========================================
  // Test: Retrieve all audit logs first
  // ===========================================
  const allLogs =
    await api.functional.shoppingMall.seller.shipments.audit_logs.index(
      sellerConnection,
      {
        shipmentId: shipment.id,
        body: {},
      },
    );
  typia.assert(allLogs);
  // Verify at least one audit log exists (shipment creation should create one)
  TestValidator.predicate("shipment has audit logs", allLogs.data.length > 0);
  const firstLogCreatedAt = new Date(allLogs.data[0].created_at);
  // ===========================================
  // Test 1: Filter by created_from only
  // ===========================================
  const oneHourAgo = new Date(firstLogCreatedAt.getTime() - 60 * 60 * 1000);
  const oneHourAgoStr = oneHourAgo.toISOString();
  const logsFromFilter =
    await api.functional.shoppingMall.seller.shipments.audit_logs.index(
      sellerConnection,
      {
        shipmentId: shipment.id,
        body: {
          created_from: oneHourAgoStr,
        },
      },
    );
  typia.assert(logsFromFilter);
  // All returned logs should have created_at >= oneHourAgo
  TestValidator.predicate(
    "created_from filter includes all logs",
    logsFromFilter.data.length === allLogs.data.length,
  );
  for (const log of logsFromFilter.data) {
    const logDate = new Date(log.created_at);
    TestValidator.predicate(
      `log created_at >= created_from: ${log.created_at}`,
      logDate >= oneHourAgo,
    );
  }
  // ===========================================
  // Test 2: Filter by created_to only
  // ===========================================
  const oneHourLater = new Date(firstLogCreatedAt.getTime() + 60 * 60 * 1000);
  const oneHourLaterStr = oneHourLater.toISOString();
  const logsToFilter =
    await api.functional.shoppingMall.seller.shipments.audit_logs.index(
      sellerConnection,
      {
        shipmentId: shipment.id,
        body: {
          created_to: oneHourLaterStr,
        },
      },
    );
  typia.assert(logsToFilter);
  // All returned logs should have created_at <= oneHourLater
  for (const log of logsToFilter.data) {
    const logDate = new Date(log.created_at);
    TestValidator.predicate(
      `log created_at <= created_to: ${log.created_at}`,
      logDate <= oneHourLater,
    );
  }
  // ===========================================
  // Test 3: Filter by both created_from and created_to (inclusive range)
  // ===========================================
  const rangeStart = new Date(firstLogCreatedAt.getTime() - 30 * 60 * 1000); // 30 min before
  const rangeEnd = new Date(firstLogCreatedAt.getTime() + 30 * 60 * 1000); // 30 min after
  const logsRangeFilter =
    await api.functional.shoppingMall.seller.shipments.audit_logs.index(
      sellerConnection,
      {
        shipmentId: shipment.id,
        body: {
          created_from: rangeStart.toISOString(),
          created_to: rangeEnd.toISOString(),
        },
      },
    );
  typia.assert(logsRangeFilter);
  // Verify all results are within the date range
  for (const log of logsRangeFilter.data) {
    const logDate = new Date(log.created_at);
    TestValidator.predicate(
      `log within date range: ${log.created_at}`,
      logDate >= rangeStart && logDate <= rangeEnd,
    );
  }
  // Verify pagination metadata is correct
  TestValidator.predicate(
    "pagination current page is 1",
    logsRangeFilter.pagination.current === 1,
  );
  TestValidator.predicate(
    "pagination limit is set",
    logsRangeFilter.pagination.limit > 0,
  );
  TestValidator.equals(
    "pagination records matches data length",
    logsRangeFilter.pagination.records,
    logsRangeFilter.data.length,
  );
  // ===========================================
  // Test 4: Date range that excludes all audit logs (future dates)
  // ===========================================
  const futureStart = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // 7 days in future
  const futureEnd = new Date(Date.now() + 14 * 24 * 60 * 60 * 1000); // 14 days in future
  const logsFutureFilter =
    await api.functional.shoppingMall.seller.shipments.audit_logs.index(
      sellerConnection,
      {
        shipmentId: shipment.id,
        body: {
          created_from: futureStart.toISOString(),
          created_to: futureEnd.toISOString(),
        },
      },
    );
  typia.assert(logsFutureFilter);
  // Should return empty data array
  TestValidator.equals(
    "future date range returns empty data",
    logsFutureFilter.data.length,
    0,
  );
  // Pagination should show 0 records but valid structure
  TestValidator.equals(
    "pagination records is 0",
    logsFutureFilter.pagination.records,
    0,
  );
  TestValidator.equals(
    "pagination pages is 0",
    logsFutureFilter.pagination.pages,
    0,
  );
  TestValidator.equals(
    "pagination current is 1",
    logsFutureFilter.pagination.current,
    1,
  );
}
