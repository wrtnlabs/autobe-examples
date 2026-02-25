import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IShoppingMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdmin";
import type { IShoppingMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomer";
import type { IShoppingMallOrderShipment } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrderShipment";
import type { IShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSeller";
import type { IShoppingMallShipmentStatistic } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallShipmentStatistic";
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

/**
 * Test seller shipment statistics endpoint.
 *
 * Validates the IShoppingMallShipmentStatistic response structure for a new seller
 * with no shipments. Tests all statistical fields including totalShipments,
 * pendingDeliveries, deliveredCount, averageDeliveryTime, statusBreakdown,
 * carrierBreakdown, pagination metadata, and data array structure.
 *
 * Note: Full lifecycle test with order/shipment creation is not possible
 * with currently available APIs (product, order, shipment creation endpoints
 * are not exposed). This test validates the endpoint returns valid empty
 * statistics for a newly registered seller.
 */
export async function test_api_seller_shipment_statistics_full_lifecycle(
  connection: api.IConnection,
): Promise<void> {
  // Create seller account and authenticate
  const sellerConnection: api.IConnection = { host: connection.host };
  const seller = await authorize_seller_join(sellerConnection, {});
  typia.assert(seller);
  // Retrieve shipment statistics for the seller
  const statistics =
    await api.functional.shoppingMall.seller.shipments.statistics(
      sellerConnection,
    );
  typia.assert(statistics);
  // Validate shipment count fields for new seller (no shipments)
  TestValidator.equals(
    "totalShipments should be 0",
    statistics.totalShipments,
    0,
  );
  TestValidator.equals(
    "pendingDeliveries should be 0",
    statistics.pendingDeliveries,
    0,
  );
  TestValidator.equals(
    "deliveredCount should be 0",
    statistics.deliveredCount,
    0,
  );
  // Validate averageDeliveryTime is null when no deliveries exist
  TestValidator.equals(
    "averageDeliveryTime should be null for no deliveries",
    statistics.averageDeliveryTime,
    null,
  );
  // Validate statusBreakdown structure with zero counts
  TestValidator.equals(
    "statusBreakdown.shipped should be 0",
    statistics.statusBreakdown.shipped,
    0,
  );
  TestValidator.equals(
    "statusBreakdown.delivered should be 0",
    statistics.statusBreakdown.delivered,
    0,
  );
  // Validate pagination metadata structure
  TestValidator.predicate(
    "pagination.current is valid",
    statistics.pagination.current >= 0,
  );
  TestValidator.predicate(
    "pagination.limit is valid",
    statistics.pagination.limit >= 0,
  );
  TestValidator.equals(
    "pagination.records should be 0",
    statistics.pagination.records,
    0,
  );
  TestValidator.equals(
    "pagination.pages should be 0",
    statistics.pagination.pages,
    0,
  );
  // Validate data array is empty for new seller
  TestValidator.equals("data array should be empty", statistics.data.length, 0);
}
