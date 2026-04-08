import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEcommerceMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallAdmin";
import type { IEcommerceMallShipmentMetric } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallShipmentMetric";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";

/**
 * Test fulfillment metrics retrieval on a fresh platform with no orders.
 *
 * Validates that when the platform has no orders, shipments, or order items,
 * the admin fulfillment metrics endpoint returns appropriate zero and null values
 * across all metric categories. This test ensures proper handling of empty state
 * scenarios in the fulfillment analytics system.
 *
 * 1. Administrator authenticates with fresh account (no existing platform data).
 * 2. Admin calls GET /ecommerceMall/admin/admin/fulfillment/metrics.
 * 3. Validates all order statistics return zero counts.
 * 4. Validates all order item statistics return zero counts with null average.
 * 5. Validates all shipment statistics return zero counts with null average.
 * 6. Validates all fulfillment performance metrics return null.
 */
export async function test_api_fulfillment_metrics_empty_platform_state(
  connection: api.IConnection,
): Promise<void> {
  // 1. Authenticate as admin with fresh account
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_admin_join(adminConnection, {});
  // 2. Call fulfillment metrics endpoint
  const metrics =
    await api.functional.ecommerceMall.admin.admin.fulfillment.metrics(
      adminConnection,
    );
  typia.assert(metrics);
  // 3. Validate order statistics - all counts should be zero
  TestValidator.equals(
    "totalOrders is 0",
    metrics.orderStatistics.totalOrders,
    0,
  );
  TestValidator.equals(
    "paidOrders is 0",
    metrics.orderStatistics.paidOrders,
    0,
  );
  TestValidator.equals(
    "shippedOrders is 0",
    metrics.orderStatistics.shippedOrders,
    0,
  );
  TestValidator.equals(
    "deliveredOrders is 0",
    metrics.orderStatistics.deliveredOrders,
    0,
  );
  TestValidator.equals(
    "cancelledOrders is 0",
    metrics.orderStatistics.cancelledOrders,
    0,
  );
  TestValidator.equals(
    "refundedOrders is 0",
    metrics.orderStatistics.refundedOrders,
    0,
  );
  TestValidator.equals(
    "partiallyCompletedOrders is 0",
    metrics.orderStatistics.partiallyCompletedOrders,
    0,
  );
  // 4. Validate order item statistics - all counts should be zero, average should be null
  TestValidator.equals(
    "totalItems is 0",
    metrics.orderItemStatistics.totalItems,
    0,
  );
  TestValidator.equals(
    "paidItems is 0",
    metrics.orderItemStatistics.paidItems,
    0,
  );
  TestValidator.equals(
    "shippedItems is 0",
    metrics.orderItemStatistics.shippedItems,
    0,
  );
  TestValidator.equals(
    "deliveredItems is 0",
    metrics.orderItemStatistics.deliveredItems,
    0,
  );
  TestValidator.equals(
    "cancelledItems is 0",
    metrics.orderItemStatistics.cancelledItems,
    0,
  );
  TestValidator.equals(
    "refundedItems is 0",
    metrics.orderItemStatistics.refundedItems,
    0,
  );
  TestValidator.equals(
    "averageQuantityPerItem is null",
    metrics.orderItemStatistics.averageQuantityPerItem,
    null,
  );
  // 5. Validate shipment statistics - all counts should be zero, average should be null
  TestValidator.equals(
    "totalShipments is 0",
    metrics.shipmentStatistics.totalShipments,
    0,
  );
  TestValidator.equals(
    "totalItemsShipped is 0",
    metrics.shipmentStatistics.totalItemsShipped,
    0,
  );
  TestValidator.equals(
    "averageItemsPerShipment is null",
    metrics.shipmentStatistics.averageItemsPerShipment,
    null,
  );
  // 6. Validate fulfillment performance - all values should be null
  TestValidator.equals(
    "averageFulfillmentTimeSeconds is null",
    metrics.fulfillmentPerformance.averageFulfillmentTimeSeconds,
    null,
  );
  TestValidator.equals(
    "deliveryCompletionRate is null",
    metrics.fulfillmentPerformance.deliveryCompletionRate,
    null,
  );
  TestValidator.equals(
    "cancellationRate is null",
    metrics.fulfillmentPerformance.cancellationRate,
    null,
  );
}
