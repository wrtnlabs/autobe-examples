import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEcommerceMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSeller";
import type { IEcommerceMallShipmentMetric } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallShipmentMetric";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_seller_join } from "../../../authorize/authorize_seller_join";
import { authorize_seller_login } from "../../../authorize/authorize_seller_login";
import { authorize_seller_refresh } from "../../../authorize/authorize_seller_refresh";

export async function test_api_seller_shipments_metrics_view(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create seller account
  const sellerConnection: api.IConnection = { host: connection.host };
  const sellerJoin = await authorize_seller_join(sellerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      display_name: RandomGenerator.name(2),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    },
  });
  typia.assert(sellerJoin);
  // 2. Create connection with seller token
  const authenticatedSellerConnection: api.IConnection = {
    host: connection.host,
  };
  authenticatedSellerConnection.headers = {
    Authorization: sellerJoin.token.access,
  };
  // 3. Fetch shipment metrics for seller with no shipments
  const metrics = await api.functional.ecommerceMall.seller.shipments.metrics(
    authenticatedSellerConnection,
  );
  typia.assert(metrics);
  // 4. Validate edge case: no shipments results in zero metrics
  TestValidator.equals(
    "total_shipments is zero when no shipments",
    metrics.total_shipments,
    0,
  );
  TestValidator.equals(
    "status distribution shipped is zero",
    metrics.status_distribution.shipped,
    0,
  );
  TestValidator.equals(
    "status distribution delivered is zero",
    metrics.status_distribution.delivered,
    0,
  );
  TestValidator.equals(
    "total_items_shipped is zero",
    metrics.total_items_shipped,
    0,
  );
  TestValidator.equals(
    "delivery_rate is zero when no shipments",
    metrics.delivery_rate,
    0,
  );
  TestValidator.equals(
    "average_delivery_duration_days is null when no delivered shipments",
    metrics.average_delivery_duration_days,
    null,
  );
  TestValidator.equals(
    "average_processing_time_days is null when no shipments",
    metrics.average_processing_time_days,
    null,
  );
}
