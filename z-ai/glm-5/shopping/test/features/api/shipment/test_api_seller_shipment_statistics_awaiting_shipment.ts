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

export async function test_api_seller_shipment_statistics_awaiting_shipment(
  connection: api.IConnection,
): Promise<void> {
  // Create seller connection
  const sellerConnection: api.IConnection = { host: connection.host };
  // Register seller account - this returns authentication token
  const sellerAuth = await authorize_seller_join(sellerConnection, {});
  typia.assert(sellerAuth);
  // Get shipment statistics for the seller
  const statistics =
    await api.functional.shoppingMall.seller.shipments.statistics(
      sellerConnection,
    );
  typia.assert(statistics);
  // For a new seller with no orders/shipments, all counts should be zero
  TestValidator.equals("totalShipments is zero", statistics.totalShipments, 0);
  TestValidator.equals(
    "pendingDeliveries is zero",
    statistics.pendingDeliveries,
    0,
  );
  TestValidator.equals("deliveredCount is zero", statistics.deliveredCount, 0);
  TestValidator.equals(
    "averageDeliveryTime is null",
    statistics.averageDeliveryTime,
    null,
  );
  TestValidator.equals(
    "statusBreakdown shipped is zero",
    statistics.statusBreakdown.shipped,
    0,
  );
  TestValidator.equals(
    "statusBreakdown delivered is zero",
    statistics.statusBreakdown.delivered,
    0,
  );
  TestValidator.equals("data array is empty", statistics.data.length, 0);
  TestValidator.equals(
    "pagination records is zero",
    statistics.pagination.records,
    0,
  );
}
