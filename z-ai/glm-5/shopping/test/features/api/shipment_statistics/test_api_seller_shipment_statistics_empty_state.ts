import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IShoppingMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdmin";
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
import { authorize_seller_join } from "../../../authorize/authorize_seller_join";
import { authorize_seller_login } from "../../../authorize/authorize_seller_login";
import { authorize_seller_refresh } from "../../../authorize/authorize_seller_refresh";

export async function test_api_seller_shipment_statistics_empty_state(
  connection: api.IConnection,
): Promise<void> {
  // Step 1: Create an admin account for seller approval workflow
  const adminConnection: api.IConnection = { host: connection.host };
  const admin = await authorize_admin_join(adminConnection, {});
  typia.assert(admin);
  // Step 2: Create a seller account
  const sellerConnection: api.IConnection = { host: connection.host };
  const seller = await authorize_seller_join(sellerConnection, {});
  typia.assert(seller);
  // Step 3: Get shipment statistics for the newly created seller (empty state)
  const statistics =
    await api.functional.shoppingMall.seller.shipments.statistics(
      sellerConnection,
    );
  typia.assert(statistics);
  // Step 4: Validate empty state - all counts should be zero
  TestValidator.equals("total shipments", statistics.totalShipments, 0);
  TestValidator.equals("pending deliveries", statistics.pendingDeliveries, 0);
  TestValidator.equals("delivered count", statistics.deliveredCount, 0);
  TestValidator.equals(
    "average delivery time",
    statistics.averageDeliveryTime,
    null,
  );
  // Step 5: Validate status breakdown shows zeros
  TestValidator.equals(
    "shipped status count",
    statistics.statusBreakdown.shipped,
    0,
  );
  TestValidator.equals(
    "delivered status count",
    statistics.statusBreakdown.delivered,
    0,
  );
  // Step 6: Validate carrier breakdown is null for empty state
  TestValidator.equals("carrier breakdown", statistics.carrierBreakdown, null);
  // Step 7: Validate pagination metadata for empty state
  TestValidator.equals("pagination current", statistics.pagination.current, 1);
  TestValidator.equals("pagination records", statistics.pagination.records, 0);
  TestValidator.equals("pagination pages", statistics.pagination.pages, 0);
  // Step 8: Validate data array is empty
  TestValidator.equals("data array length", statistics.data.length, 0);
}
